/**
 * AdminPanel.tsx — Full admin dashboard with user mgmt, stats, devices
 */
import { useState, useEffect } from 'react';
import { Users, BarChart2, Shield, HardDrive, RefreshCw, Ban,
  CheckCircle, Clock, ChevronDown, Search, TrendingUp } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import SkeletonTable from './SkeletonTable';
import { toast } from './Toast';

interface AdminStats {
  total_users: number; total_orders: number; orders_today: number;
  active_trials: number; paid_subscriptions: number; total_revenue: number;
  plan_distribution: Record<string, number>;
}
interface AdminUser {
  id: string; email: string; status: string; created_at: string;
  profile: any; subscription: any;
}

export default function AdminPanel({ token }: { token: string }) {
  const [tab, setTab] = useState<'stats'|'users'|'devices'|'logs'>('stats');
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{msg:string;cb:()=>void}|null>(null);

  const h = { 'Content-Type':'application/json', Authorization:`Bearer ${token || localStorage.getItem('af_session_token') || ''}` };

  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadTab(t: string) {
    setLoading(true);
    try {
      if (t === 'stats' || t === 'users') {
        const [sr, ur] = await Promise.all([
          fetch('/api/admin?resource=stats', { headers: h }),
          fetch('/api/admin?resource=users&limit=200', { headers: h }),
        ]);
        if (sr.ok) setStats(await sr.json());
        if (ur.ok) setUsers(await ur.json());
      }
      if (t === 'devices') {
        const r = await fetch('/api/admin/devices', { headers: h });
        if (r.ok) setDevices(await r.json());
      }
      if (t === 'logs') {
        const r = await fetch('/api/logs?limit=100', { headers: h });
        if (r.ok) setLogs(await r.json());
      }
    } finally { setLoading(false); }
  }

  async function adminAction(action: string, payload: object) {
    const r = await fetch('/api/admin/action', { method:'POST', headers:h, body:JSON.stringify({ action, ...payload }) });
    if (r.ok) { toast.success('Done!'); loadTab(tab); }
    else toast.error('Action failed.');
  }

  const filtered = users.filter(u =>
    !search || u.email.includes(search) || u.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_PILL = ({ s }: { s: string }) => {
    const c: Record<string,string> = { active:'#22c55e', banned:'#ef4444', pending:'#f59e0b', trial:'#3b82f6', expired:'#6b7280' };
    return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:`${c[s]||'#888'}20`, color:c[s]||'#888', textTransform:'uppercase' }}>{s}</span>;
  };

  const TABS = [
    { id:'stats',   icon:<BarChart2 size={14}/>,  label:'Stats'    },
    { id:'users',   icon:<Users size={14}/>,       label:'Users'    },
    { id:'devices', icon:<HardDrive size={14}/>,   label:'Devices'  },
    { id:'logs',    icon:<Shield size={14}/>,      label:'Logs'     },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:'#e8e4ff', padding:0 }}>
      {confirm && <ConfirmModal message={confirm.msg} onConfirm={()=>{confirm.cb();setConfirm(null);}} onCancel={()=>setConfirm(null)} danger confirmLabel="Confirm" />}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:28, background:'rgba(255,255,255,.03)', borderRadius:12, padding:4, border:'1px solid rgba(255,255,255,.07)', width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9,
            border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .15s',
            background: tab===t.id ? 'rgba(124,58,237,.3)' : 'transparent',
            color: tab===t.id ? '#c4b5fd' : 'rgba(232,228,255,.4)',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={()=>loadTab(tab)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(232,228,255,.3)', padding:'8px 10px', borderRadius:9 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── STATS TAB ── */}
      {tab === 'stats' && (
        loading ? <SkeletonTable rows={2} cols={4} /> :
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
            {[
              { label:'Total Users',    value:stats?.total_users??0,        color:'#a78bfa' },
              { label:'Total Orders',   value:stats?.total_orders??0,       color:'#60a5fa' },
              { label:'Today\'s Orders',value:stats?.orders_today??0,       color:'#4ade80' },
              { label:'Active Trials',  value:stats?.active_trials??0,      color:'#fbbf24' },
              { label:'Paid Subs',      value:stats?.paid_subscriptions??0, color:'#f472b6' },
              { label:'Total Revenue',  value:`${((stats?.total_revenue??0)/1000).toFixed(0)}K DZD`, color:'#34d399' },
            ].map(item => (
              <div key={item.label} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:28, fontWeight:800, color:item.color, lineHeight:1 }}>{item.value}</div>
                <div style={{ fontSize:12, color:'rgba(232,228,255,.4)', marginTop:6 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {stats?.plan_distribution && (
            <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:20 }}>
              <h4 style={{ margin:'0 0 16px', fontSize:14, fontWeight:600, color:'rgba(232,228,255,.6)' }}>Plan Distribution</h4>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {Object.entries(stats.plan_distribution).map(([plan, count]) => (
                  <div key={plan} style={{ padding:'8px 16px', borderRadius:8, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)' }}>
                    <span style={{ fontWeight:700, color:'#c4b5fd' }}>{count}</span>
                    <span style={{ color:'rgba(232,228,255,.4)', fontSize:12, marginRight:6 }}> × {plan}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'8px 14px' }}>
            <Search size={15} style={{ color:'rgba(232,228,255,.3)', flexShrink:0 }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by email or name..."
              style={{ background:'none', border:'none', outline:'none', color:'#e8e4ff', fontSize:13, width:'100%' }} />
          </div>
          {loading ? <SkeletonTable rows={6} cols={5} /> : (
            <div style={{ border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'rgba(124,58,237,.08)' }}>
                    {['User','Plan','Status','Joined','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'right', fontWeight:600, fontSize:11, color:'rgba(232,228,255,.4)', textTransform:'uppercase', letterSpacing:'.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{ borderTop:'1px solid rgba(255,255,255,.05)' }}>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{u.email}</div>
                        <div style={{ fontSize:11, color:'rgba(232,228,255,.3)' }}>{u.profile?.full_name || '—'}</div>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(124,58,237,.1)', color:'#c4b5fd', fontWeight:600 }}>
                          {u.subscription?.plan || 'trial'}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px' }}><STATUS_PILL s={u.status} /></td>
                      <td style={{ padding:'11px 14px', color:'rgba(232,228,255,.4)', fontSize:12 }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-DZ') : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          {u.status === 'banned' ? (
                            <button onClick={()=>setConfirm({msg:`Unban ${u.email}?`,cb:()=>adminAction('unban_user',{user_id:u.id})})}
                              style={{ padding:'4px 10px', borderRadius:6, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.2)', color:'#4ade80', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                              Unban
                            </button>
                          ) : (
                            <button onClick={()=>setConfirm({msg:`Ban ${u.email}? This will block their access.`,cb:()=>adminAction('ban_user',{user_id:u.id})})}
                              style={{ padding:'4px 10px', borderRadius:6, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#f87171', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                              Ban
                            </button>
                          )}
                          <button onClick={()=>setConfirm({msg:`Extend trial for ${u.email} by 7 days?`,cb:()=>adminAction('extend_trial',{user_id:u.id,days:7})})}
                            style={{ padding:'4px 10px', borderRadius:6, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', color:'#60a5fa', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                            +7d
                          </button>
                          <select onChange={e=>{ if(e.target.value) { setConfirm({msg:`Set ${u.email} plan to ${e.target.value}?`,cb:()=>adminAction('set_plan',{user_id:u.id,plan:e.target.value})}); e.target.value=''; }}}
                            style={{ padding:'4px 8px', borderRadius:6, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', color:'#c4b5fd', cursor:'pointer', fontSize:11 }}>
                            <option value="">Set Plan</option>
                            {['trial','basic','professional'].map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── DEVICES TAB ── */}
      {tab === 'devices' && (
        loading ? <SkeletonTable rows={5} cols={5} /> : (
          <div style={{ border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'rgba(124,58,237,.08)' }}>
                  {['Fingerprint','Browser','OS','Last Login','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'right', fontWeight:600, fontSize:11, color:'rgba(232,228,255,.4)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} style={{ borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:'#a78bfa' }}>{d.fingerprint?.slice(0,16)}…</td>
                    <td style={{ padding:'11px 14px' }}>{d.browser || '—'}</td>
                    <td style={{ padding:'11px 14px' }}>{d.os || '—'}</td>
                    <td style={{ padding:'11px 14px', color:'rgba(232,228,255,.4)', fontSize:12 }}>
                      {d.last_login ? new Date(d.last_login).toLocaleString('ar-DZ') : '—'}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <button onClick={()=>setConfirm({msg:`Ban device ${d.fingerprint?.slice(0,16)}…?`,cb:()=>adminAction('ban_device',{fingerprint:d.fingerprint})})}
                        style={{ padding:'4px 10px', borderRadius:6, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#f87171', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        Ban Device
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        loading ? <SkeletonTable rows={8} cols={4} /> : (
          <div style={{ border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(124,58,237,.08)' }}>
                  {['Action','Entity','User','Time'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'right', fontWeight:600, fontSize:11, color:'rgba(232,228,255,.4)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} style={{ borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding:'9px 14px', color:'#e8e4ff' }}>{l.action}</td>
                    <td style={{ padding:'9px 14px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'rgba(124,58,237,.1)', color:'#a78bfa' }}>{l.entity}</span></td>
                    <td style={{ padding:'9px 14px', fontFamily:'monospace', fontSize:10, color:'rgba(232,228,255,.3)' }}>{l.user_id?.slice(0,8)}…</td>
                    <td style={{ padding:'9px 14px', color:'rgba(232,228,255,.3)' }}>{l.created_at ? new Date(l.created_at).toLocaleString('ar-DZ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
