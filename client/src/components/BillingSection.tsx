import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star, TrendingUp } from 'lucide-react';

const PLANS = [
  { key: 'trial', name: 'Starter', price: 0, period: '10 days free', icon: Star, color: '#60a5fa',
    features: ['500 orders/month', '2 stores', 'All Algerian carriers', 'Basic analytics', 'Email support'],
    badge: '', cta: 'Current Plan' },
  { key: 'professional', name: 'Professional', price: 20000, period: '180 days', icon: Zap, color: '#a855f7',
    features: ['Unlimited orders', 'Unlimited stores', 'All carriers + API', 'Advanced analytics', 'AI routing', 'Priority support', 'Webhooks', 'SMS notifications'],
    badge: 'Most Popular', cta: 'Upgrade Now' },
  { key: 'vip', name: 'VIP Lifetime', price: 45000, period: '5.5 years', icon: Crown, color: '#f59e0b',
    features: ['Everything in Pro', 'Lifetime access', 'White-label option', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Custom domain'],
    badge: 'Best Value', cta: 'Get Lifetime Access' },
];

interface Props { token: string; currentPlan: string; trialEnd?: string; ordersUsed?: number }

export default function BillingSection({ token, currentPlan, trialEnd, ordersUsed = 0 }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [usage, setUsage] = useState({ orders: ordersUsed, limit: 500 });

  useEffect(() => {
    fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d) && d.length) setPlans(d); })
      .catch(() => {});
    // Fetch usage
    fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        setUsage({ orders: d.totalOrders || 0, limit: currentPlan === 'professional' || currentPlan === 'vip' ? -1 : 500 });
      }).catch(() => {});
  }, []);

  const daysLeft = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e4ff', margin: '0 0 6px' }}>Billing & Plans</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,228,255,.4)', margin: 0 }}>Manage your subscription and usage.</p>
      </div>

      {/* Current usage card */}
      {currentPlan === 'trial' && (
        <div style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e4ff' }}>Trial Status</div>
              <div style={{ fontSize: 13, color: 'rgba(232,228,255,.5)', marginTop: 2 }}>{daysLeft} days remaining in your trial</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: daysLeft <= 3 ? '#f87171' : '#60a5fa' }}>{daysLeft}d</div>
          </div>
          {/* Trial progress bar */}
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 100, height: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(5, (daysLeft/10)*100)}%`, background: daysLeft <= 3 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius: 100, transition: 'width .5s' }} />
          </div>
        </div>
      )}

      {/* Usage */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(232,228,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Monthly Usage</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#e8e4ff' }}>Orders</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>
            {usage.orders.toLocaleString()} {usage.limit > 0 ? `/ ${usage.limit.toLocaleString()}` : '/ ∞'}
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: usage.limit > 0 ? `${Math.min(100, (usage.orders/usage.limit)*100)}%` : '30%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 100 }} />
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key || (currentPlan === 'vip' && plan.key === 'vip');
          const Icon = plan.icon;
          return (
            <div key={plan.key} style={{ background: isCurrent ? `${plan.color}08` : 'rgba(255,255,255,.02)', border: `2px solid ${isCurrent ? plan.color + '60' : 'rgba(255,255,255,.07)'}`, borderRadius: 18, padding: 24, position: 'relative', transition: 'all .2s' }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, right: 16, background: plan.color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: plan.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} style={{ color: plan.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#e8e4ff' }}>{plan.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,228,255,.4)' }}>{plan.period}</div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: plan.price === 0 ? 22 : 28, fontWeight: 800, color: plan.color }}>
                  {plan.price === 0 ? 'Free' : plan.price.toLocaleString() + ' DZD'}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(232,228,255,.7)' }}>
                    <Check size={14} style={{ color: plan.color, flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <button disabled={isCurrent} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: isCurrent ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, background: isCurrent ? 'rgba(255,255,255,.06)' : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, color: isCurrent ? 'rgba(232,228,255,.4)' : '#fff', transition: 'opacity .2s' }}
                onClick={() => !isCurrent && alert('Contact us to upgrade: support@autoflow.dz')}>
                {isCurrent ? '✓ Current Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, fontSize: 12, color: 'rgba(232,228,255,.35)', lineHeight: 1.6 }}>
        💡 To upgrade your plan, contact us via WhatsApp or email at <strong style={{ color: '#a78bfa' }}>support@autoflow.dz</strong>. Payment via CCP, Baridimob, or bank transfer.
      </div>
    </div>
  );
}
