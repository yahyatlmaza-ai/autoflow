import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Building2,
  CheckCircle, AlertCircle, ArrowLeft, Loader2, RefreshCw, ArrowRight, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import LogoFull from '../components/LogoFull';
import { AUTH } from '../lib/api';

// ── Device Fingerprint ────────────────────────────────────────────────────────
async function getFingerprint(): Promise<string> {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height,
    screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency].join('|');
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch { return btoa(raw).slice(0, 64); }
}

// ── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { l: '8+ chars',  ok: password.length >= 8 },
    { l: 'Uppercase', ok: /[A-Z]/.test(password) },
    { l: 'Number',    ok: /\d/.test(password) },
    { l: 'Symbol',    ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444','#f97316','#f59e0b','#10b981'];
  const labels = ['Weak','Fair','Good','Strong'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score-1] : 'rgba(255,255,255,.08)', transition: 'background .25s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {checks.map((c,i) => (
          <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3,
            color: c.ok ? '#4ade80' : 'rgba(232,228,255,.3)' }}>
            {c.ok ? <CheckCircle size={10}/> : <X size={9}/>} {c.l}
          </span>
        ))}
        {score > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: colors[score-1] }}>
            {labels[score-1]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }: {
  value: string[]; onChange: (v: string[]) => void; disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement|null)[]>([]);
  const handle = (i: number, raw: string) => {
    const d = raw.replace(/\D/g,'').slice(-1);
    const next = [...value]; next[i] = d; onChange(next);
    if (d && i < 5) setTimeout(() => refs.current[i+1]?.focus(), 0);
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i-1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    if (digits.length === 6) { onChange(digits); e.preventDefault(); refs.current[5]?.focus(); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input key={i} ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''} onChange={e => handle(i, e.target.value)}
          onKeyDown={e => onKey(i, e)} onPaste={onPaste} disabled={disabled}
          style={{
            width: 50, height: 58, borderRadius: 14,
            background: value[i] ? 'rgba(109,40,217,.15)' : 'rgba(255,255,255,.05)',
            border: `2px solid ${value[i] ? '#8b5cf6' : 'rgba(255,255,255,.1)'}`,
            color: '#fff', fontSize: 22, fontWeight: 700, textAlign: 'center',
            outline: 'none', transition: 'all .2s', fontFamily: 'inherit',
            opacity: disabled ? .5 : 1,
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#a78bfa'}
          onBlur={e => e.currentTarget.style.borderColor = value[i] ? '#8b5cf6' : 'rgba(255,255,255,.1)'}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type Step = 'form' | 'otp' | 'success';

export default function Signup() {
  const { setUser, setToken } = useApp();
  const navigate = useNavigate();

  const [step, setStep]           = useState<Step>('form');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Form fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [company, setCompany]   = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [fingerprint, setFp]   = useState('');

  // OTP
  const [otp, setOtp]                   = useState<string[]>(Array(6).fill(''));
  const [registrationId, setRegId]      = useState('');
  const [resendTimer, setResendTimer]   = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    getFingerprint().then(setFp);
    // استعادة الجلسة إن أعاد المستخدم تحميل الصفحة
    const savedId    = sessionStorage.getItem('af_reg_id');
    const savedEmail = sessionStorage.getItem('af_reg_email');
    if (savedId && savedEmail) {
      setRegId(savedId); setEmail(savedEmail); setStep('otp');
    }
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // ── Signup ────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!name.trim())              return setError('Full name is required.');
    if (!email.trim())             return setError('Email is required.');
    if (password.length < 8)      return setError('Password must be at least 8 characters.');
    if (password !== confirmPass)  return setError('Passwords do not match.');
    setLoading(true);
    try {
      const data = await AUTH.signup({ email: email.trim().toLowerCase(), password, name: name.trim(), phone: phone.trim(), company: company.trim(), fingerprint });
      const rid = data.registration_id || '';
      setRegId(rid);
      sessionStorage.setItem('af_reg_id', rid);
      sessionStorage.setItem('af_reg_email', email.trim().toLowerCase());
      setResendTimer(60);
      // في وضع التطوير، أظهر OTP مباشرة
      if (data.demo_otp) {
        setOtp(data.demo_otp.toString().split(''));
      }
      if (!data.email_sent) {
        setError('⚠️ Email delivery may be delayed. Check spam, or wait a moment and click "Resend code".');
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await AUTH.verifyOtp(registrationId, code, email.trim().toLowerCase());
      localStorage.setItem('af_session_token', data.token);
      localStorage.setItem('af_user', JSON.stringify(data.user));
      sessionStorage.removeItem('af_reg_id');
      sessionStorage.removeItem('af_reg_email');
      setToken(data.token); setUser(data.user);
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Incorrect code. Please try again.');
      setOtp(Array(6).fill(''));
    } finally { setLoading(false); }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResendLoading(true); setError('');
    try {
      await AUTH.resendOtp(registrationId, email.trim().toLowerCase());
      setResendTimer(60);
      setOtp(Array(6).fill(''));
    } catch (err: any) {
      setError(err.message || 'Failed to resend. Please try again.');
    } finally { setResendLoading(false); }
  };

  // ── Layout Wrapper ─────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(109,40,217,.25) 0%, transparent 60%), #06060f',
      padding: '24px', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: step === 'form' ? 460 : 440,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.5)',
        transition: 'max-width .3s',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ marginBottom: 16 }}>
            <LogoFull size="md" to="/" />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#e8e4ff' }}>
            {step === 'form' ? 'Create your account' : step === 'otp' ? 'Verify your email' : 'Account created! 🎉'}
          </h1>
          <p style={{ margin: '5px 0 0', color: 'rgba(232,228,255,.4)', fontSize: 13 }}>
            {step === 'form' ? '10-day free trial · No credit card required'
              : step === 'otp' ? `Enter the 6-digit code sent to ${email}`
              : 'Redirecting you to your dashboard…'}
          </p>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>

          {/* ── STEP: form ── */}
          {step === 'form' && (
            <form onSubmit={handleSignup}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <Field label="Full Name" icon={<User size={14}/>} span={1}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ali Benali" style={inp} autoComplete="name" />
                </Field>
                <Field label="Phone" icon={<Phone size={14}/>} span={1}>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0551234567" style={inp} autoComplete="tel" />
                </Field>
              </div>
              <Field label="Email Address" icon={<Mail size={14}/>}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} autoComplete="email" required />
              </Field>
              <Field label="Company (optional)" icon={<Building2 size={14}/>}>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your store / company" style={inp} />
              </Field>
              <Field label="Password" icon={<Lock size={14}/>}
                right={
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.3)', padding: '0 12px', display: 'flex' }}>
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                }>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters" style={inp} autoComplete="new-password" required />
              </Field>
              <PasswordStrength password={password} />

              <div style={{ marginTop: 14 }}>
                <Field label="Confirm Password" icon={<Lock size={14}/>}>
                  <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repeat password" style={inp} autoComplete="new-password" required />
                </Field>
                {confirmPass && password !== confirmPass && (
                  <p style={{ fontSize: 11, color: '#f87171', marginTop: -6, marginBottom: 8 }}>Passwords do not match</p>
                )}
              </div>

              {error && <ErrorBox msg={error} onResend={error.includes('expired') || error.includes('start over') ? handleResend : undefined} />}

              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? <><Loader2 size={15} style={spin}/> Creating account…</> : <><ArrowRight size={15}/> Create Account</>}
              </button>

              <p style={{ textAlign: 'center', marginTop: 18, color: 'rgba(232,228,255,.35)', fontSize: 13 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
              </p>
            </form>
          )}

          {/* ── STEP: OTP ── */}
          {step === 'otp' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(109,40,217,.12)', border: '1px solid rgba(109,40,217,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Mail size={24} style={{ color: '#a78bfa' }} />
                </div>
                <p style={{ color: 'rgba(232,228,255,.5)', fontSize: 13, margin: 0 }}>
                  A 6-digit code was sent to<br/>
                  <strong style={{ color: '#e8e4ff' }}>{email}</strong>
                </p>
              </div>

              <OTPInput value={otp} onChange={v => { setOtp(v); setError(''); }} disabled={loading} />

              {error && <ErrorBox msg={error} onResend={handleResend} />}

              <button onClick={handleVerify} disabled={loading || otp.join('').length < 6} style={{ ...primaryBtn, marginTop: 24, opacity: otp.join('').length < 6 ? .5 : 1 }}>
                {loading ? <><Loader2 size={15} style={spin}/> Verifying…</> : <><CheckCircle size={15}/> Verify & Create Account</>}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {resendTimer > 0 ? (
                  <span style={{ color: 'rgba(232,228,255,.3)', fontSize: 13 }}>
                    Resend code in <strong style={{ color: '#a78bfa' }}>{resendTimer}s</strong>
                  </span>
                ) : (
                  <button onClick={handleResend} disabled={resendLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {resendLoading ? <Loader2 size={13} style={spin}/> : <RefreshCw size={13}/>} Resend code
                  </button>
                )}
              </div>

              <button onClick={() => {
                sessionStorage.removeItem('af_reg_id'); sessionStorage.removeItem('af_reg_email');
                setStep('form'); setOtp(Array(6).fill('')); setError('');
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.35)', fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, margin: '12px auto 0' }}>
                <ArrowLeft size={12}/> Change email
              </button>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'popIn .4s ease' }}>
                <CheckCircle size={28} style={{ color: '#4ade80' }} />
              </div>
              <p style={{ color: '#e8e4ff', fontWeight: 700, fontSize: 17, margin: '0 0 6px' }}>Account Created!</p>
              <p style={{ color: 'rgba(232,228,255,.4)', fontSize: 13, margin: 0 }}>Taking you to your dashboard…</p>
              <div style={{ marginTop: 20, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#6d28d9,#a855f7)', animation: 'progress 2s linear forwards', borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin-anim  { to { transform: rotate(360deg); } }
        @keyframes popIn      { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes progress   { from { width: 0; } to { width: 100%; } }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 40px #0d0d20 inset !important; -webkit-text-fill-color: #e8e4ff !important; }
        input::placeholder    { color: rgba(232,228,255,.22) !important; }
      `}</style>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Field({ label, icon, right, children, span }: {
  label: string; icon: React.ReactNode; right?: React.ReactNode;
  children: React.ReactNode; span?: number;
}) {
  return (
    <div style={{ marginBottom: 14, gridColumn: span === 1 ? 'span 1' : 'span 2' }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(232,228,255,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, transition: 'border-color .2s' }}
        onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,.55)'}
        onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.09)'}>
        <span style={{ paddingLeft: 12, color: 'rgba(232,228,255,.28)', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>{children}</div>
        {right}
      </div>
    </div>
  );
}

function ErrorBox({ msg, onResend }: { msg: string; onResend?: () => void }) {
  return (
    <div style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 14px', margin: '14px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
        <span style={{ color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>{msg}</span>
      </div>
      {onResend && (
        <button onClick={onResend} style={{ marginTop: 8, padding: '5px 12px', borderRadius: 7, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)', color: '#c4b5fd', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
          Resend new code
        </button>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 13px', background: 'transparent',
  border: 'none', outline: 'none', color: '#e8e4ff', fontSize: 14, fontFamily: 'inherit',
};
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', border: 'none',
  background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff',
  boxShadow: '0 4px 20px rgba(109,40,217,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const spin: React.CSSProperties = { animation: 'spin-anim 1s linear infinite' };
