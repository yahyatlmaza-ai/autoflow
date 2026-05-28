import { useState, useEffect } from 'react';
import { Zap, Bell, RefreshCw, Brain, Save, Loader2, MessageSquare, Tag } from 'lucide-react';
import { toast } from './Toast';

interface Settings {
  auto_generate_labels: boolean;
  auto_send_sms: boolean;
  auto_retry_failed: boolean;
  ai_routing_enabled: boolean;
  sms_provider: string;
  sms_api_key: string;
  sms_sender_id: string;
}

export default function AutomationSettings({ token }: { token: string }) {
  const [settings, setSettings] = useState<Settings>({ auto_generate_labels: false, auto_send_sms: false, auto_retry_failed: false, ai_routing_enabled: false, sms_provider: 'none', sms_api_key: '', sms_sender_id: 'autoflow' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testingPhone, setTestingPhone] = useState(false);
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/settings', { headers: h }).then(r => r.json()).then(d => {
      if (d) setSettings(s => ({ ...s, ...d }));
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/settings/automation', { method: 'PUT', headers: h, body: JSON.stringify(settings) });
      if (r.ok) toast.success('Settings saved!');
      else toast.error('Failed to save');
    } finally { setSaving(false); }
  }

  async function testSMS() {
    if (!testPhone) return;
    setTestingPhone(true);
    try {
      const r = await fetch('/api/sms/test', { method: 'POST', headers: h, body: JSON.stringify({ phone: testPhone }) });
      const d = await r.json();
      d.success ? toast.success('SMS sent successfully!') : toast.error('SMS failed: ' + d.error);
    } finally { setTestingPhone(false); }
  }

  const toggle = (key: keyof Settings) => setSettings(s => ({ ...s, [key]: !s[key as keyof typeof s] }));
  const set = (key: keyof Settings, val: string) => setSettings(s => ({ ...s, [key]: val }));

  const ToggleRow = ({ icon: Icon, color, title, desc, field }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e4ff' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <button onClick={() => toggle(field)} style={{ width: 48, height: 26, borderRadius: 13, background: settings[field as keyof Settings] ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: settings[field as keyof Settings] ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(232,228,255,.3)', fontSize: 14 }}>Loading settings…</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e4ff', margin: '0 0 6px' }}>Automation</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,228,255,.4)', margin: 0 }}>All settings are real — they affect actual platform behavior.</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '0 20px 4px', marginBottom: 20 }}>
        <ToggleRow icon={Tag} color="#22c55e" title="Auto-generate Labels" field="auto_generate_labels"
          desc="Automatically generate shipping label PDF when order is confirmed or shipped." />
        <ToggleRow icon={MessageSquare} color="#3b82f6" title="Auto-send Tracking SMS" field="auto_send_sms"
          desc="Send SMS to customer when order is shipped or out for delivery." />
        <ToggleRow icon={RefreshCw} color="#f97316" title="Auto-retry Failed Deliveries" field="auto_retry_failed"
          desc="Automatically reschedule failed deliveries after 24 hours." />
        <ToggleRow icon={Brain} color="#a855f7" title="AI-powered Carrier Routing" field="ai_routing_enabled"
          desc="Use historical delivery data to assign the best carrier for each wilaya automatically." />
      </div>

      {/* SMS Config */}
      {settings.auto_send_sms && (
        <div style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#60a5fa', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} /> SMS Provider Configuration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Provider</div>
              <select value={settings.sms_provider} onChange={e => set('sms_provider', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: '#e8e4ff', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                <option value="none">None (dev mode — log only)</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom HTTP API</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Sender ID</div>
              <input value={settings.sms_sender_id} onChange={e => set('sms_sender_id', e.target.value)}
                placeholder="autoflow" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#e8e4ff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                {settings.sms_provider === 'twilio' ? 'Twilio AccountSID:AuthToken' : 'API Key or Endpoint URL'}
              </div>
              <input value={settings.sms_api_key} onChange={e => set('sms_api_key', e.target.value)}
                type="password" placeholder={settings.sms_provider === 'twilio' ? 'ACxxxxxxxx:authtoken' : 'Enter API key…'}
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#e8e4ff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {/* SMS Test */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="0551234567"
              style={{ flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#e8e4ff', fontSize: 13, outline: 'none' }} />
            <button onClick={testSMS} disabled={testingPhone || !testPhone}
              style={{ padding: '9px 18px', borderRadius: 9, background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.2)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {testingPhone ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null} Test SMS
            </button>
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />} Save Automation Settings
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
