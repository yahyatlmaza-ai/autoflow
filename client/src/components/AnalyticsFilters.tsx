import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';

export interface DateRange { from: string; to: string; label: string }

const PRESETS: DateRange[] = [
  { label:'Today',      from: new Date().toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
  { label:'Last 7d',    from: new Date(Date.now()-6*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
  { label:'Last 30d',   from: new Date(Date.now()-29*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
  { label:'This Month', from: new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
  { label:'Last Month', from: new Date(new Date().getFullYear(),new Date().getMonth()-1,1).toISOString().slice(0,10), to: new Date(new Date().getFullYear(),new Date().getMonth(),0).toISOString().slice(0,10) },
];

export default function AnalyticsFilters({ onChange }: { onChange: (r: DateRange) => void }) {
  const [active, setActive] = useState('Last 30d');
  const btn = (preset: DateRange) => ({
    padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
    transition:'all .15s',
    background: active===preset.label ? 'rgba(124,58,237,.3)' : 'rgba(255,255,255,.04)',
    color: active===preset.label ? '#c4b5fd' : 'rgba(232,228,255,.4)',
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:20 }}>
      <Calendar size={14} style={{ color:'rgba(232,228,255,.3)' }} />
      {PRESETS.map(p => (
        <button key={p.label} style={btn(p)} onClick={()=>{ setActive(p.label); onChange(p); }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
