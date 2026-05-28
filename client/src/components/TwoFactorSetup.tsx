/**
 * TwoFactorSetup — إعداد المصادقة الثنائية
 */
import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, QrCode } from 'lucide-react';

interface Props { token: string; enabled: boolean; onToggle: (v: boolean) => void }

export default function TwoFactorSetup({ token, enabled, onToggle }: Props) {
  const [step, setStep] = useState<'idle'|'qr'|'verify'|'disable'>('idle');
  const [qrData, setQrData] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function startSetup() {
    setLoading(true); setError('');
    const r = await fetch('/api/2fa/setup', { headers: h });
    const d = await r.json();
    setQrData(d.uri); setSecret(d.secret);
    setStep('qr'); setLoading(false);
  }

  async function verifyCode() {
    setLoading(true); setError('');
    const r = await fetch('/api/2fa/verify', { method: 'POST', headers: h, body: JSON.stringify({ token: code }) });
    const d = await r.json();
    if (r.ok) { onToggle(true); setStep('idle'); setCode(''); }
    else { setError(d.error || 'Invalid code'); }
    setLoading(false);
  }

  async function disableCode() {
    setLoading(true); setError('');
    const r = await fetch('/api/2fa', { method: 'DELETE', headers: h, body: JSON.stringify({ token: code }) });
    const d = await r.json();
    if (r.ok) { onToggle(false); setStep('idle'); setCode(''); }
    else { setError(d.error || 'Invalid code'); }
    setLoading(false);
  }

  const s = {
    card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20 },
    label: { fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase' as const, letterSpacing: '.08em' },
    input: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#e8e4ff', fontSize: 15, outline: 'none', letterSpacing: '.2em', textAlign: 'center' as const },
    btn: (primary = true) => ({ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: primary ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,.06)', color: '#fff' }),
  };

  return (
    <div>
      {step === 'idle' && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {enabled ? <ShieldCheck size={24} style={{ color: '#4ade80' }} /> : <Shield size={24} style={{ color: 'rgba(232,228,255,.3)' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e4ff' }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)', marginTop: 2 }}>
                {enabled ? 'Your account is protected with 2FA' : 'Add an extra layer of security to your account'}
              </div>
            </div>
          </div>
          {enabled ? (
            <button onClick={() => setStep('disable')} style={s.btn(false)}>
              <ShieldOff size={13} style={{ display: 'inline', marginLeft: 6 }} /> Disable
            </button>
          ) : (
            <button onClick={startSetup} disabled={loading} style={s.btn()}>
              {loading ? 'Loading…' : 'Enable 2FA'}
            </button>
          )}
        </div>
      )}

      {step === 'qr' && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8e4ff' }}>Scan QR Code</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,228,255,.5)' }}>
            Open Google Authenticator or Authy and scan this QR code, or enter the secret key manually.
          </p>
          {/* QR code via Google Charts API */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: '#fff', borderRadius: 12, width: 'fit-content', margin: '0 auto' }}>
            <img src={`https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(qrData)}`}
              alt="QR Code" width={200} height={200} style={{ imageRendering: 'pixelated' }} />
          </div>
          <div style={{ ...s.card, padding: '12px 16px' }}>
            <div style={{ ...s.label, marginBottom: 6 }}>Manual entry key</div>
            <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#a78bfa', letterSpacing: '.15em', wordBreak: 'break-all' }}>{secret}</code>
          </div>
          <div>
            <div style={{ ...s.label, marginBottom: 8 }}>Enter the 6-digit code to confirm</div>
            <input style={s.input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
          </div>
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={verifyCode} disabled={loading || code.length < 6} style={s.btn()}>
              {loading ? 'Verifying…' : 'Activate 2FA'}
            </button>
            <button onClick={() => { setStep('idle'); setCode(''); setError(''); }} style={s.btn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f87171' }}>Disable 2FA</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,228,255,.5)' }}>Enter your authenticator code to confirm.</p>
          <input style={s.input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={disableCode} disabled={loading || code.length < 6}
              style={{ ...s.btn(false), background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>
              {loading ? 'Disabling…' : 'Disable 2FA'}
            </button>
            <button onClick={() => { setStep('idle'); setCode(''); setError(''); }} style={s.btn(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
