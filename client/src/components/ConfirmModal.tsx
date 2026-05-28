import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title?: string; message: string;
  onConfirm: () => void; onCancel: () => void;
  danger?: boolean; confirmLabel?: string;
}
export default function ConfirmModal({ title='Confirm', message, onConfirm, onCancel, danger=false, confirmLabel='Confirm' }: Props) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#0d0d1f', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:28, maxWidth:420, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:40, height:40, borderRadius:10, background: danger ? 'rgba(239,68,68,.12)' : 'rgba(234,179,8,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <AlertTriangle size={20} style={{ color: danger ? '#f87171' : '#fbbf24' }} />
          </div>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'#e8e4ff' }}>{title}</h3>
          <button onClick={onCancel} style={{ marginRight:'auto', background:'none', border:'none', cursor:'pointer', color:'rgba(232,228,255,.3)', marginLeft:'auto' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin:'0 0 24px', color:'rgba(232,228,255,.6)', fontSize:14, lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'9px 20px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#e8e4ff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding:'9px 20px', borderRadius:8, background: danger ? 'rgba(239,68,68,.85)' : 'rgba(124,58,237,.9)', border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
