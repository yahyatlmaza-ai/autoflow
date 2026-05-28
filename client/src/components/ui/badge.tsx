import { ReactNode } from 'react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  confirmed: { label: 'Confirmed', color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  shipped:   { label: 'Shipped',   color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  delivered: { label: 'Delivered', color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  returned:  { label: 'Returned',  color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  active:    { label: 'Active',    color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
  inactive:  { label: 'Inactive',  color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
};

export function Badge({
  children, variant = 'default', className = '', status,
}: {
  children?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
  className?: string;
  status?: string;
}) {
  if (status) {
    const s = STATUS_MAP[status] || { label: status, color: '#9ca3af', bg: 'rgba(156,163,175,.1)' };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 9px', borderRadius: 100,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
        background: s.bg, color: s.color,
      }}>
        {s.label}
      </span>
    );
  }
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
