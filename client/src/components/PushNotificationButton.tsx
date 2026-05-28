/**
 * PushNotificationButton — زر تفعيل الإشعارات
 */
import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';

interface Props { token: string }

export default function PushNotificationButton({ token }: Props) {
  const [status, setStatus] = useState<'default'|'granted'|'denied'|'unsupported'>('default');
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState('');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported'); return;
    }
    setStatus(Notification.permission as 'granted'|'denied'|'default');
    // Fetch VAPID key
    fetch('/api/push/vapid-key').then(r => r.json()).then(d => setVapidKey(d.publicKey || ''));
  }, []);

  async function subscribe() {
    if (!vapidKey || status === 'denied') return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: btoa(Array.from(new Uint8Array(sub.getKey('p256dh')!)).map(b => String.fromCharCode(b)).join('')),
      auth: btoa(Array.from(new Uint8Array(sub.getKey('auth')!)).map(b => String.fromCharCode(b)).join('')) }, userAgent: navigator.userAgent }),
      });
      setStatus('granted');
    } finally { setLoading(false); }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus('default');
    } finally { setLoading(false); }
  }

  async function testPush() {
    await fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  }

  if (status === 'unsupported') {
    return <div style={{ fontSize: 12, color: 'rgba(232,228,255,.4)', padding: '8px 12px' }}>Push notifications not supported</div>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {status === 'granted' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
            <Check size={14} /> Push enabled
          </div>
          <button onClick={testPush} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)', color: '#a78bfa', fontSize: 12, cursor: 'pointer' }}>Test</button>
          <button onClick={unsubscribe} disabled={loading} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
            <BellOff size={13} />
          </button>
        </>
      ) : (
        <button onClick={subscribe} disabled={loading || status === 'denied' || !vapidKey} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10,
          background: status === 'denied' ? 'rgba(239,68,68,.08)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
          border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: status === 'denied' ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>
          <Bell size={15} />
          {loading ? 'Enabling…' : status === 'denied' ? 'Blocked in browser' : 'Enable Push Notifications'}
        </button>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
