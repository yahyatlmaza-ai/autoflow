import { useMemo } from 'react';

interface Props { password: string }

export default function PasswordStrength({ password }: Props) {
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(4, s);
  }, [password]);

  if (!password) return null;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors  = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:4, transition:'background .3s',
            background: i <= strength ? colors[strength] : 'rgba(255,255,255,.08)' }} />
        ))}
      </div>
      <span style={{ fontSize:11, color: colors[strength], fontWeight:600 }}>
        {labels[strength]}
      </span>
    </div>
  );
}
