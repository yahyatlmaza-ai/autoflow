import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast { id: string; message: string; type: ToastType }
type Listener = (toast: Toast) => void;

const listeners: Listener[] = [];
export function toast(message: string, type: ToastType = 'info') {
  const t = { id: Date.now().toString(), message, type };
  listeners.forEach(fn => fn(t));
}
toast.success = (m: string) => toast(m, 'success');
toast.error   = (m: string) => toast(m, 'error');
toast.warning = (m: string) => toast(m, 'warning');
toast.info    = (m: string) => toast(m, 'info');

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    listeners.push(handler);
    return () => { const i = listeners.indexOf(handler); if (i >= 0) listeners.splice(i,1); };
  }, []);
  const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info };
  const colors = { success: '#22c55e', error: '#ef4444', warning: '#f97316', info: '#3b82f6' };
  return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10,
            background:'rgba(10,10,25,.95)', border:`1px solid ${colors[t.type]}40`,
            backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,.4)',
            animation:'slideIn .25s ease', maxWidth:340, minWidth:220 }}>
            <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
            <Icon size={16} style={{ color:colors[t.type], flexShrink:0 }} />
            <span style={{ fontSize:13, color:'#e8e4ff', flex:1 }}>{t.message}</span>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(232,228,255,.3)', padding:2 }}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
