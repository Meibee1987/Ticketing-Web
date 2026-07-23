/**
 * KPICard – Stat card matching Figma
 * Color-coded top border, icon, value, trend indicator
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ACCENT = {
  blue: {
    border: 'border-t-primary-500',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
  },
  green: {
    border: 'border-t-success-500',
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
  },
  amber: {
    border: 'border-t-warning-500',
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
  },
  indigo: {
    border: 'border-t-secondary-500',
    iconBg: 'bg-secondary-50',
    iconColor: 'text-secondary-500',
  },
  red: {
    border: 'border-t-danger-500',
    iconBg: 'bg-danger-50',
    iconColor: 'text-danger-500',
  },
};

export default function KPICard({
  title,
  value,
  trend, // e.g. "+5%"  or  "+2"  or  "-3"
  trendLabel = 'dari kemarin',
  icon: Icon,
  accent = 'blue',
  loading = false,
  onClick,
}) {
  const colors = ACCENT[accent] || ACCENT.blue;

  const isPositive = trend && (trend.startsWith('+') || parseFloat(trend) > 0);
  const isNegative = trend && (trend.startsWith('-') || parseFloat(trend) < 0);
  const trendColor = isPositive
    ? 'text-success-600 bg-success-50'
    : isNegative
      ? 'text-danger-600 bg-danger-50'
      : 'text-slate-500 bg-slate-50';

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className={`
        min-h-[154px] bg-white rounded-[var(--radius-card)] border border-slate-200 border-t-[3px] ${colors.border}
        shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]
        transition-shadow duration-200 p-5
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-300 hover:ring-offset-1 select-none' : ''}
      `}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-[13px] font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendColor}`}
              >
                <TrendIcon size={12} aria-hidden="true" />
                {trend}
              </span>
              <span className="text-xs text-slate-400">{trendLabel}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.iconBg}`}
          >
            <Icon
              size={20}
              className={colors.iconColor}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}
