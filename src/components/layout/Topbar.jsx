import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Info,
  Menu,
  PenSquare,
  PlusCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { formatNotificationTime } from '../../utils/notifications';

const NOTIFICATION_ICONS = {
  tambah: { icon: PlusCircle, color: 'text-success-600', bg: 'bg-success-50' },
  edit: { icon: PenSquare, color: 'text-warning-600', bg: 'bg-warning-50' },
  hapus: { icon: Trash2, color: 'text-danger-600', bg: 'bg-danger-50' },
  sukses: {
    icon: CheckCircle,
    color: 'text-success-600',
    bg: 'bg-success-50',
  },
  success: {
    icon: CheckCircle,
    color: 'text-success-600',
    bg: 'bg-success-50',
  },
  info: { icon: Info, color: 'text-primary-600', bg: 'bg-primary-50' },
  peringatan: {
    icon: AlertTriangle,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
  },
};

export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const { userRole } = useAuth();
  const { notifications, unreadCount, dismissNotification, markAllRead } =
    useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setBellOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const firstName = userRole?.name?.split(' ')[0] || 'User';
  const initials = (userRole?.name || 'U')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadge =
    {
      'super admin': 'bg-primary-100 text-primary-700',
      admin: 'bg-secondary-100 text-secondary-700',
      dosen: 'bg-success-100 text-success-700',
      user: 'bg-slate-100 text-slate-600',
    }[userRole?.roleName] || 'bg-slate-100 text-slate-600';

  const toggleNotifications = () => {
    setBellOpen((current) => !current);
    if (!bellOpen) markAllRead();
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:left-[236px] lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Buka navigasi"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold leading-6 tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-0.5 hidden truncate text-[12px] leading-4 text-slate-500 sm:block">
            Selamat datang kembali, {firstName}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={
              unreadCount > 0
                ? `Buka notifikasi, ${unreadCount} belum dibaca`
                : 'Buka notifikasi'
            }
            aria-expanded={bellOpen}
            aria-controls="topbar-notifications"
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div
              id="topbar-notifications"
              className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              role="dialog"
              aria-label="Daftar notifikasi"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">
                  Notifikasi
                </span>
                <span className="text-xs text-slate-500">
                  {notifications.length} total
                </span>
              </div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Info
                      size={22}
                      className="mx-auto mb-2 text-slate-400"
                      aria-hidden="true"
                    />
                    <p className="text-[13px] font-medium text-slate-700">
                      Tidak ada notifikasi
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Aktivitas terbaru akan tampil di sini.
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => {
                    const config =
                      NOTIFICATION_ICONS[notification.type] ||
                      NOTIFICATION_ICONS.info;
                    const Icon = config.icon;
                    return (
                      <article
                        key={notification.id}
                        className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                        >
                          <Icon
                            size={15}
                            className={config.color}
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-snug text-slate-800">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-slate-500">
                            {notification.description}
                          </p>
                          <time className="mt-1 block text-[11px] text-slate-400">
                            {formatNotificationTime(notification.timestamp)}
                          </time>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissNotification(notification.id)}
                          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Tutup notifikasi ${notification.title}`}
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-[13px] font-semibold text-white ring-2 ring-primary-100 sm:h-10 sm:w-10">
            {initials}
          </div>
          <div className="hidden flex-col items-start md:flex">
            <span className="max-w-40 truncate text-[13px] font-semibold leading-5 text-slate-800">
              {userRole?.name || 'User'}
            </span>
            <span
              className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge}`}
            >
              {userRole?.roleName || 'user'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
