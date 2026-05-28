export default function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.06)' }}>
      <div style={{ background:'rgba(124,58,237,.06)', padding:'12px 16px', display:'flex', gap:12 }}>
        {Array(cols).fill(0).map((_,i) => (
          <div key={i} style={{ height:12, borderRadius:6, background:'rgba(255,255,255,.06)', flex: i===0?'0 0 180px':1, animation:'pulse 1.5s ease infinite', animationDelay:`${i*0.1}s` }} />
        ))}
      </div>
      {Array(rows).fill(0).map((_,r) => (
        <div key={r} style={{ padding:'14px 16px', borderTop:'1px solid rgba(255,255,255,.04)', display:'flex', gap:12, alignItems:'center' }}>
          {Array(cols).fill(0).map((_,c) => (
            <div key={c} style={{ height:13, borderRadius:6, background:'rgba(255,255,255,.04)', flex: c===0?'0 0 180px':1, animation:'pulse 1.5s ease infinite', animationDelay:`${(r*cols+c)*0.05}s` }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
