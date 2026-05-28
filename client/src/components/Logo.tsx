import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'wordmark';
  clickable?: boolean;
  className?: string;
}

function LogoSVG({ size = 32 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} aria-label="autoflow logo">
      <defs>
        <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      {/* Background rounded square */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#lg1)"/>
      {/* Truck body */}
      <rect x="8" y="26" width="32" height="20" rx="3" fill="white" opacity="0.95"/>
      {/* Truck cab */}
      <rect x="40" y="32" width="16" height="14" rx="3" fill="white" opacity="0.85"/>
      {/* Windshield */}
      <rect x="42" y="34" width="11" height="7" rx="2" fill="#7c3aed" opacity="0.6"/>
      {/* Wheels */}
      <circle cx="17" cy="48" r="5" fill="#6d28d9"/>
      <circle cx="17" cy="48" r="2.5" fill="white"/>
      <circle cx="45" cy="48" r="5" fill="#6d28d9"/>
      <circle cx="45" cy="48" r="2.5" fill="white"/>
      {/* Speed lines */}
      <line x1="8" y1="21" x2="24" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
      <line x1="8" y1="16" x2="18" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      {/* Auto label on truck */}
      <text x="24" y="40" textAnchor="middle" fill="#6d28d9" fontSize="7" fontWeight="bold" fontFamily="sans-serif">AUTO</text>
    </svg>
  );
}

const SIZE_MAP = { sm: 24, md: 32, lg: 40, xl: 56 };
const TEXT_SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' };

export default function Logo({ size = 'md', variant = 'full', clickable = false, className = '' }: LogoProps) {
  const navigate = useNavigate();
  const px = SIZE_MAP[size];
  const handleClick = () => { if (clickable) navigate('/'); };

  if (variant === 'icon') {
    return (
      <div onClick={handleClick} className={`${clickable ? 'cursor-pointer' : ''} ${className}`} style={{display:'inline-flex',alignItems:'center'}}>
        <LogoSVG size={px} />
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`${clickable ? 'cursor-pointer' : ''} ${className}`}
      style={{display:'inline-flex', alignItems:'center', gap: px * 0.35}}>
      <LogoSVG size={px} />
      <span style={{
        fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
        fontSize: px * 0.56,
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        auto<span style={{ WebkitTextFillColor: '#c4b5fd' }}>flow</span>
      </span>
    </div>
  );
}
