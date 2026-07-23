export default function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className = '',
}) {
  return (
    <section className={`ui-page-intro ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary-600">
            {eyebrow}
          </p>
        )}
        <h2 className="ui-section-title">{title}</h2>
        {description && <p className="ui-description">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}
