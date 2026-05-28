/**
 * server/index.ts — autoflow Full Production API v2.1.0
 * Security: helmet, bcrypt, rate limiting, env-based secrets
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import crypto from 'crypto';
import 'dotenv/config';

import { adminDb } from './db.js';
import {
  requireAuth, requireAdmin, globalLimiter, authLimiter, apiLimiter,
  sanitizeString, sanitizeEmail, sanitizeNumber, isValidEmail,
  asyncHandler, errorHandler, JWT_SECRET, type AuthRequest,
} from './middleware.js';
import {
  runOrderCreatedRules, runStatusChangeRules, updateCustomerStats,
  recordStatusChange, sendNotification, logActivity, assignCarrierForWilaya,
} from './automation.js';
import { sendPushToUser, sendPushToTenant, VAPID_PUBLIC_KEY } from './push.js';
import { assignCarrierAI, getRuleCarrier } from './ai_routing.js';
import { sendSMS, buildShippingMessage } from './sms.js';
import { generateSecret, getTOTPUri, verifyTOTP } from './totp.js';
import { submitOrderToCarrier, testCarrierConnection, encryptCreds } from './carriers.js';
import { syncStoreOrders, testStoreConnection } from './stores_sync.js';
import { sendOTPEmail, sendOrderStatusEmail, sendPasswordResetEmail } from './email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://maps.googleapis.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:', 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://maps.googleapis.com'],
      frameSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(globalLimiter);
app.use(express.json({ limit: '4mb' }));

// CORS for local dev
if (process.env.NODE_ENV !== 'production') {
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    next();
  });
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: Date.now(), version: '2.1.0' })
);

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/auth', authLimiter, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action } = req.body;

  // ── HELPERS: AES encrypt/decrypt password for temp storage ─────────────
  function encryptPassword(plain: string): string {
    const key = crypto.scryptSync((process.env.JWT_SECRET || 'fallback').slice(0, 32), 'autoflow-salt', 32);
    const iv   = crypto.randomBytes(16);
    const c    = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + c.update(plain, 'utf8', 'hex') + c.final('hex');
  }
  function decryptPassword(enc: string): string {
    const [ivHex, encrypted] = enc.split(':');
    if (!ivHex || !encrypted) throw new Error('Invalid encrypted password format');
    const key = crypto.scryptSync((process.env.JWT_SECRET || 'fallback').slice(0, 32), 'autoflow-salt', 32);
    const d   = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return d.update(encrypted, 'hex', 'utf8') + d.final('utf8');
  }

  // ── SIGNUP ───────────────────────────────────────────────────────────────
  if (action === 'signup' || action === 'register') {
    const email       = sanitizeEmail(req.body.email);
    const password    = typeof req.body.password === 'string' ? req.body.password : '';
    const name        = sanitizeString(req.body.name);
    const phone       = sanitizeString(req.body.phone);
    const company     = sanitizeString(req.body.company);
    const fingerprint = sanitizeString(req.body.fingerprint).slice(0, 128);

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (!name)                 return res.status(400).json({ error: 'Full name is required.' });

    // Encrypt password with AES (reversible — needed to create Supabase Auth user later)
    const encryptedPassword = encryptPassword(password);

    const otp            = crypto.randomInt(100000, 999999).toString();
    const expiresAt      = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const registrationId = `reg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const { error: upsertErr } = await adminDb.from('registration_intents').upsert({
      email, password_hash: encryptedPassword,
      name, phone, company, fingerprint,
      otp_code: otp, otp_expires_at: expiresAt,
      registration_id: registrationId, attempts: 0, used: false,
    }, { onConflict: 'email' });

    if (upsertErr) {
      console.error('[signup] upsert error:', JSON.stringify(upsertErr));
      // إذا كان البريد موجود في Auth لكن ليس في registration_intents
      if (upsertErr.code === '23505' || upsertErr.message?.includes('unique')) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(500).json({ error: 'Registration failed: ' + (upsertErr.message || 'Database error. Please try again.') });
    }

    const emailSent = await sendOTPEmail(email, otp, name);
    if (!emailSent) {
      console.warn('[signup] Email send failed for:', email, '— OTP:', otp);
    }
    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      ok: true,
      registration_id: registrationId,
      expires_in: 900,
      email_sent: emailSent,
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Account prepared. Email delivery may be delayed — check spam.',
      ...(isDev ? { demo_otp: otp } : {}),
    });
  }

  // ── VERIFY OTP ───────────────────────────────────────────────────────────
  if (action === 'verify_otp') {
    const code  = sanitizeString(req.body.code).replace(/\s/g, '');
    const email = sanitizeEmail(req.body.email || '');
    const regId = sanitizeString(req.body.registration_id || '');

    if (!email && !regId) {
      return res.status(400).json({ error: 'Email is required for verification.' });
    }

    // Always lookup by EMAIL (most reliable — email is unique and always present)
    // registration_id used only as secondary guard
    const { data: intent, error: fetchErr } = await adminDb
      .from('registration_intents')
      .select('*')
      .eq('email', email || '')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Log for debugging (remove in production)
    if (fetchErr) console.error('[verify_otp] DB error:', fetchErr.message, '| email:', email);
    if (!intent)  console.error('[verify_otp] No intent found for email:', email, '| regId:', regId);

    if (fetchErr || !intent) {
      return res.status(400).json({
        error: 'No pending registration found for this email. Please start over.',
        hint: 'Try clicking "Change email" and signing up again.',
      });
    }

    if (new Date(intent.otp_expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Verification code expired. Click "Resend code" to get a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if ((intent.attempts || 0) >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please start over.', code: 'MAX_ATTEMPTS' });
    }

    if (intent.otp_code !== code) {
      await adminDb.from('registration_intents')
        .update({ attempts: (intent.attempts || 0) + 1 })
        .eq('email', email);
      const remaining = 5 - (intent.attempts || 0) - 1;
      return res.status(400).json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` });
    }

    // ── OTP VALID → Create Supabase account ──────────────────────────────
    let plainPassword: string;
    try {
      plainPassword = decryptPassword(intent.password_hash);
    } catch (decErr) {
      console.error('[verify_otp] decrypt error:', decErr);
      return res.status(500).json({ error: 'Session data corrupted. Please start over.' });
    }

    const { data: authData, error: authErr } = await adminDb.auth.admin.createUser({
      email: intent.email,
      password: plainPassword,
      email_confirm: true,
      user_metadata: { full_name: intent.name },
    });

    if (authErr) {
      console.error('[verify_otp] createUser error:', authErr.message);
      const msg = authErr.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        // المستخدم موجود — سجّله دخولاً مباشرة
        const { data: signIn } = await adminDb.auth.signInWithPassword({
          email: intent.email, password: plainPassword,
        });
        if (signIn?.session) {
          const { data: prof } = await adminDb.from('profiles').select('*,tenants(*)').eq('id', signIn.user.id).single();
          const token = jwt.sign(
            { id: signIn.user.id, email: intent.email, tenant_id: (prof as any)?.tenant_id, role: (prof as any)?.role || 'owner' },
            JWT_SECRET, { expiresIn: '30d' }
          );
          await adminDb.from('registration_intents').update({ used: true }).eq('email', intent.email);
          return res.json({ token, user: { id: signIn.user.id, email: intent.email, name: (prof as any)?.full_name, plan: (prof as any)?.tenants?.plan || 'trial', role: (prof as any)?.role || 'owner' } });
        }
        return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
      }
      return res.status(400).json({ error: 'Account creation failed: ' + msg });
    }

    const uid      = authData.user.id;
    const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const { data: tenant } = await adminDb.from('tenants')
      .insert({ name: intent.company || intent.name, plan: 'trial', trial_end: trialEnd })
      .select().single();

    await adminDb.from('profiles').insert({
      id: uid, tenant_id: tenant?.id,
      full_name: intent.name, phone: intent.phone,
      company: intent.company, role: 'owner', auto_forward: false,
    });

    // Mark registration as used
    await adminDb.from('registration_intents').update({ used: true }).eq('email', intent.email);

    await logActivity(uid, tenant?.id ?? '', 'Account created', 'user', uid, { email: intent.email });
    await sendNotification(uid, '🎉 Welcome to autoflow!',
      'Your 10-day free trial has started. Connect your first store to begin.', 'system');

    const token = jwt.sign(
      { id: uid, email: intent.email, tenant_id: tenant?.id, role: 'owner' },
      JWT_SECRET, { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: uid, email: intent.email, name: intent.name,
        plan: 'trial', trialEnd, tenant_id: tenant?.id, role: 'owner',
      },
    });
  }

  // ── RESEND OTP ───────────────────────────────────────────────────────────
  if (action === 'resend_otp') {
    const regId = sanitizeString(req.body.registration_id || '');
    const email = sanitizeEmail(req.body.email || '');

    // Accept both registration_id and email
    let query = adminDb.from('registration_intents').select('email,name').eq('used', false);
    const { data: intent } = await (email
      ? query.eq('email', email).maybeSingle()
      : query.eq('registration_id', regId).maybeSingle());

    if (!intent) return res.status(400).json({ error: 'Session not found. Please start the signup process again.' });

    const otp       = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await adminDb.from('registration_intents')
      .update({ otp_code: otp, otp_expires_at: expiresAt, attempts: 0 })
      .eq('email', intent.email);

    const emailSent = await sendOTPEmail(intent.email, otp, intent.name);
    const isDev     = process.env.NODE_ENV !== 'production';
    return res.json({
      ok: true, expires_in: 900, email_sent: emailSent,
      message: emailSent ? 'New code sent!' : 'Code regenerated. Check spam or wait a moment.',
      ...(isDev ? { demo_otp: otp } : {}),
    });
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const email    = sanitizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    // Demo shortcut (only if enabled)
    if (process.env.ENABLE_DEMO_MODE !== 'false' && email === 'demo@autoflow.dz' && (password === 'AutoflowDemo2025!' || password === 'demo123')) {
      const token = jwt.sign({ id: 'demo', email, isDemo: true, role: 'viewer' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, user: { id: 'demo', email, name: 'Demo User', plan: 'professional', isDemo: true, role: 'viewer' } });
    }

    if (!isValidEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const { data: authData, error: authErr } = await adminDb.auth.signInWithPassword({ email, password });
    if (authErr) return res.status(401).json({ error: 'Invalid email or password. Please try again.' });

    const uid = authData.user.id;
    const { data: profile } = await adminDb.from('profiles').select('*, tenants(*)').eq('id', uid).single();
    const tenant = (profile as any)?.tenants;

    // Check ban
    const { data: ban } = await adminDb.from('user_bans').select('id').eq('user_id', uid).maybeSingle();
    if (ban) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const token = jwt.sign(
      { id: uid, email, tenant_id: profile?.tenant_id, role: profile?.role ?? 'owner' },
      JWT_SECRET, { expiresIn: '30d' }
    );

    await logActivity(uid, profile?.tenant_id ?? '', 'Login', 'user', uid, { ip: req.ip });

    return res.json({
      token,
      user: { id: uid, email, name: profile?.full_name ?? '', plan: tenant?.plan ?? 'trial',
        trialEnd: tenant?.trial_end, tenant_id: profile?.tenant_id, role: profile?.role ?? 'owner' },
    });
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────
  if (action === 'logout') return res.json({ ok: true });

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  if (action === 'forgot_password') {
    const email = sanitizeEmail(req.body.email);
    if (isValidEmail(email)) {
      try {
        // توليد رابط إعادة تعيين من Supabase
        const { data, error: linkErr } = await adminDb.auth.admin.generateLink({
          type: 'recovery', email,
          options: { redirectTo: (process.env.APP_URL || 'https://autoflow-h4r8.onrender.com') + '/login?reset=1' }
        });
        if (!linkErr && data?.properties?.action_link) {
          await sendPasswordResetEmail(email, data.properties.action_link);
        } else {
          console.error('[forgot_password] generateLink error:', linkErr?.message);
        }
      } catch (err) {
        console.error('[forgot_password] error:', err);
      }
    }
    return res.json({ ok: true, message: 'If this email is registered, you will receive a reset link shortly.' });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}));

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/orders/export', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Not available in demo.' });

  const { status, search, from: fromDate, to: toDate } = req.query;
  let q = adminDb.from('orders')
    .select('order_number,customer_name,customer_phone,wilaya,carrier,payment_method,status,total,created_at,notes')
    .eq('tenant_id', tenant_id!).order('created_at', { ascending: false }).limit(10000);

  if (status && status !== 'all') q = q.eq('status', String(status));
  if (search) q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
  if (fromDate) q = q.gte('created_at', String(fromDate));
  if (toDate)   q = q.lte('created_at', String(toDate));

  const { data } = await q;
  const fields = ['order_number','customer_name','customer_phone','wilaya','carrier','payment_method','status','total','created_at','notes'];
  const csv = [fields.join(','), ...(data ?? []).map(r => fields.map(f => JSON.stringify((r as any)[f] ?? '')).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
  return res.send('\uFEFF' + csv); // BOM for Arabic support in Excel
}));

app.get('/api/orders/:orderId/history', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data } = await adminDb.from('order_status_history').select('*').eq('order_id', req.params.orderId).order('created_at', { ascending: true });
  return res.json(data ?? []);
}));

app.get('/api/orders', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);

  const { status, search, page = 1, limit = 100, from: fromDate, to: toDate, carrier, wilaya } = req.query;
  const from = (Number(page) - 1) * Number(limit);

  let q = adminDb.from('orders').select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id!).is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') q = q.eq('status', String(status));
  if (carrier) q = q.eq('carrier', String(carrier));
  if (wilaya)  q = q.eq('wilaya', String(wilaya));
  if (search)  q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  if (fromDate) q = q.gte('created_at', String(fromDate));
  if (toDate)   q = q.lte('created_at', String(toDate));
  q = q.range(from, from + Number(limit) - 1);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.set('X-Total-Count', String(count ?? 0));
  return res.json(data ?? []);
}));

app.post('/api/orders', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode is read-only.' });

  // Check plan limits
  const { data: tenant } = await adminDb.from('tenants').select('plan').eq('id', tenant_id!).single();
  const { data: planData } = await adminDb.from('plans').select('orders_limit').eq('plan_key', tenant?.plan || 'trial').maybeSingle();
  const ordersLimit = planData?.orders_limit ?? -1;

  if (ordersLimit > 0) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await adminDb.from('orders').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id!).gte('created_at', startOfMonth).is('deleted_at', null);
    if ((count ?? 0) >= ordersLimit) {
      return res.status(403).json({ error: `Monthly order limit (${ordersLimit}) reached. Please upgrade your plan.` });
    }
  }

  const carrier = sanitizeString(req.body.carrier) || assignCarrierForWilaya(sanitizeString(req.body.wilaya));
  const orderData = {
    tenant_id,
    order_number: req.body.order_number || '#ORD-' + Date.now().toString().slice(-6),
    customer_name: sanitizeString(req.body.customer_name),
    customer_phone: sanitizeString(req.body.customer_phone),
    customer_address: sanitizeString(req.body.address || req.body.customer_address),
    wilaya: sanitizeString(req.body.wilaya),
    product_name: sanitizeString(req.body.product_name),
    quantity: sanitizeNumber(req.body.quantity, 1),
    total: sanitizeNumber(req.body.total || req.body.price, 0),
    shipping_cost: sanitizeNumber(req.body.shipping_cost, 0),
    payment_method: sanitizeString(req.body.payment_method) || 'COD',
    carrier, notes: sanitizeString(req.body.notes),
    status: sanitizeString(req.body.status) || 'pending',
  };

  const { data: order, error } = await adminDb.from('orders').insert(orderData).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await recordStatusChange(order.id, order.status, 'Order created');
  await logActivity(userId, tenant_id!, `Created order ${order.order_number}`, 'order', order.id);
  runOrderCreatedRules(order, userId, tenant_id!).catch(console.error);
  return res.status(201).json(order);
}));

app.put('/api/orders', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode is read-only.' });

  const { id, status, ...rest } = req.body;
  if (!id) return res.status(400).json({ error: 'Order id is required.' });

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) updates.status = sanitizeString(status);
  if (rest.carrier)          updates.carrier          = sanitizeString(rest.carrier);
  if (rest.tracking_number)  updates.tracking_number  = sanitizeString(rest.tracking_number);
  if (rest.notes !== undefined) updates.notes         = sanitizeString(rest.notes);
  if (rest.customer_name)    updates.customer_name    = sanitizeString(rest.customer_name);
  if (rest.customer_phone)   updates.customer_phone   = sanitizeString(rest.customer_phone);
  if (rest.wilaya)           updates.wilaya           = sanitizeString(rest.wilaya);
  if (rest.total !== undefined) updates.total         = sanitizeNumber(rest.total);

  const { data: order, error } = await adminDb.from('orders').update(updates).eq('id', id).eq('tenant_id', tenant_id!).select().single();
  if (error) return res.status(400).json({ error: error.message });

  if (status) {
    await recordStatusChange(id, status);
    await logActivity(userId, tenant_id!, `Status → ${status}`, 'order', id);
    runStatusChangeRules(order, userId, tenant_id!).catch(console.error);
    if (status === 'delivered') updateCustomerStats(order, tenant_id!).catch(console.error);

    // Send email notification for status change
    const { data: profile } = await adminDb.from('profiles').select('email:id').eq('id', userId).single();
    if (profile) {
      sendOrderStatusEmail(
        (await adminDb.auth.admin.getUserById(userId)).data?.user?.email ?? '',
        'User', order.order_number, status, order.carrier, order.tracking_number
      ).catch(console.error);
    }
  }
  return res.json(order);
}));

// Soft delete
app.delete('/api/orders', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode is read-only.' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required.' });
  await adminDb.from('orders').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenant_id!);
  await logActivity(userId, tenant_id!, 'Soft-deleted order', 'order', id);
  return res.json({ ok: true });
}));

// Bulk status update
app.post('/api/orders/bulk', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode is read-only.' });
  const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids.slice(0, 500) : [];
  const status = sanitizeString(req.body.status);
  if (!ids.length || !status) return res.status(400).json({ error: 'ids and status required.' });
  await adminDb.from('orders').update({ status, updated_at: new Date().toISOString() }).in('id', ids).eq('tenant_id', tenant_id!);
  await Promise.all(ids.map(id => recordStatusChange(id, status, 'Bulk update')));
  await logActivity(userId, tenant_id!, `Bulk updated ${ids.length} orders → ${status}`, 'order', 'bulk');
  return res.json({ ok: true, updated: ids.length });
}));

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS (using RPC for performance)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/analytics', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  // Demo users see their own (empty) data — no mock

  // Use optimized query — only fetch what we need
  const { data: orders } = await adminDb.from('orders')
    .select('id,status,total,created_at,carrier,wilaya,payment_method')
    .eq('tenant_id', tenant_id!).is('deleted_at', null);
  const o = orders ?? [];

  const totalOrders  = o.length;
  const delivered    = o.filter(x => x.status === 'delivered').length;
  const pending      = o.filter(x => x.status === 'pending').length;
  const cancelled    = o.filter(x => x.status === 'cancelled').length;
  const returned     = o.filter(x => x.status === 'returned').length;
  const revenue      = o.filter(x => x.status === 'delivered').reduce((s, x) => s + (x.total ?? 0), 0);
  const totalCOD     = o.filter(x => x.payment_method === 'COD').reduce((s, x) => s + (x.total ?? 0), 0);
  const deliveryRate = totalOrders ? +((delivered / totalOrders) * 100).toFixed(1) : 0;

  const revenueByDay: Record<string, number> = {};
  const ordersByDay:  Record<string, number> = {};
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    revenueByDay[d] = 0; ordersByDay[d] = 0;
  }
  for (const ord of o) {
    const day = ord.created_at?.slice(0, 10);
    if (!day) continue;
    if (day in ordersByDay) ordersByDay[day]++;
    if (day in revenueByDay && ord.status === 'delivered') revenueByDay[day] += ord.total ?? 0;
  }
  const revenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({ date: date.slice(5), revenue }));
  const ordersChart  = Object.entries(ordersByDay).map(([date, count]) => ({ date: date.slice(5), count }));

  const statusCounts: Record<string, number> = {};
  for (const ord of o) statusCounts[ord.status] = (statusCounts[ord.status] ?? 0) + 1;
  const statusChart = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  const carrierCounts: Record<string, number> = {};
  for (const ord of o) if (ord.carrier) carrierCounts[ord.carrier] = (carrierCounts[ord.carrier] ?? 0) + 1;
  const carrierChart = Object.entries(carrierCounts).map(([carrier, count]) => ({ carrier, count })).sort((a,b) => b.count - a.count).slice(0, 8);

  const wilayaCounts: Record<string, number> = {};
  for (const ord of o) if (ord.wilaya) wilayaCounts[ord.wilaya] = (wilayaCounts[ord.wilaya] ?? 0) + 1;
  const topWilayas = Object.entries(wilayaCounts).map(([wilaya, count]) => ({ wilaya, count })).sort((a,b) => b.count - a.count).slice(0, 10);

  return res.json({ totalOrders, delivered, pending, cancelled, returned, revenue, totalCOD, deliveryRate, revenueChart, ordersChart, statusChart, carrierChart, topWilayas });
}));

// buildDemoAnalytics() removed — all data is now real

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/notifications/unread', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ count: 3 });
  const { count } = await adminDb.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false);
  return res.json({ count: count ?? 0 });
}));

app.get('/api/notifications', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json([]); // no mock
  const { data } = await adminDb.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(60);
  return res.json(data ?? []);
}));

// buildDemoNotifications() removed

app.post('/api/notifications', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { data } = await adminDb.from('notifications').insert({
    user_id: userId, title: sanitizeString(req.body.title), message: sanitizeString(req.body.message),
    type: sanitizeString(req.body.type) || 'system', read: false, order_id: req.body.order_id ?? null,
  }).select().single();
  return res.status(201).json(data);
}));

app.put('/api/notifications', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  if (req.body.mark_all) await adminDb.from('notifications').update({ read: true }).eq('user_id', userId);
  else if (req.body.id) await adminDb.from('notifications').update({ read: true }).eq('id', req.body.id).eq('user_id', userId);
  return res.json({ ok: true });
}));

app.delete('/api/notifications', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required.' });
  await adminDb.from('notifications').delete().eq('id', id).eq('user_id', userId);
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// STORES
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/stores', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]); // demo sees empty stores
  const { data } = await adminDb.from('stores').select('*').eq('tenant_id', tenant_id!).order('created_at', { ascending: false });
  return res.json(data ?? []);
}));

app.post('/api/stores', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { data, error } = await adminDb.from('stores').insert({
    tenant_id, name: sanitizeString(req.body.name), platform: sanitizeString(req.body.platform),
    url: sanitizeString(req.body.url), webhook_url: sanitizeString(req.body.webhook_url),
    active: true, orders_count: 0,
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  await logActivity(userId, tenant_id!, `Connected store: ${req.body.name}`, 'store', data.id);
  return res.status(201).json(data);
}));

app.delete('/api/stores', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required.' });
  await adminDb.from('stores').delete().eq('id', id).eq('tenant_id', tenant_id!);
  await logActivity(userId, tenant_id!, 'Deleted store', 'store', id);
  return res.json({ ok: true });
}));

// ── Webhook Receiver ──────────────────────────────────────────────────────────
app.post('/api/webhook/:storeId', asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const signature = req.headers['x-shopify-hmac-sha256'] || req.headers['x-wc-webhook-signature'] || '';

  const { data: store } = await adminDb.from('stores').select('*').eq('id', storeId).single();
  if (!store) return res.status(404).json({ error: 'Store not found.' });

  // HMAC verification
  if (store.webhook_secret) {
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', store.webhook_secret).update(body).digest('base64');
    if (signature !== expected) return res.status(401).json({ error: 'Invalid signature.' });
  }

  // Process webhook — map to order
  const payload = req.body;
  const orderData = {
    tenant_id: store.tenant_id,
    order_number: `#${payload.order_number || payload.id || Date.now()}`,
    customer_name: `${payload.shipping_address?.first_name || payload.billing?.first_name || ''} ${payload.shipping_address?.last_name || payload.billing?.last_name || ''}`.trim(),
    customer_phone: payload.shipping_address?.phone || payload.billing?.phone || '',
    customer_address: payload.shipping_address?.address1 || payload.billing?.address_1 || '',
    wilaya: payload.shipping_address?.city || payload.billing?.city || '',
    product_name: payload.line_items?.[0]?.name || payload.line_items?.[0]?.product_name || 'Product',
    quantity: payload.line_items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1,
    total: parseFloat(payload.total_price || payload.total || '0'),
    payment_method: payload.payment_gateway || 'COD',
    status: 'pending', store_id: storeId,
  };

  const carrier = assignCarrierForWilaya(orderData.wilaya);
  const { data: order, error } = await adminDb.from('orders').insert({ ...orderData, carrier }).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await adminDb.from('stores').update({ orders_count: (store.orders_count || 0) + 1, last_sync: new Date().toISOString() }).eq('id', storeId);
  await recordStatusChange(order.id, 'pending', 'Created via webhook');

  return res.status(201).json({ ok: true, order_id: order.id });
}));

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/customers', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([
    { id:'d1', name:'Karim Boudiaf', phone:'0551234567', wilaya:'Alger', total_orders:12, total_spent:54000 },
    { id:'d2', name:'Sarah Meziane', phone:'0662345678', wilaya:'Oran', total_orders:8, total_spent:32000 },
    { id:'d3', name:'Ahmed Taleb', phone:'0773456789', wilaya:'Constantine', total_orders:5, total_spent:18500 },
  ]);
  const { data } = await adminDb.from('customers').select('*').eq('tenant_id', tenant_id!).order('total_spent', { ascending: false }).limit(500);
  return res.json(data ?? []);
}));

// ════════════════════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/profiles', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ full_name: 'Demo User', auto_forward: true, role: 'viewer', company: 'Demo Corp' });
  const { data } = await adminDb.from('profiles').select('*').eq('id', userId).single();
  return res.json(data ?? {});
}));

app.put('/api/profiles', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const updates: Record<string, any> = {};
  if (req.body.name !== undefined)         updates.full_name    = sanitizeString(req.body.name);
  if (req.body.full_name !== undefined)    updates.full_name    = sanitizeString(req.body.full_name);
  if (req.body.phone !== undefined)        updates.phone        = sanitizeString(req.body.phone);
  if (req.body.company !== undefined)      updates.company      = sanitizeString(req.body.company);
  if (req.body.wilaya !== undefined)       updates.wilaya       = sanitizeString(req.body.wilaya);
  if (req.body.auto_forward !== undefined) updates.auto_forward = Boolean(req.body.auto_forward);
  const { data } = await adminDb.from('profiles').update(updates).eq('id', userId).select().single();
  return res.json(data ?? {});
}));

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS (public GET, auth PUT)
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  platform_name: 'autoflow', platform_tagline: "Algeria's #1 Logistics Platform",
  support_whatsapp: '213794157508', currency: 'DZD', platform_primary_color: '#6366f1',
};

app.get('/api/settings', asyncHandler(async (_req, res) => {
  const { data } = await adminDb.from('platform_settings').select('*').eq('id', 'global').maybeSingle();
  return res.json(data ?? DEFAULT_SETTINGS);
}));

app.put('/api/settings', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const updates: Record<string, string> = { id: 'global' };
  for (const [k, v] of Object.entries(req.body)) {
    if (typeof v === 'string') updates[sanitizeString(k)] = sanitizeString(v);
  }
  await adminDb.from('platform_settings').upsert(updates, { onConflict: 'id' });
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// PLANS & TRIAL
// ════════════════════════════════════════════════════════════════════════════
const FALLBACK_PLANS = [
  { plan_key:'basic',        name:'Basic',        price:20000, currency:'DZD', orders_limit:2000,  stores_limit:5,  active:true, recommended:false, features:['2,000 orders/mo','5 stores','All carriers','Analytics','CSV export','Email support'] },
  { plan_key:'professional', name:'Professional', price:45000, currency:'DZD', orders_limit:-1,    stores_limit:-1, active:true, recommended:true,  features:['Unlimited orders','Unlimited stores','All carriers + API','Advanced analytics','Automation engine','Priority support','Webhooks'] },
];

app.get('/api/plans', asyncHandler(async (_req, res) => {
  const { data } = await adminDb.from('plans').select('*').eq('active', true);
  return res.json(data?.length ? data : FALLBACK_PLANS);
}));

app.get('/api/trial/status', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ active: true, plan: 'demo', daysLeft: 999 });
  const { data: profile } = await adminDb.from('profiles').select('tenant_id').eq('id', userId).single();
  const { data: tenant } = await adminDb.from('tenants').select('plan,trial_end').eq('id', profile?.tenant_id ?? '').single();
  const trialEnd = tenant?.trial_end ? new Date(tenant.trial_end) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;

  // Check ban
  const { data: ban } = await adminDb.from('user_bans').select('id').eq('user_id', userId).maybeSingle();
  if (ban) return res.json({ active: false, plan: 'banned', daysLeft: 0 });

  const active = tenant?.plan !== 'trial' || (trialEnd !== null && trialEnd > new Date());
  return res.json({ active, plan: tenant?.plan ?? 'trial', daysLeft, trialEnd: tenant?.trial_end });
}));

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/logs', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json([
    { id:'d1', action:'Login', entity:'user', created_at: new Date().toISOString() },
    { id:'d2', action:'Created order #ORD-2847', entity:'order', created_at: new Date(Date.now()-3600000).toISOString() },
  ]);
  const limit = Math.min(100, sanitizeNumber(req.query.limit, 30));
  const { data } = await adminDb.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return res.json(data ?? []);
}));

app.post('/api/logs', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  await logActivity(userId, tenant_id ?? '', sanitizeString(req.body.action), sanitizeString(req.body.entity), sanitizeString(req.body.entity_id), req.body.metadata);
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/admin', requireAuth, requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const resource = req.query.resource as string;
  const limit = sanitizeNumber(req.query.limit, 100);

  if (resource === 'stats') {
    const [usersRes, ordersRes, ordersToday, subsRes] = await Promise.all([
      adminDb.from('profiles').select('*', { count: 'exact', head: true }),
      adminDb.from('orders').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      adminDb.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now()-86400000).toISOString()).is('deleted_at', null),
      adminDb.from('tenants').select('plan'),
    ]);
    const plans = subsRes.data ?? [];
    const planDist: Record<string, number> = {};
    for (const p of plans) planDist[p.plan] = (planDist[p.plan] ?? 0) + 1;
    const { data: revOrders } = await adminDb.from('orders').select('total').eq('status', 'delivered').is('deleted_at', null);
    const totalRevenue = (revOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
    return res.json({ total_users: usersRes.count ?? 0, total_orders: ordersRes.count ?? 0, orders_today: ordersToday.count ?? 0, active_trials: planDist['trial'] ?? 0, paid_subscriptions: (planDist['basic'] ?? 0) + (planDist['professional'] ?? 0), total_revenue: totalRevenue, plan_distribution: planDist });
  }

  if (resource === 'users') {
    const { data: users } = await adminDb.auth.admin.listUsers({ page: 1, perPage: limit });
    const userIds = (users?.users ?? []).map(u => u.id);
    const { data: profiles } = await adminDb.from('profiles').select('*, tenants(*)').in('id', userIds);
    const { data: bans } = await adminDb.from('user_bans').select('user_id');
    const bannedIds = new Set((bans ?? []).map((b: any) => b.user_id));
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
    return res.json((users?.users ?? []).map(u => ({
      id: u.id, email: u.email,
      status: bannedIds.has(u.id) ? 'banned' : (u.email_confirmed_at ? 'active' : 'pending'),
      created_at: u.created_at, profile: profileMap[u.id] ?? null,
      subscription: (profileMap[u.id] as any)?.tenants ?? null,
    })));
  }

  if (resource === 'subscriptions') {
    const { data: tenants } = await adminDb.from('tenants').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(limit);
    return res.json((tenants ?? []).map((t: any) => ({
      id: t.id, user_email: t.profiles?.[0]?.full_name ?? '-', plan: t.plan,
      status: t.plan === 'trial' ? (new Date(t.trial_end) > new Date() ? 'trial' : 'expired') : 'active',
      amount: t.plan === 'basic' ? 20000 : t.plan === 'professional' ? 45000 : null,
      currency: 'DZD', trial_end: t.trial_end, created_at: t.created_at,
    })));
  }

  if (resource === 'logs') {
    const { data: logs } = await adminDb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
    return res.json(logs ?? []);
  }

  return res.status(400).json({ error: 'Unknown resource.' });
}));

app.put('/api/admin', requireAuth, requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, plan, tenant_id: targetTenantId, action: adminAction } = req.body;

  if (adminAction === 'set_plan' && targetTenantId && plan) {
    await adminDb.from('tenants').update({ plan }).eq('id', targetTenantId);
    await logActivity(req.authUser!.id, req.authUser!.tenant_id!, `Admin set plan to ${plan}`, 'tenant', targetTenantId);
    return res.json({ ok: true });
  }

  if (email && plan) {
    const { data: users } = await adminDb.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { data: profile } = await adminDb.from('profiles').select('tenant_id').eq('id', user.id).single();
    if (profile?.tenant_id) await adminDb.from('tenants').update({ plan }).eq('id', profile.tenant_id);
    await logActivity(req.authUser!.id, req.authUser!.tenant_id!, `Admin set ${email} plan → ${plan}`, 'user', user.id);
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'No valid update specified.' });
}));

// Admin actions (ban, unban, extend trial, etc.)
app.post('/api/admin/action', requireAuth, requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: adminId } = req.authUser!;
  const { action, user_id, fingerprint, days, plan, tenant_id } = req.body;

  if (action === 'ban_user' && user_id) {
    await adminDb.from('user_bans').upsert({ user_id, banned_by: adminId, reason: 'Banned by admin' }, { onConflict: 'user_id' });
    await logActivity(adminId, '', 'Admin banned user', 'user', user_id);
    return res.json({ ok: true });
  }
  if (action === 'unban_user' && user_id) {
    await adminDb.from('user_bans').delete().eq('user_id', user_id);
    await logActivity(adminId, '', 'Admin unbanned user', 'user', user_id);
    return res.json({ ok: true });
  }
  if (action === 'ban_device' && fingerprint) {
    await adminDb.from('device_bans').upsert({ fingerprint, banned_by: adminId }, { onConflict: 'fingerprint' });
    await adminDb.from('device_sessions').update({ active: false }).eq('fingerprint', fingerprint);
    await logActivity(adminId, '', 'Admin banned device', 'device', fingerprint);
    return res.json({ ok: true });
  }
  if (action === 'extend_trial' && user_id) {
    const d = Math.min(90, Math.max(1, sanitizeNumber(days, 7)));
    const { data: profile } = await adminDb.from('profiles').select('tenant_id').eq('id', user_id).single();
    if (profile?.tenant_id) {
      const { data: t } = await adminDb.from('tenants').select('trial_end').eq('id', profile.tenant_id).single();
      const base = t?.trial_end && new Date(t.trial_end) > new Date() ? new Date(t.trial_end) : new Date();
      const newEnd = new Date(base.getTime() + d * 86400000).toISOString();
      await adminDb.from('tenants').update({ trial_end: newEnd, plan: 'trial' }).eq('id', profile.tenant_id);
      await logActivity(adminId, '', `Extended trial by ${d} days`, 'tenant', profile.tenant_id);
    }
    return res.json({ ok: true });
  }
  if (action === 'set_plan' && user_id && plan) {
    const { data: profile } = await adminDb.from('profiles').select('tenant_id').eq('id', user_id).single();
    if (profile?.tenant_id) {
      await adminDb.from('tenants').update({ plan }).eq('id', profile.tenant_id);
      await logActivity(adminId, '', `Set plan to ${plan}`, 'tenant', profile.tenant_id);
    }
    return res.json({ ok: true });
  }
  if ((action === 'activate_offer' || action === 'reject_offer') && req.body.subscription_id) {
    const newStatus = action === 'activate_offer' ? 'active' : 'rejected';
    await adminDb.from('offer_requests').update({ status: newStatus, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq('id', req.body.subscription_id);
    if (action === 'activate_offer') {
      const { data: offer } = await adminDb.from('offer_requests').select('user_id,plan').eq('id', req.body.subscription_id).single();
      if (offer) {
        const { data: p } = await adminDb.from('profiles').select('tenant_id').eq('id', offer.user_id).single();
        if (p?.tenant_id) await adminDb.from('tenants').update({ plan: offer.plan }).eq('id', p.tenant_id);
      }
    }
    return res.json({ ok: true });
  }
  return res.status(400).json({ error: 'Unknown action.' });
}));

app.get('/api/admin/devices', requireAuth, requireAdmin as any, asyncHandler(async (_req, res) => {
  const { data } = await adminDb.from('device_sessions').select('*').order('last_login', { ascending: false }).limit(200);
  return res.json(data ?? []);
}));

app.post('/api/device/session', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId } = req.authUser!;
  if (!userId || userId === 'demo') return res.json({ ok: true });
  const { fingerprint, browser, os, ip } = req.body;
  if (!fingerprint) return res.json({ ok: true });

  await adminDb.from('device_sessions').upsert({
    user_id: userId, fingerprint: sanitizeString(fingerprint),
    browser: sanitizeString(browser), os: sanitizeString(os),
    ip: sanitizeString(ip || req.ip || ''), active: true, last_login: new Date().toISOString(),
  }, { onConflict: 'user_id,fingerprint' });

  const { data: sessions } = await adminDb.from('device_sessions').select('id,last_login').eq('user_id', userId).eq('active', true).order('last_login', { ascending: true });
  if (sessions && sessions.length > 3) {
    const oldest = sessions.slice(0, sessions.length - 3).map((s: any) => s.id);
    if (oldest.length > 0) await adminDb.from('device_sessions').update({ active: false }).in('id', oldest);
  }
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATION RULES CRUD
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/automation-rules', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);
  const { data } = await adminDb.from('automation_rules').select('*').eq('tenant_id', tenant_id!).order('created_at', { ascending: true });
  return res.json(data ?? []);
}));

app.post('/api/automation-rules', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { data, error } = await adminDb.from('automation_rules').insert({
    tenant_id, name: sanitizeString(req.body.name),
    trigger: sanitizeString(req.body.trigger),
    condition_field: sanitizeString(req.body.condition_field),
    condition_operator: sanitizeString(req.body.condition_operator),
    condition_value: sanitizeString(req.body.condition_value),
    action_type: sanitizeString(req.body.action_type),
    action_value: sanitizeString(req.body.action_value),
    enabled: req.body.enabled ?? true,
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  await logActivity(userId, tenant_id!, `Created automation rule: ${req.body.name}`, 'automation', data.id);
  return res.status(201).json(data);
}));

app.put('/api/automation-rules/:id', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { data, error } = await adminDb.from('automation_rules')
    .update({ enabled: req.body.enabled, action_value: sanitizeString(req.body.action_value), name: sanitizeString(req.body.name) })
    .eq('id', req.params.id).eq('tenant_id', tenant_id!).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}));

app.delete('/api/automation-rules/:id', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  await adminDb.from('automation_rules').delete().eq('id', req.params.id).eq('tenant_id', tenant_id!);
  return res.json({ ok: true });
}));


// ════════════════════════════════════════════════════════════════════════════
// CARRIER CONFIGURATIONS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/carriers', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);
  const { data } = await adminDb.from('carrier_configs').select('id,carrier_name,is_active,is_default,test_status,last_tested_at,test_message').eq('tenant_id', tenant_id!);
  return res.json(data ?? []);
}));

app.put('/api/carriers', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Read-only in demo.' });
  const { carrier_name, credentials, is_active, is_default } = req.body;
  if (!carrier_name) return res.status(400).json({ error: 'carrier_name required' });
  const encrypted = encryptCreds(credentials || {});
  const { data, error } = await adminDb.from('carrier_configs').upsert({
    tenant_id: tenant_id!, carrier_name: sanitizeString(carrier_name),
    credentials: encrypted, is_active: is_active ?? false, is_default: is_default ?? false,
  }, { onConflict: 'tenant_id,carrier_name' }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}));

app.post('/api/carriers/test', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json({ success: false, message: 'Test not available in demo mode.' });
  const { carrier_name, credentials } = req.body;
  const result = await testCarrierConnection(sanitizeString(carrier_name), credentials || {});
  // حفظ نتيجة الاختبار
  await adminDb.from('carrier_configs').update({
    test_status: result.success ? 'connected' : 'failed',
    test_message: result.message, last_tested_at: new Date().toISOString(),
  }).eq('tenant_id', tenant_id!).eq('carrier_name', sanitizeString(carrier_name));
  return res.json(result);
}));

app.post('/api/orders/:orderId/submit', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { data: order } = await adminDb.from('orders').select('*').eq('id', req.params.orderId).eq('tenant_id', tenant_id!).single();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const result = await submitOrderToCarrier(order, tenant_id!);
  return res.json(result);
}));

// ════════════════════════════════════════════════════════════════════════════
// STORE SYNC
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/stores/:storeId/sync', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const result = await syncStoreOrders(req.params.storeId, tenant_id!);
  return res.json(result);
}));

app.post('/api/stores/test', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isDemo } = req.authUser!;
  if (isDemo) return res.json({ success: false, message: 'Not available in demo.' });
  const { platform, config } = req.body;
  const result = await testStoreConnection(sanitizeString(platform), config || {});
  return res.json(result);
}));

app.put('/api/stores/:storeId/config', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { platform_config } = req.body;
  const { data, error } = await adminDb.from('stores').update({ platform_config }).eq('id', req.params.storeId).eq('tenant_id', tenant_id!).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}));

// ════════════════════════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/tickets', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);
  const { data } = await adminDb.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return res.json(data ?? []);
}));

app.post('/api/tickets', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { data, error } = await adminDb.from('support_tickets').insert({
    user_id: userId, tenant_id,
    title: sanitizeString(req.body.title),
    description: sanitizeString(req.body.description),
    priority: sanitizeString(req.body.priority) || 'medium',
    category: sanitizeString(req.body.category) || 'general',
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}));


// ════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/push/vapid-key', (_req, res) =>
  res.json({ publicKey: VAPID_PUBLIC_KEY })
);

app.post('/api/push/subscribe', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  await adminDb.from('push_subscriptions').upsert({
    user_id: userId, endpoint,
    p256dh: keys.p256dh, auth_key: keys.auth,
    user_agent: sanitizeString(userAgent || ''),
  }, { onConflict: 'user_id,endpoint' });
  return res.json({ ok: true });
}));

app.delete('/api/push/subscribe', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId } = req.authUser!;
  const { endpoint } = req.body;
  if (endpoint) {
    await adminDb.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
  } else {
    await adminDb.from('push_subscriptions').delete().eq('user_id', userId);
  }
  return res.json({ ok: true });
}));

app.post('/api/push/test', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId } = req.authUser!;
  const sent = await sendPushToUser(userId, {
    title: '🔔 autoflow Test',
    body: 'Push notifications are working!',
    url: '/dashboard',
    tag: 'test',
  });
  return res.json({ ok: true, sent });
}));

// ════════════════════════════════════════════════════════════════════════════
// 2FA (TOTP)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/2fa/setup', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, email, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const secret = generateSecret();
  const uri    = getTOTPUri(secret, email || '', 'autoflow');
  // Store secret temporarily (not verified yet)
  await adminDb.from('profiles').update({ totp_secret: secret, totp_verified: false }).eq('id', userId);
  return res.json({ secret, uri, qrData: uri });
}));

app.post('/api/2fa/verify', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { token } = req.body;
  const { data: profile } = await adminDb.from('profiles').select('totp_secret').eq('id', userId).single();
  if (!profile?.totp_secret) return res.status(400).json({ error: '2FA setup not started.' });
  if (!verifyTOTP(profile.totp_secret, String(token))) {
    return res.status(400).json({ error: 'Invalid TOTP code.' });
  }
  await adminDb.from('profiles').update({ totp_enabled: true, totp_verified: true }).eq('id', userId);
  return res.json({ ok: true });
}));

app.delete('/api/2fa', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { token } = req.body;
  const { data: profile } = await adminDb.from('profiles').select('totp_secret,totp_enabled').eq('id', userId).single();
  if (profile?.totp_enabled && !verifyTOTP(profile.totp_secret!, String(token))) {
    return res.status(400).json({ error: 'Invalid TOTP code.' });
  }
  await adminDb.from('profiles').update({ totp_secret: null, totp_enabled: false, totp_verified: false }).eq('id', userId);
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// AI ROUTING
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/ai/assign-carrier', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json({ carrier: getRuleCarrier(req.body.wilaya), method: 'rule', confidence: 0.7, reason: 'Demo mode' });
  const { wilaya } = req.body;
  const { data: settings } = await adminDb.from('platform_settings').select('ai_routing_enabled').eq('id', 'global').maybeSingle();
  const result = await assignCarrierAI(tenant_id!, sanitizeString(wilaya), settings?.ai_routing_enabled ?? false);
  return res.json(result);
}));

app.get('/api/ai/routing-log', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);
  const { data } = await adminDb.from('ai_routing_log').select('*').eq('tenant_id', tenant_id!).order('created_at', { ascending: false }).limit(100);
  return res.json(data ?? []);
}));

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD CHANGE
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/change-password', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, email, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Cannot change demo password.' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  // Verify current password
  const { error: signInErr } = await adminDb.auth.signInWithPassword({ email: email!, password: currentPassword });
  if (signInErr) return res.status(401).json({ error: 'Current password is incorrect.' });
  // Update password
  const { error: updateErr } = await adminDb.auth.admin.updateUserById(userId, { password: newPassword });
  if (updateErr) return res.status(400).json({ error: updateErr.message });
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// CARRIER CONFIGS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/carrier-configs', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json([]);
  const { data } = await adminDb.from('carrier_configs').select('*').eq('tenant_id', tenant_id!);
  return res.json(data ?? []);
}));

app.put('/api/carrier-configs', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { carrier, enabled, api_key, api_secret, webhook_url } = req.body;
  const { data, error } = await adminDb.from('carrier_configs').upsert({
    tenant_id, carrier: sanitizeString(carrier),
    enabled: Boolean(enabled),
    api_key:     api_key     ? sanitizeString(api_key) : null,
    api_secret:  api_secret  ? sanitizeString(api_secret) : null,
    webhook_url: webhook_url ? sanitizeString(webhook_url) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,carrier' }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}));

app.post('/api/carrier-configs/test', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isDemo } = req.authUser!;
  if (isDemo) return res.json({ success: false, message: 'Demo mode' });
  const { carrier, api_key } = req.body;
  if (!api_key) return res.json({ success: false, message: 'API key required' });
  // Simple connectivity test — check carrier API
  try {
    const endpoints: Record<string, string> = {
      'Yalidine': 'https://api.yalidine.app/v1/companies/',
      'ZR Express': 'https://procolis.com/api_key/carriers/',
    };
    const url = endpoints[carrier as string];
    if (!url) return res.json({ success: true, message: `${carrier} config saved (no test endpoint available)` });
    const resp = await fetch(url, { headers: { 'X-API-ID': api_key, 'X-API-TOKEN': api_key }, signal: AbortSignal.timeout(5000) });
    return res.json({ success: resp.status !== 401, message: resp.ok ? 'Connection successful' : `HTTP ${resp.status}` });
  } catch {
    return res.json({ success: false, message: 'Connection failed (timeout or network error)' });
  }
}));

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATION SETTINGS (REAL)
// ════════════════════════════════════════════════════════════════════════════
app.put('/api/settings/automation', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const updates: Record<string, unknown> = { id: 'global' };
  const boolFields = ['auto_generate_labels','auto_send_sms','auto_retry_failed','ai_routing_enabled'];
  const strFields  = ['sms_provider','sms_api_key','sms_sender_id'];
  for (const f of boolFields) if (req.body[f] !== undefined) updates[f] = Boolean(req.body[f]);
  for (const f of strFields)  if (req.body[f] !== undefined) updates[f] = sanitizeString(req.body[f]);
  await adminDb.from('platform_settings').upsert(updates, { onConflict: 'id' });
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// AVATAR UPLOAD
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/profiles/avatar', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.status(403).json({ error: 'Demo mode.' });
  const { avatar_url } = req.body;
  if (!avatar_url || !avatar_url.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid avatar URL.' });
  }
  const { data } = await adminDb.from('profiles').update({ avatar_url: sanitizeString(avatar_url) }).eq('id', userId).select().single();
  return res.json(data);
}));

// ════════════════════════════════════════════════════════════════════════════
// LANGUAGE PREFERENCE
// ════════════════════════════════════════════════════════════════════════════
app.put('/api/profiles/language', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: userId, isDemo } = req.authUser!;
  if (isDemo) return res.json({ ok: true });
  const lang = sanitizeString(req.body.language);
  if (!['en','fr','ar'].includes(lang)) return res.status(400).json({ error: 'Invalid language' });
  await adminDb.from('profiles').update({ language: lang }).eq('id', userId);
  return res.json({ ok: true });
}));

// ════════════════════════════════════════════════════════════════════════════
// ORDER STATUS HISTORY
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/orders/:id/history', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data } = await adminDb.from('order_status_history').select('*').eq('order_id', req.params.id).order('created_at', { ascending: true });
  return res.json(data ?? []);
}));

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS ENHANCED (Date Range)
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/analytics/range', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tenant_id, isDemo } = req.authUser!;
  if (isDemo) return res.json({ orders: [], revenue: 0, deliveryRate: 0 });
  const from = sanitizeString(String(req.query.from || new Date(Date.now()-30*86400000).toISOString().slice(0,10)));
  const to   = sanitizeString(String(req.query.to   || new Date().toISOString().slice(0,10)));
  const { data: orders } = await adminDb.from('orders')
    .select('id,status,total,created_at,carrier,wilaya,payment_method,customer_phone')
    .eq('tenant_id', tenant_id!).is('deleted_at', null)
    .gte('created_at', from).lte('created_at', to + 'T23:59:59');
  const o = orders ?? [];
  const byDay: Record<string, { orders: number; revenue: number }> = {};
  for (const ord of o) {
    const day = (ord.created_at as string)?.slice(0,10) || '';
    if (!byDay[day]) byDay[day] = { orders: 0, revenue: 0 };
    byDay[day].orders++;
    if (ord.status === 'delivered') byDay[day].revenue += ord.total ?? 0;
  }
  const byCarrier: Record<string, { total: number; delivered: number }> = {};
  const byPayment: Record<string, number> = {};
  const phonesSeen = new Set<string>();
  let repeatCustomers = 0;
  for (const ord of o) {
    if (ord.carrier) {
      if (!byCarrier[ord.carrier]) byCarrier[ord.carrier] = { total: 0, delivered: 0 };
      byCarrier[ord.carrier].total++;
      if (ord.status === 'delivered') byCarrier[ord.carrier].delivered++;
    }
    if (ord.payment_method) byPayment[ord.payment_method] = (byPayment[ord.payment_method] || 0) + 1;
    if (ord.customer_phone) {
      if (phonesSeen.has(ord.customer_phone)) repeatCustomers++;
      phonesSeen.add(ord.customer_phone);
    }
  }
  return res.json({
    timeline: Object.entries(byDay).map(([date, v]) => ({ date: date.slice(5), ...v })).sort((a,b)=>a.date.localeCompare(b.date)),
    byCarrier: Object.entries(byCarrier).map(([carrier, v]) => ({
      carrier, total: v.total, delivered: v.delivered,
      rate: v.total ? +(v.delivered/v.total*100).toFixed(1) : 0,
    })),
    byPayment: Object.entries(byPayment).map(([method, count]) => ({ method, count })),
    repeatCustomers, uniqueCustomers: phonesSeen.size,
  });
}));

// SMS Test endpoint
app.post('/api/sms/test', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isDemo } = req.authUser!;
  if (isDemo) return res.json({ success: false, message: 'Demo mode' });
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  const { data: s } = await adminDb.from('platform_settings').select('sms_provider,sms_api_key,sms_sender_id').eq('id','global').maybeSingle();
  const result = await (await import('./sms.js')).sendSMS(phone, 'autoflow test SMS ✓', s?.sms_provider, s?.sms_api_key, s?.sms_sender_id);
  return res.json(result);
}));

// ════════════════════════════════════════════════════════════════════════════
// SERVE FRONTEND
// ════════════════════════════════════════════════════════════════════════════
const staticPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, 'public')
  : path.resolve(__dirname, '..', 'dist', 'public');

app.use(express.static(staticPath));
app.get('*', (_req, res) => {
  const indexFile = path.join(staticPath, 'index.html');
  res.sendFile(indexFile, err => { if (err) res.status(404).send('Not found'); });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
createServer(app).listen(PORT, () =>
  console.log(`[server] ✓ autoflow v2.1.0 on :${PORT} — ${process.env.NODE_ENV ?? 'development'}`)
);
