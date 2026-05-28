import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import LogoFull from '../components/LogoFull';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(109,40,217,.2) 0%,transparent 60%), #06060f',
      padding: 40, fontFamily:"'DM Sans',sans-serif",
    }}>
      {/* لوغو في الأعلى */}
      <div style={{ position:'absolute', top:24, left:'50%', transform:'translateX(-50%)' }}>
        <LogoFull size="sm" to="/" />
      </div>

      {/* محتوى 404 */}
      <div style={{ textAlign:'center' }}>
        <div style={{
          fontSize: 120, fontWeight:900, lineHeight:1,
          background:'linear-gradient(135deg,#6d28d9,#a855f7)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text', marginBottom:16,
        }}>404</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#e8e4ff', margin:'0 0 10px' }}>
          Page Not Found
        </h2>
        <p style={{ color:'rgba(232,228,255,.4)', marginBottom:32, fontSize:15 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button onClick={() => navigate('/')} style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'12px 28px', borderRadius:12,
          background:'linear-gradient(135deg,#6d28d9,#a855f7)',
          border:'none', color:'#fff', cursor:'pointer', fontSize:14,
          fontWeight:700, fontFamily:'inherit',
          boxShadow:'0 4px 20px rgba(109,40,217,.4)',
        }}>
          <Home size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
}
