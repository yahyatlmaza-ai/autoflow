/**
 * DeviceGuard.tsx
 * Wraps protected pages — blocks access if:
 * 1. Trial expired
 * 2. Device is banned
 * 3. Account is suspended
 */
import { useEffect, useState, ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface Props { children: ReactNode; }

export default function DeviceGuard({ children }: Props) {
  const { user, token } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'ok' | 'expired' | 'banned' | 'checking'>('checking');

  useEffect(() => {
    if (!user || user.isDemo) { setStatus('ok'); return; }
    checkAccess();
  }, [user, token]);

  async function checkAccess() {
    try {
      const res = await fetch('/api/trial/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { setStatus('ok'); return; }
      const data = await res.json();

      if (data.plan === 'banned') { setStatus('banned'); return; }
      if (data.plan === 'trial' && data.daysLeft === 0 && !data.active) {
        setStatus('expired'); return;
      }
      setStatus('ok');
    } catch { setStatus('ok'); }
  }

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: '#05050f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(109,40,217,.3)', borderTopColor: '#6d28d9', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: 'rgba(221,217,245,.4)', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (status === 'banned') {
    return (
      <div style={{ minHeight: '100vh', background: '#05050f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚫</div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Account Suspended</h2>
          <p style={{ color: 'rgba(221,217,245,.5)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>Your account has been suspended. Please contact support for assistance.</p>
          <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 100, background: 'linear-gradient(135deg,#128c3b,#25d366)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            💬 Contact Support on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={{ minHeight: '100vh', background: '#05050f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap');`}</style>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-.02em' }}>Your Free Trial Has Ended</h2>
            <p style={{ color: 'rgba(221,217,245,.5)', fontSize: 15, lineHeight: 1.72, marginBottom: 32, fontWeight: 300 }}>
              Your 10-day free trial has expired. Upgrade your plan to continue using autoflow and access all your orders, analytics, and automation tools.
            </p>

            {/* Plans */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
              <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: '20px 16px', textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: 'rgba(221,217,245,.45)', marginBottom: 4, fontWeight: 600 }}>Basic</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>20,000 <span style={{ fontSize: 13, color: 'rgba(221,217,245,.4)' }}>DZD</span></div>
                <div style={{ fontSize: 11, color: 'rgba(221,217,245,.35)', marginBottom: 14 }}>per month</div>
                <a href="https://wa.me/213794157508?text=I want to upgrade to Basic plan" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '8px', borderRadius: 100, background: 'rgba(109,40,217,.2)', color: '#a78bfa', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Get Basic
                </a>
              </div>
              <div style={{ border: '1px solid rgba(109,40,217,.5)', borderRadius: 16, padding: '20px 16px', textAlign: 'left', background: 'rgba(109,40,217,.08)' }}>
                <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4, fontWeight: 700 }}>⭐ Professional</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>30,000 <span style={{ fontSize: 13, color: 'rgba(221,217,245,.4)' }}>DZD</span></div>
                <div style={{ fontSize: 11, color: 'rgba(221,217,245,.35)', marginBottom: 14 }}>per month</div>
                <a href="https://wa.me/213794157508?text=I want to upgrade to Professional plan" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '8px', borderRadius: 100, background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                  Get Pro
                </a>
              </div>
            </div>

            <a href="https://wa.me/213794157508?text=My trial expired, I need help with autoflow" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 100, background: 'linear-gradient(135deg,#128c3b,#25d366)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
              💬 Talk to Sales on WhatsApp
            </a>
            <div>
              <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                style={{ background: 'none', border: 'none', color: 'rgba(221,217,245,.35)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
