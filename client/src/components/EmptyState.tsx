import { ReactNode } from 'react';
interface Props { icon?: ReactNode; title: string; message?: string; action?: ReactNode }
export default function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'56px 24px', textAlign:'center' }}>
      {icon && <div style={{ marginBottom:16, opacity:.5 }}>{icon}</div>}
      <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:600, color:'#e8e4ff' }}>{title}</h3>
      {message && <p style={{ margin:'0 0 24px', color:'rgba(232,228,255,.4)', fontSize:14, maxWidth:340, lineHeight:1.6 }}>{message}</p>}
      {action}
    </div>
  );
}
