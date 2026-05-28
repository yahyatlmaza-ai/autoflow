import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function Switch({ checked, onChange, size = 'md', disabled = false }: SwitchProps) {
  const dims = { sm: { w: 32, h: 18, circle: 14 }, md: { w: 40, h: 22, circle: 18 }, lg: { w: 48, h: 28, circle: 22 } };
  const d = dims[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: d.w, height: d.h, borderRadius: d.h,
        background: checked ? '#7c3aed' : 'rgba(255,255,255,.15)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .2s',
        padding: 0, flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: (d.h - d.circle) / 2,
        left: checked ? d.w - d.circle - (d.h - d.circle) / 2 : (d.h - d.circle) / 2,
        width: d.circle, height: d.circle, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

// Legacy Toggle alias for Dashboard compatibility
export const Toggle = Switch;
export default Switch;
