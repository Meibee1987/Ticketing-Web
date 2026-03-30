/**
 * Badge – Pill badge for Jenis Pertemuan etc.
 * Luring = soft green, Online = soft blue, Hybrid = soft purple
 */

const VARIANTS = {
  luring: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-500',
  },
  online: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    dot: 'bg-primary-500',
  },
  daring: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    dot: 'bg-primary-500',
  },
  hybrid: {
    bg: 'bg-secondary-50',
    text: 'text-secondary-700',
    dot: 'bg-secondary-500',
  },
  // Alert types
  peringatan: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    dot: 'bg-warning-500',
  },
  warning: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    dot: 'bg-warning-500',
  },
  info: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    dot: 'bg-primary-500',
  },
  sukses: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-500',
  },
  success: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-500',
  },
  danger: { bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500' },
  error: { bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500' },
  // Default
  default: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export default function Badge({
  variant = 'default',
  children,
  showDot = true,
  className = '',
}) {
  const v = VARIANTS[variant?.toLowerCase()] || VARIANTS.default;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-xs font-semibold
        ${v.bg} ${v.text}
        ${className}
      `}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />}
      {children}
    </span>
  );
}
