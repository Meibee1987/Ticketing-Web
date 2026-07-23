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
        h-full bg-white rounded-[var(--radius-card)]
        shadow-[var(--shadow-card)]
        border border-slate-200
        p-5
        ${className}
      `}
    >
      {/* Header */}
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="ui-card-title">{title}</h3>}
            {subtitle && <p className="ui-description">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Chart content */}
      {children}
    </div>
  );
}
