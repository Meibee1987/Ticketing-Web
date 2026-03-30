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
      className={`
        bg-white rounded-[var(--radius-card)] border-t-4 ${colors.border}
        shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]
        transition-shadow duration-200 p-5 md:p-6
      `}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <p className="text-[13px] font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <p className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              {value}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendColor}`}
              >
                <TrendIcon size={12} />
                {trend}
              </span>
              <span className="text-xs text-slate-400">{trendLabel}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={`w-12 h-12 rounded-2xl ${colors.iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon size={22} className={colors.iconColor} strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  );
}
