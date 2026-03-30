/**
 * ChartCard – Container card for any chart content
 * White card, rounded-16, soft shadow, optional header + actions
 */

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-[var(--radius-card)]
        shadow-[var(--shadow-card)]
        border border-slate-100
        p-5 md:p-6
        ${className}
      `}
    >
      {/* Header */}
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-[15px] font-semibold text-slate-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Chart content */}
      {children}
    </div>
  );
}
