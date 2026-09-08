import {
  BookOpen,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleAlert,
  CircleDot,
  Clock3,
  ImageOff,
  MapPin,
  UserRound,
} from 'lucide-react';

const STATUS_STYLES = {
  ongoing: {
    label: 'Berlangsung',
    card: 'border-success-200 border-l-success-500 bg-success-50/55 shadow-[0_2px_12px_rgba(22,163,74,0.10)]',
    badge:
      'border-success-200 bg-success-100 text-success-800 ring-1 ring-success-200/70',
    icon: CircleDot,
  },
  upcoming: {
    label: 'Akan Datang',
    card: 'border-primary-100 border-l-primary-500 bg-white shadow-sm',
    badge: 'border-primary-200 bg-primary-100 text-primary-700',
    icon: Clock3,
  },
  finished: {
    label: 'Selesai',
    card: 'border-slate-200 border-l-slate-400 bg-slate-50/75 shadow-sm',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    icon: CircleCheck,
  },
  cancelled: {
    label: 'Dibatalkan',
    card: 'border-danger-200 border-l-danger-500 bg-danger-50/50 shadow-sm',
    badge: 'border-danger-100 bg-danger-100 text-danger-700',
    icon: CircleAlert,
  },
  default: {
    label: 'Status tidak tersedia',
    card: 'border-slate-200 border-l-slate-300 bg-white shadow-sm',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    icon: CircleAlert,
  },
};

const MEETING_STYLES = {
  luring: {
    label: 'Luring',
    className: 'border-success-100 bg-success-50 text-success-700',
  },
  daring: {
    label: 'Daring',
    className: 'border-primary-100 bg-primary-50 text-primary-700',
  },
  online: {
    label: 'Daring',
    className: 'border-primary-100 bg-primary-50 text-primary-700',
  },
  hybrid: {
    label: 'Hybrid',
    className: 'border-warning-100 bg-warning-50 text-warning-700',
  },
};

function getDisplayText(value, fallback = 'Belum ditentukan') {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized && normalized !== '-' ? normalized : fallback;
}

function CategoryBadge({ children }) {
  return (
    <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold leading-5 text-primary-800 3xl:text-[15px]">
      <BookOpen
        size={17}
        className="shrink-0 text-primary-600"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_STYLES[status] || STATUS_STYLES.default;
  const StatusIcon = config.icon;

  return (
    <span
      className={`inline-flex h-9 min-w-[112px] items-center justify-center gap-2 rounded-full border px-3 text-[13px] font-semibold leading-none 3xl:min-w-[120px] 3xl:text-sm ${config.badge}`}
    >
      <StatusIcon
        size={16}
        className="shrink-0"
        strokeWidth={2}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function MeetingBadge({ type }) {
  const config = MEETING_STYLES[type] || MEETING_STYLES.luring;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-4 3xl:text-[13px] ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function MonitorHeader({
  dateLabel,
  clock,
  canSelectDate = false,
  selectedDate,
  onDateChange,
  onToday,
  isToday = true,
}) {
  const clockLabel = `${clock.hours}:${clock.minutes}:${clock.seconds}`;

  return (
    <header className="sticky top-0 z-30 border-b border-primary-700 bg-primary-900 text-white">
      <div className="mx-auto grid w-full max-w-[1720px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] lg:gap-6 lg:px-8 lg:py-5">
        <div className="min-w-0">
          <img
            src="/logo_sb.png"
            alt="IPB University School of Business"
            className="h-auto max-h-11 w-auto max-w-full object-contain object-left sm:max-h-12 lg:max-h-14"
          />
        </div>

        <div className="col-span-2 row-start-2 min-w-0 text-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <h1 className="text-xl font-bold leading-7 tracking-tight sm:text-2xl lg:text-[30px] lg:leading-9 3xl:text-[34px]">
            Informasi Jadwal
          </h1>
          <p className="mt-1 text-[13px] font-medium leading-5 text-primary-100 sm:text-sm lg:text-base">
            {dateLabel}
          </p>
        </div>

        <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end lg:col-start-3">
          {canSelectDate && (
            <div className="hidden items-center gap-2 sm:flex">
              <label
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white px-3 text-primary-900 shadow-sm sm:h-12"
                title="Pilih tanggal jadwal yang ditampilkan"
              >
                <CalendarDays
                  size={19}
                  className="shrink-0 text-primary-700"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span className="sr-only">Pilih tanggal jadwal</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={onDateChange}
                  className="min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                  aria-label="Pilih tanggal jadwal yang ditampilkan"
                />
              </label>
              {!isToday && (
                <button
                  type="button"
                  onClick={onToday}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 sm:h-12"
                >
                  Hari ini
                </button>
              )}
            </div>
          )}
          <div
            className="inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 sm:h-12 sm:min-w-[148px] sm:px-4"
            aria-label={`Waktu saat ini ${clockLabel}`}
          >
            <Clock3
              size={20}
              className="shrink-0 text-primary-100"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <time
              className="whitespace-nowrap font-mono text-lg font-bold leading-none tracking-tight text-white tabular-nums sm:text-2xl 3xl:text-[28px]"
              dateTime={clockLabel}
            >
              {clock.hours}:{clock.minutes}
              <span className="text-white/65">:{clock.seconds}</span>
            </time>
          </div>
        </div>

        {canSelectDate && (
          <div className="col-span-2 row-start-3 flex items-center justify-center gap-2 sm:hidden">
            <label className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-primary-900 shadow-sm">
              <CalendarDays size={18} aria-hidden="true" />
              <span className="sr-only">Pilih tanggal jadwal</span>
              <input
                type="date"
                value={selectedDate}
                onChange={onDateChange}
                className="min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                aria-label="Pilih tanggal jadwal yang ditampilkan"
              />
            </label>
            {!isToday && (
              <button
                type="button"
                onClick={onToday}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white"
              >
                Hari ini
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function MonitorScheduleCard({ item }) {
  const status = STATUS_STYLES[item.status] || STATUS_STYLES.default;
  const agenda = getDisplayText(item.kegiatan, 'Agenda belum tersedia');
  const location = getDisplayText(item.tempat);
  const lecturer = getDisplayText(item.dosen);
  const category = getDisplayText(item.kode, 'Kategori');
  const time = getDisplayText(item.jam, 'Waktu belum ditentukan').replace(
    ' - ',
    '–'
  );

  return (
    <article
      className={`rounded-xl border border-l-4 px-4 py-4 transition-colors sm:px-5 xl:py-3.5 ${status.card}`}
    >
      <div className="flex items-start justify-between gap-3 xl:hidden">
        <CategoryBadge>{category}</CategoryBadge>
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:mt-0 xl:grid-cols-[minmax(120px,0.72fr)_minmax(260px,1.5fr)_minmax(220px,1.05fr)_minmax(200px,1fr)_minmax(120px,0.72fr)] xl:items-center xl:gap-4 2xl:gap-5">
        <div className="hidden min-w-0 xl:block">
          <CategoryBadge>{category}</CategoryBadge>
        </div>

        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <h3
            className="line-clamp-2 text-lg font-semibold leading-6 text-slate-900 sm:text-xl sm:leading-7 xl:text-[19px] 3xl:text-xl"
            title={agenda}
          >
            {agenda}
          </h3>
          <div className="mt-2">
            <MeetingBadge type={item.jenis_pertemuan} />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <MapPin
              size={19}
              className="mt-0.5 shrink-0 text-primary-600"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <p
              className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 text-slate-800 3xl:text-base 3xl:leading-6"
              title={location}
            >
              {location}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <Clock3
              size={19}
              className="shrink-0 text-slate-400"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <p className="min-w-0 text-sm font-medium leading-5 text-slate-600 tabular-nums 3xl:text-base">
              {time} WIB
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-2.5">
          <UserRound
            size={19}
            className="mt-0.5 shrink-0 text-primary-600"
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <p
            className={`line-clamp-2 min-w-0 text-sm leading-5 3xl:text-base 3xl:leading-6 ${
              lecturer === 'Belum ditentukan'
                ? 'text-slate-500'
                : 'font-medium text-slate-800'
            }`}
            title={lecturer}
          >
            {lecturer}
          </p>
        </div>

        <div className="hidden justify-self-end xl:block">
          <StatusBadge status={item.status} />
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="grid animate-pulse gap-4 motion-reduce:animate-none md:grid-cols-2 xl:grid-cols-[minmax(120px,0.72fr)_minmax(260px,1.5fr)_minmax(220px,1.05fr)_minmax(200px,1fr)_minmax(120px,0.72fr)] xl:items-center">
        <div className="h-9 w-24 rounded-lg bg-slate-100" />
        <div className="space-y-2 md:col-span-2 xl:col-span-1">
          <div className="h-5 w-4/5 rounded bg-slate-100" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="h-9 w-28 justify-self-end rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function MonitorScheduleSkeleton() {
  return (
    <section
      className="space-y-3 sm:space-y-4"
      role="status"
      aria-label="Memuat jadwal hari ini"
      aria-live="polite"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
      <span className="sr-only">Memuat jadwal hari ini.</span>
    </section>
  );
}

export function MonitorScheduleEmptyState({ dateLabel, isToday = true }) {
  return (
    <section className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="max-w-md">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <CalendarX2 size={28} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold leading-7 text-slate-900">
          Tidak Ada Jadwal
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isToday
            ? 'Belum ada jadwal yang berlangsung atau dijadwalkan hari ini.'
            : `Belum ada jadwal pada ${dateLabel}.`}
        </p>
      </div>
    </section>
  );
}

export function MonitorScheduleErrorState({ message, onRetry }) {
  return (
    <section
      className="flex min-h-[260px] items-center justify-center rounded-xl border border-danger-100 bg-white px-6 py-10 text-center shadow-sm"
      role="alert"
    >
      <div className="max-w-md">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <CircleAlert size={28} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold leading-7 text-slate-900">
          Gagal Memuat Jadwal
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Coba Lagi
        </button>
      </div>
    </section>
  );
}

export function MonitorImageSlide({ slide }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex h-[calc(100vh-270px)] min-h-[320px] max-h-[900px] w-full items-center justify-center bg-slate-50">
        <img
          src={slide.url}
          alt={slide.title || 'Informasi visual School of Business'}
          className="max-h-full max-w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.nextSibling.style.display = 'block';
          }}
        />
        <div className="hidden p-8 text-center">
          <ImageOff
            className="mx-auto mb-4 text-slate-400"
            size={40}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <p className="text-base text-slate-600">Gambar tidak dapat dimuat</p>
        </div>
      </div>
      {slide.title && (
        <div className="border-t border-primary-700 bg-primary-800 px-6 py-3 text-center text-white">
          <h3 className="text-base font-semibold leading-6 lg:text-lg">
            {slide.title}
          </h3>
        </div>
      )}
    </section>
  );
}

export function MonitorFooter({
  totalSchedules,
  totalPages,
  totalDataPages,
  currentPage,
  onPrevious,
  onNext,
  onPageChange,
  dateLabel,
  isToday = true,
}) {
  return (
    <footer className="border-t border-slate-200 bg-white/90">
      <div className="mx-auto flex w-full max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs text-slate-500 sm:px-6 lg:px-8">
        <p>
          {isToday ? 'Total hari ini' : `Total ${dateLabel}`}:{' '}
          <strong className="font-semibold text-slate-700">
            {totalSchedules} kegiatan
          </strong>
        </p>

        {totalPages > 1 && (
          <nav
            className="flex max-w-full items-center gap-1"
            aria-label="Navigasi slide monitor"
          >
            <button
              type="button"
              onClick={onPrevious}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-700 transition-colors hover:bg-primary-50"
              aria-label="Slide sebelumnya"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <div className="flex max-w-[44vw] items-center overflow-x-auto">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => onPageChange(index)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  title={`Halaman ${index + 1}${
                    index >= totalDataPages ? ' (Gambar)' : ''
                  }`}
                  aria-label={`Tampilkan slide ${index + 1}`}
                  aria-current={currentPage === index ? 'page' : undefined}
                >
                  <span
                    className={`h-2 rounded-full transition-[width,background-color] ${
                      currentPage === index
                        ? 'w-5 bg-primary-600'
                        : 'w-2 bg-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-700 transition-colors hover:bg-primary-50"
              aria-label="Slide berikutnya"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <span className="ml-1 tabular-nums">
              {currentPage + 1}/{totalPages}
            </span>
          </nav>
        )}

        <p className="text-[11px] sm:text-xs">
          Developed by{' '}
          <strong className="font-semibold text-slate-600">
            Wanda Saputra
          </strong>
        </p>
      </div>
    </footer>
  );
}
