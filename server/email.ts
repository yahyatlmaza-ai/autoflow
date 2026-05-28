/**
 * server/email.ts — Email service via Resend
 * Handles OTP, order notifications, password reset, weekly reports
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const FROM   = `${process.env.RESEND_FROM_NAME || 'autoflow'} <${process.env.RESEND_FROM_EMAIL || 'noreply@autoflow.dz'}>`;

// ── OTP Email ─────────────────────────────────────────────────────────────────
export async function sendOTPEmail(email: string, otp: string, name?: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM, to: email,
      subject: `${otp} — رمز التحقق الخاص بك | autoflow`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#06060f;color:#e8e4ff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-.02em;color:#fff">autoflow</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">منصة اللوجستيك الجزائرية #1</p>
          </div>
          <div style="padding:36px;">
            <p style="font-size:16px;margin:0 0 24px">مرحباً ${name || ''}،</p>
            <p style="color:rgba(232,228,255,.7);margin:0 0 28px;line-height:1.7;">استخدم رمز التحقق أدناه لإتمام إنشاء حسابك. الرمز صالح لمدة 5 دقائق فقط.</p>
            <div style="background:rgba(124,58,237,.12);border:2px dashed rgba(124,58,237,.4);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <div style="font-size:42px;font-weight:800;letter-spacing:.2em;color:#a855f7">${otp}</div>
              <div style="font-size:12px;color:rgba(232,228,255,.4);margin-top:8px">صالح لمدة 5 دقائق</div>
            </div>
            <p style="color:rgba(232,228,255,.4);font-size:13px;line-height:1.6;border-top:1px solid rgba(255,255,255,.06);padding-top:20px;margin:0;">
              إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذا البريد بأمان.<br/>
              لا تشارك هذا الرمز مع أي شخص.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] sendOTPEmail failed:', err);
    return false;
  }
}

// ── Order Status Notification ─────────────────────────────────────────────────
export async function sendOrderStatusEmail(
  email: string,
  name: string,
  orderNumber: string,
  status: string,
  carrier?: string,
  trackingNumber?: string
): Promise<boolean> {
  const statusLabels: Record<string, { label: string; color: string; icon: string; message: string }> = {
    confirmed:  { label: 'تم التأكيد',    color: '#3b82f6', icon: '✅', message: 'تم تأكيد طلبك وهو الآن قيد المعالجة.' },
    shipped:    { label: 'تم الشحن',      color: '#8b5cf6', icon: '🚚', message: 'طلبك في الطريق إليك.' },
    delivered:  { label: 'تم التوصيل',   color: '#22c55e', icon: '📦', message: 'تم توصيل طلبك بنجاح. شكراً لك!' },
    cancelled:  { label: 'تم الإلغاء',   color: '#ef4444', icon: '❌', message: 'تم إلغاء طلبك. للاستفسار تواصل معنا.' },
    returned:   { label: 'تم الإرجاع',   color: '#f97316', icon: '↩️', message: 'تم استلام طلبك المُرجَع.' },
  };
  const info = statusLabels[status];
  if (!info) return false;

  try {
    await resend.emails.send({
      from: FROM, to: email,
      subject: `${info.icon} ${info.label} — طلب ${orderNumber} | autoflow`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#06060f;color:#e8e4ff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff">autoflow</h1>
          </div>
          <div style="padding:36px;">
            <div style="background:rgba(${status === 'delivered' ? '34,197,94' : '124,58,237'},.08);border-right:4px solid ${info.color};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:28px;margin-bottom:8px">${info.icon}</div>
              <div style="font-size:20px;font-weight:700;color:${info.color}">${info.label}</div>
              <div style="color:rgba(232,228,255,.6);font-size:14px;margin-top:4px">${info.message}</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(232,228,255,.5);">رقم الطلب</td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;font-weight:600;">${orderNumber}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);color:rgba(232,228,255,.5);">الناقل</td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;">${carrier || 'غير محدد'}</td></tr>
              ${trackingNumber ? `<tr><td style="padding:10px 0;color:rgba(232,228,255,.5);">رقم التتبع</td><td style="padding:10px 0;text-align:left;font-family:monospace;color:#a855f7;">${trackingNumber}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] sendOrderStatusEmail failed:', err);
    return false;
  }
}

// ── Password Reset Email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM, to: email,
      subject: '🔐 إعادة تعيين كلمة المرور | autoflow',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#06060f;color:#e8e4ff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff">autoflow</h1>
          </div>
          <div style="padding:36px;">
            <h2 style="margin:0 0 16px;font-size:20px;">إعادة تعيين كلمة المرور</h2>
            <p style="color:rgba(232,228,255,.6);margin:0 0 28px;line-height:1.7;">طلبت إعادة تعيين كلمة مرور حسابك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.</p>
            <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">إعادة تعيين كلمة المرور</a>
            <p style="color:rgba(232,228,255,.3);font-size:12px;margin-top:28px;border-top:1px solid rgba(255,255,255,.06);padding-top:20px;">إذا لم تطلب هذا، يمكنك تجاهل الرسالة بأمان.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] sendPasswordResetEmail failed:', err);
    return false;
  }
}
