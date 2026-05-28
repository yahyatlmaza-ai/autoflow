import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/Toast';
import WhatsAppButton from './components/WhatsAppButton';
import DeviceGuard from './components/DeviceGuard';
import AdminRoute from './components/AdminRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Demo from './pages/Demo';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#06060f' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40,height:40,border:'3px solid rgba(109,40,217,.3)',borderTop:'3px solid #7c3aed',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px' }} />
        <div style={{ color:'rgba(232,228,255,.3)',fontSize:13 }}>Loading…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <DeviceGuard>{children}</DeviceGuard>;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<><Landing /><WhatsAppButton /></>} />
        <Route path="/login"     element={<Login />} />
        <Route path="/signup"    element={<Signup />} />
        <Route path="/demo"      element={<Demo />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin"     element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/404"       element={<NotFound />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
      <ToastContainer />
    </AppProvider>
  );
}
