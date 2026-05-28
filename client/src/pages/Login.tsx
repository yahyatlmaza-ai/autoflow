import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LogoFull from '../components/LogoFull';
import { AUTH } from '../lib/api';

async function getFingerprint(): Promise<string> {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height,
    screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency].join('|');
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch { return btoa(raw).slice(0, 64); }
}

export default function Login() {
  const { setUser, setToken } = useApp();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [fingerprint, setFp]    = useState('');

  const [forgot, setForgot]         = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

  useEffect(() => { getFingerprint().then(setFp); }, []);

  // ── إدخال Demo بنقرة واحدة ───────────────────────────────────────────────
  const fillDemo = () => { setEmail('demo@autoflow.dz'); setPassword('AutoflowDemo2025!'); setError(''); };

  // ── تسجيل الدخول ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password)     { setError('Please enter your password.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await AUTH.login(email.trim().toLowerCase(), password, fingerprint);
      localStorage.setItem('af_session_token', data.token);
      localStorage.setItem('af_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  // ── نسيت كلمة المرور ─────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await AUTH.forgotPass(forgotEmail.trim().toLowerCase());
      setForgotDone(true);
    } catch { setForgotDone(true); } // دائماً نقول "تم الإرسال" لأمان أكبر
    finally { setForgotLoading(false); }
  };

  // ── Styles مشتركة ─────────────────────────────────────────────────────────
  const inputWrap = (icon: React.ReactNode, right?: React.ReactNode) => ({
    position: 'relative' as const,
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(109,40,217,.25) 0%, transparent 60%), #06060f',
      padding: '24px', fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── الكارد الرئيسي ── */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.5)',
      }}>
        {/* هيدر */}
        <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <LogoFull size="md" to="/" />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#e8e4ff', letterSpacing: '-.02em' }}>
            {forgot ? 'Reset Password' : 'Welcome back'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(232,228,255,.45)', fontSize: 14 }}>
            {forgot ? 'Enter your email to receive a reset link.'
              : "Sign in to your account to continue."}
          </p>
        </div>

        <div style={{ padding: '28px 32px 32px' }}>

          {/* ── وضع نسيت كلمة المرور ── */}
          {forgot ? (
            forgotDone ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <RefreshCw size={22} style={{ color: '#4ade80' }} />
                </div>
                <p style={{ color: '#e8e4ff', fontWeight: 600, marginBottom: 6 }}>Check your inbox</p>
                <p style={{ color: 'rgba(232,228,255,.4)', fontSize: 13, marginBottom: 20 }}>
                  If <strong style={{ color: '#a78bfa' }}>{forgotEmail}</strong> is registered, you'll receive a reset link shortly.
                </p>
                <button onClick={() => { setForgot(false); setForgotDone(false); setForgotEmail(''); }}
                  style={btnStyle('secondary')}>Back to Sign In</button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <Field label="Email Address" icon={<Mail size={15} />}>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com" style={inputStyle} autoFocus required />
                </Field>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" onClick={() => setForgot(false)} style={btnStyle('ghost')}>Cancel</button>
                  <button type="submit" disabled={forgotLoading} style={{ ...btnStyle('primary'), flex: 1 }}>
                    {forgotLoading ? <><Loader2 size={15} style={spin} /> Sending…</> : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* ── وضع تسجيل الدخول ── */
            <>
              {/* زر Demo */}
              <button onClick={fillDemo} style={{
                width: '100%', padding: '10px 16px', borderRadius: 12, marginBottom: 20,
                background: 'rgba(109,40,217,.1)', border: '1px solid rgba(109,40,217,.3)',
                color: '#c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .15s', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 16 }}>⚡</span> Try Demo Account
              </button>

              {/* خط فاصل */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                <span style={{ color: 'rgba(232,228,255,.25)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>or sign in</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
              </div>

              <form onSubmit={handleLogin}>
                <Field label="Email Address" icon={<Mail size={15} />}>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com" style={inputStyle} autoComplete="email" />
                </Field>

                <Field label="Password" icon={<Lock size={15} />}
                  right={
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.35)', padding: '0 12px', display: 'flex' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••" style={inputStyle} autoComplete="current-password" />
                </Field>

                {/* رابط نسيت كلمة المرور */}
                <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -4 }}>
                  <button type="button" onClick={() => { setForgot(true); setForgotEmail(email); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 12, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                    Forgot password?
                  </button>
                </div>

                {/* رسالة الخطأ */}
                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
                    <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} style={btnStyle('primary')}>
                  {loading
                    ? <><Loader2 size={16} style={spin} /> Signing in…</>
                    : <><ArrowRight size={16} /> Sign In</>}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(232,228,255,.35)', fontSize: 13 }}>
                No account?{' '}
                <Link to="/signup" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
                  Create one free →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin-anim { to { transform: rotate(360deg); } }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 40px #0d0d20 inset !important; -webkit-text-fill-color: #e8e4ff !important; }
        input::placeholder { color: rgba(232,228,255,.25) !important; }
      `}</style>
    </div>
  );
}

// ── مكونات مساعدة داخلية ─────────────────────────────────────────────────────
function Field({ label, icon, right, children }: {
  label: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(232,228,255,.5)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, transition: 'border-color .2s' }}
        onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,.6)'}
        onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.1)'}>
        <span style={{ paddingLeft: 14, color: 'rgba(232,228,255,.3)', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>{children}</div>
        {right}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: 'transparent',
  border: 'none', outline: 'none', color: '#e8e4ff', fontSize: 14,
  fontFamily: 'inherit',
};

function btnStyle(variant: 'primary' | 'secondary' | 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    width: '100%', padding: '13px 20px', borderRadius: 12, fontSize: 14,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
  };
  if (variant === 'primary') return { ...base, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff', boxShadow: '0 4px 20px rgba(109,40,217,.35)' };
  if (variant === 'secondary') return { ...base, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#e8e4ff' };
  return { ...base, background: 'none', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(232,228,255,.5)', width: 'auto', padding: '12px 20px' };
}

const spin: React.CSSProperties = { animation: 'spin-anim 1s linear infinite' };
