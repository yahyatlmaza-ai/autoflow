import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#06060f' }}>
      <div style={{ width:28, height:28, border:'3px solid rgba(124,58,237,.3)', borderTop:'3px solid #7c3aed', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
