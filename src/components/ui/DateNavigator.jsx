import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateNavigator({
  value,
  label,
  isToday = false,
  onChange,
  onPrevious,
  onNext,
  onToday,
  sticky = false,
  className = '',
}) {
  return (
    <section
      className={`ui-toolbar ${sticky ? 'sticky top-[68px] z-20' : ''} ${className}`}
      aria-label="Navigasi tanggal"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="ui-icon-button"
          aria-label="Tanggal sebelumnya"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <label className="relative">
          <span className="sr-only">Pilih tanggal</span>
          <CalendarDays
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="date"
            value={value}
            onChange={onChange}
            className="ui-field w-[164px] pl-9"
          />
        </label>
        <button
          type="button"
          onClick={onNext}
          className="ui-icon-button"
          aria-label="Tanggal berikutnya"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className={`ui-button ${
            isToday
              ? 'ui-button-primary'
              : 'ui-button-secondary text-primary-700'
          }`}
        >
          Hari Ini
        </button>
        <p className="min-w-0 text-sm font-medium text-slate-700">{label}</p>
      </div>
    </section>
  );
}
