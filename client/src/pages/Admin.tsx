import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LogoFull from '../components/LogoFull';
import {
  Users, ShieldCheck, BarChart2, Bell, RefreshCw,
  CheckCircle, XCircle, Clock, Ban, UserCheck,
  Smartphone, Search, ChevronDown, AlertTriangle,
  TrendingUp, Package, DollarSign, Cpu
} from 'lucide-react';

const API = (path: string) => {
  const token = localStorage.getItem('af_session_token') || '';
  return { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
};

async function adminFetch(resource: string, extra = '') {
  const r = await fetch(`/api/admin?resource=${resource}${extra}`, API(''));
  return r.json();
}
async function adminPost(body: any) {
  const r = await fetch('/api/admin', { method: 'PUT', ...API(''), body: JSON.stringify(body) });
  return r.json();
}

// ── Type defs ─────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string; email: string; status: string; created_at: string;
  profile: { full_name: string; phone: string; company: string; role: string } | null;
  subscription: { plan: string; trial_end: string } | null;
}
interface DeviceSession {
  id: string; user_id: string; fingerprint: string; browser: string;
  os: string; ip: string; last_login: string; active: boolean;
}
interface AdminStats {
  total_users: number; total_orders: number; orders_today: number;
  active_trials: number; paid_subscriptions: number; total_revenue: number;
  plan_distribution: Record<string, number>;
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:  ['#0fcc7a', 'rgba(15,204,122,.12)'],
    trial:   ['#f59e0b', 'rgba(245,158,11,.12)'],
    expired: ['#f53b3b', 'rgba(245,59,59,.12)'],
    banned:  ['#6b7280', 'rgba(107,114,128,.12)'],
    pending: ['#a78bfa', 'rgba(167,139,250,.12)'],
  };
  const [color, bg] = map[status] || map.pending;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize' }}>{status}</span>
  );
}

// ── Plan badge ─────────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, [string, string]> = {
    trial:        ['#a78bfa', 'rgba(167,139,250,.12)'],
    basic:        ['#38bdf8', 'rgba(56,189,248,.12)'],
    professional: ['#6d28d9', 'rgba(109,40,217,.12)'],
    enterprise:   ['#f59e0b', 'rgba(245,158,11,.12)'],
    demo:         ['#9ca3af', 'rgba(156,163,175,.1)'],
  };
  const [color, bg] = map[plan] || map.trial;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize' }}>{plan}</span>
  );
}

// ── Days remaining ─────────────────────────────────────────────────────────────
function daysLeft(trialEnd: string | undefined): number {
  if (!trialEnd) return 0;
  return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000));
}

// ── Main Admin component ───────────────────────────────────────────────────────
type Tab = 'stats' | 'users' | 'devices' | 'subscriptions' | 'logs';

export default function Admin() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [planModal, setPlanModal] = useState<{ user: AdminUser; plan: string } | null>(null);
  const [extendDays, setExtendDays] = useState(7);

  // Guard: only admin
  useEffect(() => {
    if (user && user.role !== 'admin' && !user.isDemo) navigate('/dashboard');
  }, [user]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'stats')         { const d = await adminFetch('stats');         setStats(d); }
      if (t === 'users')         { const d = await adminFetch('users');         setUsers(d); }
      if (t === 'devices')       { const d = await adminFetch('devices');       setDevices(d); }
      if (t === 'subscriptions') { const d = await adminFetch('subscriptions'); setSubs(d); }
      if (t === 'logs')          { const d = await adminFetch('logs');          setLogs(d); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const setPlan = async (userId: string, plan: string, tenantId?: string) => {
    const r = await adminPost({ action: 'set_plan', user_id: userId, plan, tenant_id: tenantId });
    if (r.ok) { showToast(`Plan set to ${plan}`); load('users'); }
    else showToast(r.error || 'Failed', 'err');
    setPlanModal(null);
  };

  const banUser = async (userId: string, ban: boolean) => {
    const r = await adminPost({ action: ban ? 'ban_user' : 'unban_user', user_id: userId });
    if (r.ok) { showToast(ban ? 'User banned' : 'User unbanned'); load('users'); }
    else showToast(r.error || 'Failed', 'err');
  };

  const banDevice = async (fingerprint: string) => {
    const r = await adminPost({ action: 'ban_device', fingerprint });
    if (r.ok) { showToast('Device banned'); load('devices'); }
    else showToast(r.error || 'Failed', 'err');
  };

  const extendTrial = async (userId: string, days: number) => {
    const r = await adminPost({ action: 'extend_trial', user_id: userId, days });
    if (r.ok) { showToast(`Trial extended by ${days} days`); load('users'); }
    else showToast(r.error || 'Failed', 'err');
  };

  const activateOffer = async (subId: string, accept: boolean) => {
    const r = await adminPost({ action: accept ? 'activate_offer' : 'reject_offer', subscription_id: subId });
    if (r.ok) { showToast(accept ? 'Offer activated ✅' : 'Offer rejected'); load('subscriptions'); }
    else showToast(r.error || 'Failed', 'err');
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const Sfn = {
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? 'linear-gradient(135deg,#6d28d9,#8b5cf6)' : 'transparent', color: active ? '#fff' : 'rgba(221,217,245,.5)', transition: 'all .2s', fontFamily: 'inherit' }),
    btn: (color = '#6d28d9'): React.CSSProperties => ({ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: `${color}22`, color, fontFamily: 'inherit', transition: 'all .2s' }),
  };
  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#05050f', color: '#ddd9f5', fontFamily: "'DM Sans',sans-serif", padding: '24px' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    title: { fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff' },
    tabs: { display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,.07)', flexWrap: 'wrap' },
    card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '22px 24px' },
    statCard: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '20px 22px' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'rgba(221,217,245,.35)', padding: '10px 14px', textAlign: 'left' as const, borderBottom: '1px solid rgba(255,255,255,.06)' },
    td: { fontSize: 13, color: 'rgba(221,217,245,.75)', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', verticalAlign: 'middle' as const },
    input: { padding: '9px 14px 9px 40px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', width: 280 },
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, padding: '12px 20px', borderRadius: 12, background: toast.type === 'ok' ? 'rgba(15,204,122,.9)' : 'rgba(245,59,59,.9)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.3)', backdropFilter: 'blur(12px)' }}>
          {toast.type === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>⚙️ Admin Panel</h1>
          <p style={{ fontSize: 13, color: 'rgba(221,217,245,.4)', marginTop: 3 }}>autoflow platform management</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => load(tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(221,217,245,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(109,40,217,.15)', border: '1px solid rgba(109,40,217,.3)', color: '#a78bfa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...S.tabs, marginBottom: 28 }}>
        {([['stats','📊 Stats'],['users','👥 Users'],['devices','💻 Devices'],['subscriptions','💳 Subscriptions'],['logs','📋 Logs']] as [Tab,string][]).map(([t,l])=>(
          <button key={t} onClick={() => setTab(t)} style={Sfn.tab(tab===t)}>{l}</button>
        ))}
      </div>

      {/* ══ STATS ══ */}
      {tab === 'stats' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { icon: <Users size={20} style={{ color: '#a78bfa' }}/>, label: 'Total Users', value: stats?.total_users ?? '—', color: '#a78bfa' },
              { icon: <Package size={20} style={{ color: '#38bdf8' }}/>, label: 'Total Orders', value: stats?.total_orders ?? '—', color: '#38bdf8' },
              { icon: <TrendingUp size={20} style={{ color: '#0fcc7a' }}/>, label: 'Orders Today', value: stats?.orders_today ?? '—', color: '#0fcc7a' },
              { icon: <Clock size={20} style={{ color: '#f59e0b' }}/>, label: 'Active Trials', value: stats?.active_trials ?? '—', color: '#f59e0b' },
              { icon: <ShieldCheck size={20} style={{ color: '#6d28d9' }}/>, label: 'Paid Subs', value: stats?.paid_subscriptions ?? '—', color: '#6d28d9' },
              { icon: <DollarSign size={20} style={{ color: '#10b981' }}/>, label: 'Revenue (DZD)', value: stats?.total_revenue ? `${(stats.total_revenue/1000).toFixed(0)}K` : '—', color: '#10b981' },
            ].map((s,i) => (
              <div key={i} style={S.statCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                  <span style={{ fontSize: 11, color: 'rgba(221,217,245,.35)', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</span>
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, fontWeight: 800, color: '#fff' }}>{loading ? '…' : String(s.value)}</div>
              </div>
            ))}
          </div>

          {/* Plan distribution */}
          {stats?.plan_distribution && (
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Plan Distribution</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(stats.plan_distribution).map(([plan, count]) => (
                  <div key={plan} style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', textAlign: 'center' }}>
                    <PlanBadge plan={plan} />
                    <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 8 }}>{count}</div>
                    <div style={{ fontSize: 11, color: 'rgba(221,217,245,.4)' }}>users</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ USERS ══ */}
      {tab === 'users' && (
        <div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(221,217,245,.35)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={S.input} />
          </div>

          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>Users ({filteredUsers.length})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Name','Email','Plan','Trial Left','Status','Registered','Actions'].map(h=>(
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 32, color: 'rgba(221,217,245,.35)' }}>Loading…</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 32, color: 'rgba(221,217,245,.35)' }}>No users found</td></tr>
                  ) : filteredUsers.map(u => {
                    const days = daysLeft(u.subscription?.trial_end);
                    const plan = u.subscription?.plan ?? 'trial';
                    const status = u.status === 'active' ? (plan === 'trial' && days === 0 ? 'expired' : plan === 'trial' ? 'trial' : 'active') : u.status;
                    return (
                      <tr key={u.id}>
                        <td style={S.td}><span style={{ fontWeight: 600, color: '#fff' }}>{u.profile?.full_name || '—'}</span></td>
                        <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.email}</span></td>
                        <td style={S.td}><PlanBadge plan={plan} /></td>
                        <td style={S.td}>
                          {plan === 'trial' ? (
                            <span style={{ fontSize: 12, color: days > 3 ? '#0fcc7a' : days > 0 ? '#f59e0b' : '#f53b3b', fontWeight: 600 }}>
                              {days > 0 ? `${days} days` : 'Expired'}
                            </span>
                          ) : <span style={{ color: 'rgba(221,217,245,.3)' }}>—</span>}
                        </td>
                        <td style={S.td}><StatusBadge status={status} /></td>
                        <td style={S.td}><span style={{ fontSize: 12, color: 'rgba(221,217,245,.4)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</span></td>
                        <td style={{ ...S.td }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {/* Change plan */}
                            <select onChange={e => { if (e.target.value) { setPlanModal({ user: u, plan: e.target.value }); setPlan(u.id, e.target.value, u.subscription?.plan); e.target.value = ''; } }}
                              defaultValue="" style={{ ...Sfn.btn('#6d28d9'), appearance: 'none', paddingRight: 8, cursor: 'pointer' }}>
                              <option value="" disabled>Set plan</option>
                              {['trial','basic','professional','enterprise'].map(p=><option key={p} value={p}>{p}</option>)}
                            </select>
                            {/* Extend trial */}
                            <button onClick={() => extendTrial(u.id, 7)} style={Sfn.btn('#f59e0b')} title="Extend trial +7 days">+7d</button>
                            <button onClick={() => extendTrial(u.id, 30)} style={Sfn.btn('#f59e0b')} title="Extend trial +30 days">+30d</button>
                            {/* Ban/unban */}
                            {u.status === 'banned' ? (
                              <button onClick={() => banUser(u.id, false)} style={Sfn.btn('#0fcc7a')} title="Unban user"><UserCheck size={12}/></button>
                            ) : (
                              <button onClick={() => banUser(u.id, true)} style={Sfn.btn('#f53b3b')} title="Ban user"><Ban size={12}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ DEVICES ══ */}
      {tab === 'devices' && (
        <div style={S.card}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            <Cpu size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#a78bfa' }}/>
            Registered Devices ({devices.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['User','Fingerprint','Browser','OS','IP','Last Login','Active','Actions'].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', padding: 32 }}>Loading…</td></tr>
                ) : devices.length === 0 ? (
                  <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', padding: 32, color: 'rgba(221,217,245,.35)' }}>No devices found. Device tracking will be populated as users log in.</td></tr>
                ) : devices.map((d, i) => (
                  <tr key={i}>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.user_id?.slice(0,8)}…</span></td>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#a78bfa' }}>{d.fingerprint?.slice(0,16)}…</span></td>
                    <td style={S.td}>{d.browser || '—'}</td>
                    <td style={S.td}>{d.os || '—'}</td>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.ip || '—'}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12, color: 'rgba(221,217,245,.4)' }}>{d.last_login ? new Date(d.last_login).toLocaleDateString() : '—'}</span></td>
                    <td style={S.td}><StatusBadge status={d.active ? 'active' : 'banned'} /></td>
                    <td style={S.td}>
                      <button onClick={() => banDevice(d.fingerprint)} style={Sfn.btn('#f53b3b')} title="Ban this device">
                        <Ban size={12}/> Ban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SUBSCRIPTIONS / OFFERS ══ */}
      {tab === 'subscriptions' && (
        <div style={S.card}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            💳 Subscriptions & Offer Requests
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>{['User','Plan','Status','Amount','Trial End','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 32 }}>Loading…</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 32, color: 'rgba(221,217,245,.35)' }}>No subscriptions yet</td></tr>
                ) : subs.map((s, i) => (
                  <tr key={i}>
                    <td style={S.td}><span style={{ fontSize: 12 }}>{s.user_email || s.id?.slice(0,8)}</span></td>
                    <td style={S.td}><PlanBadge plan={s.plan} /></td>
                    <td style={S.td}><StatusBadge status={s.status} /></td>
                    <td style={S.td}>{s.amount ? <span style={{ fontWeight: 600, color: '#0fcc7a' }}>{s.amount.toLocaleString()} DZD</span> : <span style={{ color: 'rgba(221,217,245,.3)' }}>Free</span>}</td>
                    <td style={S.td}><span style={{ fontSize: 12, color: 'rgba(221,217,245,.4)' }}>{s.trial_end ? new Date(s.trial_end).toLocaleDateString() : '—'}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => activateOffer(s.id, true)} style={Sfn.btn('#0fcc7a')}>
                          <CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}/>Activate
                        </button>
                        <button onClick={() => activateOffer(s.id, false)} style={Sfn.btn('#f53b3b')}>
                          <XCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}/>Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ LOGS ══ */}
      {tab === 'logs' && (
        <div style={S.card}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>📋 Activity Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>{['Time','User','Action','Entity','IP'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 32 }}>Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 32, color: 'rgba(221,217,245,.35)' }}>No logs yet</td></tr>
                ) : logs.slice(0,100).map((l, i) => (
                  <tr key={i}>
                    <td style={S.td}><span style={{ fontSize: 11, color: 'rgba(221,217,245,.4)', fontFamily: 'monospace' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</span></td>
                    <td style={S.td}><span style={{ fontSize: 11, fontFamily: 'monospace', color: '#a78bfa' }}>{l.user_id?.slice(0,8) || 'system'}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12, fontWeight: 500 }}>{l.action}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12, color: 'rgba(221,217,245,.45)' }}>{l.entity} {l.entity_id ? `(${l.entity_id.slice(0,8)})` : ''}</span></td>
                    <td style={S.td}><span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(221,217,245,.35)' }}>{l.ip_address || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
