import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Save, Eye, EyeOff, TestTube } from 'lucide-react';
import { toast } from './Toast';

const CARRIERS = [
  { id:'yalidine',   name:'Yalidine',   logo:'https://yalidine.com/favicon.ico',     color:'#f97316', country:'DZ', website:'https://yalidine.com' },
  { id:'zr_express', name:'ZR Express', logo:'https://procolis.com/favicon.ico',     color:'#3b82f6', country:'DZ', website:'https://procolis.com' },
  { id:'noest',      name:'Noest',      logo:'https://noest.dz/favicon.ico',          color:'#8b5cf6', country:'DZ', website:'https://noest.dz' },
  { id:'amana',      name:'Amana',      logo:'https://amana.dz/favicon.ico',          color:'#22c55e', country:'DZ', website:'https://amana.dz' },
  { id:'ems',        name:'EMS Algeria',logo:'https://www.poste.dz/favicon.ico',      color:'#f59e0b', country:'DZ', website:'https://www.poste.dz' },
  { id:'dhl',        name:'DHL',        logo:'https://www.dhl.com/favicon.ico',       color:'#fbbf24', country:'INT', website:'https://dhl.com' },
  { id:'fedex',      name:'FedEx',      logo:'https://www.fedex.com/favicon.ico',     color:'#7c3aed', country:'INT', website:'https://fedex.com' },
];

interface CarrierConfig { enabled: boolean; api_key: string; api_secret: string; webhook_url: string }
type Configs = Record<string, CarrierConfig>;

export default function CarriersSection({ token }: { token: string }) {
  const [configs, setConfigs] = useState<Configs>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/carrier-configs', { headers: h }).then(r => r.json()).then((data: any[]) => {
      const map: Configs = {};
      for (const c of data) map[c.carrier] = { enabled: c.enabled, api_key: c.api_key || '', api_secret: c.api_secret || '', webhook_url: c.webhook_url || '' };
      setConfigs(map);
    }).catch(() => {});
  }, []);

  function getConfig(name: string): CarrierConfig {
    return configs[name] || { enabled: false, api_key: '', api_secret: '', webhook_url: '' };
  }

  function updateConfig(name: string, field: keyof CarrierConfig, value: string | boolean) {
    setConfigs(p => ({ ...p, [name]: { ...getConfig(name), [field]: value } }));
  }

  async function saveCarrier(name: string) {
    setSaving(name);
    try {
      const cfg = getConfig(name);
      const r = await fetch('/api/carrier-configs', { method: 'PUT', headers: h, body: JSON.stringify({ carrier: name, ...cfg }) });
      if (r.ok) { toast.success(`${name} saved`); setEditing(null); }
      else toast.error('Failed to save');
    } finally { setSaving(null); }
  }

  async function testCarrier(name: string) {
    setTesting(name);
    try {
      const cfg = getConfig(name);
      const r = await fetch('/api/carrier-configs/test', { method: 'POST', headers: h, body: JSON.stringify({ carrier: name, api_key: cfg.api_key }) });
      const d = await r.json();
      setTestResult(p => ({ ...p, [name]: d }));
    } finally { setTesting(null); }
  }

  async function toggleEnabled(name: string) {
    const cfg = { ...getConfig(name), enabled: !getConfig(name).enabled };
    setConfigs(p => ({ ...p, [name]: cfg }));
    await fetch('/api/carrier-configs', { method: 'PUT', headers: h, body: JSON.stringify({ carrier: name, ...cfg }) });
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e4ff', margin: '0 0 6px' }}>Shipping Carriers</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,228,255,.4)', margin: 0 }}>Configure your shipping company integrations. API keys are stored securely.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CARRIERS.map(c => {
          const cfg = getConfig(c.name);
          const isEditing = editing === c.name;
          const tr = testResult[c.name];
          return (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${cfg.enabled ? c.color + '40' : 'rgba(255,255,255,.07)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                {/* Logo */}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: cfg.enabled ? c.color + '15' : 'rgba(255,255,255,.04)', border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={c.logo} alt={c.name} width={24} height={24} style={{ objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:13px;font-weight:800;color:${c.color}">${c.name.slice(0,2).toUpperCase()}</span>`; }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#e8e4ff' }}>{c.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: c.country === 'DZ' ? 'rgba(34,197,94,.1)' : 'rgba(59,130,246,.1)', color: c.country === 'DZ' ? '#4ade80' : '#60a5fa', fontWeight: 700 }}>{c.country}</span>
                    {cfg.enabled && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(34,197,94,.12)', color: '#4ade80', fontWeight: 700 }}>ACTIVE</span>}
                  </div>
                  <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(232,228,255,.3)', textDecoration: 'none' }}>{c.website}</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {tr && (
                    <span style={{ fontSize: 11, color: tr.success ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {tr.success ? <CheckCircle size={12} /> : <XCircle size={12} />} {tr.message}
                    </span>
                  )}
                  <button onClick={() => setEditing(isEditing ? null : c.name)} style={{ padding: '7px 14px', borderRadius: 8, background: isEditing ? 'rgba(124,58,237,.2)' : 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#e8e4ff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    {isEditing ? 'Close' : 'Configure'}
                  </button>
                  {/* Toggle switch */}
                  <button onClick={() => toggleEnabled(c.name)} style={{ width: 44, height: 24, borderRadius: 12, background: cfg.enabled ? c.color : 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: cfg.enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
                  </button>
                </div>
              </div>
              {isEditing && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ key: 'api_key', label: 'API Key / ID', placeholder: 'Enter API key…', secret: true },
                      { key: 'api_secret', label: 'API Secret / Token', placeholder: 'Enter secret…', secret: true },
                      { key: 'webhook_url', label: 'Webhook URL (optional)', placeholder: 'https://…', secret: false }].map(f => (
                      <div key={f.key} style={{ gridColumn: f.key === 'webhook_url' ? '1/-1' : 'auto' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{f.label}</div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={f.secret && !showKey[c.name + f.key] ? 'password' : 'text'}
                            value={(cfg as any)[f.key]}
                            onChange={e => updateConfig(c.name, f.key as keyof CarrierConfig, e.target.value)}
                            placeholder={f.placeholder}
                            style={{ width: '100%', padding: '9px 36px 9px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#e8e4ff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                          />
                          {f.secret && (
                            <button onClick={() => setShowKey(p => ({ ...p, [c.name + f.key]: !p[c.name + f.key] }))}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,228,255,.3)', padding: 0 }}>
                              {showKey[c.name + f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveCarrier(c.name)} disabled={saving === c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {saving === c.name ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />} Save
                    </button>
                    <button onClick={() => testCarrier(c.name)} disabled={testing === c.name || !cfg.api_key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.2)', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !cfg.api_key ? 0.5 : 1 }}>
                      {testing === c.name ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube size={13} />} Test Connection
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
