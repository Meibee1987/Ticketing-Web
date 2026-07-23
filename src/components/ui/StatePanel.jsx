import { AlertCircle, CalendarX2, LoaderCircle, SearchX } from 'lucide-react';

const CONFIG = {
  loading: {
    icon: LoaderCircle,
    iconClass: 'animate-spin text-primary-600',
    title: 'Memuat data',
    description: 'Mohon tunggu, data sedang disiapkan.',
  },
  empty: {
    icon: CalendarX2,
    iconClass: 'text-slate-400',
    title: 'Belum ada data',
    description: 'Belum ada data untuk ditampilkan.',
  },
  search: {
    icon: SearchX,
    iconClass: 'text-slate-400',
    title: 'Hasil tidak ditemukan',
    description: 'Coba ubah kata kunci atau filter yang digunakan.',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-danger-600',
    title: 'Data gagal dimuat',
    description: 'Terjadi kendala saat mengambil data.',
  },
};

export default function StatePanel({
  type = 'empty',
  title,
  description,
  action,
  compact = false,
  className = '',
}) {
  const config = CONFIG[type] || CONFIG.empty;
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center ${
        compact ? 'py-8' : 'py-12'
      } ${className}`}
      role={
        type === 'error' ? 'alert' : type === 'loading' ? 'status' : undefined
      }
      aria-live={type === 'loading' || type === 'error' ? 'polite' : undefined}
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <Icon size={20} className={config.iconClass} aria-hidden="true" />
      </span>
      <h3 className="ui-card-title">{title || config.title}</h3>
      <p className="ui-description max-w-md">
        {description || config.description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
