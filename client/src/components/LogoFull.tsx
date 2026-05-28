/**
 * LogoFull.tsx — لوغو موحّد يظهر في كل الصفحات
 * يستخدم صورة logo-icon.png إذا كانت موجودة، وإلا SVG مدمج
 */
import { Link } from 'react-router-dom';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  to?: string;
  style?: React.CSSProperties;
}

export default function LogoFull({ size = 'md', showText = true, to = '/', style }: Props) {
  const dims = { sm: 28, md: 36, lg: 48 };
  const fonts = { sm: 15, md: 18, lg: 24 };
  const d = dims[size];
  const f = fonts[size];

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 12 : 9, ...style }}>
      {/* أيقونة SVG مدمجة */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"
        width={d} height={d} style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="lg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#lg-bg)"/>
        <circle cx="32" cy="32" r="8" fill="white" opacity="0.95"/>
        <line x1="32" y1="24" x2="32" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.88"/>
        <polygon points="32,8 29,14 35,14" fill="white" opacity="0.88"/>
        <line x1="37.7" y1="26.3" x2="47" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.82"/>
        <polygon points="50,14 43,18 47,24" fill="white" opacity="0.82"/>
        <line x1="40" y1="32" x2="52" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.78"/>
        <polygon points="56,32 50,29 50,35" fill="white" opacity="0.78"/>
        <line x1="37.7" y1="37.7" x2="47" y2="47" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72"/>
        <polygon points="50,50 43,46 47,40" fill="white" opacity="0.72"/>
      </svg>
      {showText && (
        <span style={{
          fontWeight: 800, fontSize: f, letterSpacing: '-.02em',
          background: 'linear-gradient(135deg, #e8e4ff 0%, #c4b5fd 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          auto<span style={{ WebkitTextFillColor: '#a78bfa' }}>flow</span>
        </span>
      )}
    </div>
  );

  if (!to) return content;
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'inline-flex' }}>
      {content}
    </Link>
  );
}
