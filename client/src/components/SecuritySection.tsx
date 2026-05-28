import { useState } from 'react';
import { Key, Smartphone, Monitor, Trash2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import PasswordStrength from './PasswordStrength';
import TwoFactorSetup from './TwoFactorSetup';
import { toast } from './Toast';

interface Props { token: string; profile: any; devices: any[]; onRefreshDevices: () => void }

export default function SecuritySection({ token, profile, devices, onRefreshDevices }: Props) {
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(profile?.totp_enabled || false);
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function changePassword() {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match.'); return; }
    if (pw.newPw.length < 8) { toast.error('Min 8 characters.'); return; }
    setPwLoading(true);
    try {
      const r = await fetch('/api/auth/change-password', { method: 'POST', headers: h, body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }) });
      const d = await r.json();
      if (r.ok) { toast.success('Password updated!'); setPw({ current: '', newPw: '', confirm: '' }); }
      else toast.error(d.error || 'Failed');
    } finally { setPwLoading(false); }
  }

  async function revokeDevice(id: string) {
    await fetch('/api/admin/devices/' + id, { method: 'DELETE', headers: h }).catch(() => {});
    onRefreshDevices();
    toast.success('Session revoked');
  }

  const label = (s: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 6 }}>{s}</div>
  );
  const input = (name: keyof typeof pw, placeholder: string) => (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <input type={showPw[name] ? 'text' : 'password'} value={pw[name]} onChange={e => setPw(p => ({ ...p, [name]: e.target.value }))}
        placeholder={placeholder} style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#e8e4ff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      <button onClick={() => setShowPw(p => ({ ...p, [name]: !p[name] }))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.3)' }}>
        {showPw[name] ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );

  const card = { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20, marginBottom: 16 };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e4ff', margin: '0 0 6px' }}>Security</h2>
      <p style={{ fontSize: 13, color: 'rgba(232,228,255,.4)', margin: '0 0 24px' }}>Protect your account with strong settings.</p>

      {/* Password change */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={18} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e4ff' }}>Change Password</div>
            <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)' }}>Use a strong, unique password</div>
          </div>
        </div>
        {label('Current Password')}
        {input('current', 'Enter current password')}
        {label('New Password')}
        {input('newPw', 'Enter new password (min 8 chars)')}
        {pw.newPw && <PasswordStrength password={pw.newPw} />}
        <div style={{ marginTop: 10 }}>
          {label('Confirm New Password')}
          {input('confirm', 'Confirm new password')}
        </div>
        {pw.confirm && pw.newPw !== pw.confirm && (
          <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>Passwords do not match</div>
        )}
        <button onClick={changePassword} disabled={pwLoading || !pw.current || !pw.newPw || pw.newPw !== pw.confirm}
          style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', opacity: pwLoading ? 0.7 : 1 }}>
          {pwLoading ? 'Updating…' : 'Update Password'}
        </button>
      </div>

      {/* 2FA */}
      <div style={card}>
        <TwoFactorSetup token={token} enabled={totpEnabled} onToggle={setTotpEnabled} />
      </div>

      {/* Active sessions */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e4ff' }}>Active Sessions</div>
            <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)' }}>{devices.length} active session(s)</div>
          </div>
        </div>
        {devices.length === 0 && <div style={{ fontSize: 13, color: 'rgba(232,228,255,.3)', padding: '12px 0' }}>No active sessions found.</div>}
        {devices.map((d, i) => (
          <div key={d.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
            <Smartphone size={18} style={{ color: 'rgba(232,228,255,.3)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e4ff' }}>{d.browser || 'Unknown browser'} · {d.os || 'Unknown OS'}</div>
              <div style={{ fontSize: 11, color: 'rgba(232,228,255,.3)', marginTop: 2 }}>
                {d.ip && `IP: ${d.ip} · `}Last active: {d.last_login ? new Date(d.last_login).toLocaleString() : 'Unknown'}
              </div>
            </div>
            <button onClick={() => revokeDevice(d.id)} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
