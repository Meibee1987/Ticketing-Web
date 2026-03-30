/**
 * Topbar – White top bar matching Figma design
 * - Title + greeting
 * - Date picker + "Hari Ini" button
 * - Search input
 * - Notification bell
 * - User avatar + name + role badge
 */
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Search,
  Bell,
  Calendar,
  Menu,
  ChevronDown,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  PlusCircle,
  PenSquare,
  Trash2,
} from 'lucide-react';

const NOTIF_ICON = {
  tambah: { icon: PlusCircle, color: 'text-success-500', bg: 'bg-success-50' },
  edit: { icon: PenSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
  hapus: { icon: Trash2, color: 'text-danger-500', bg: 'bg-danger-50' },
  sukses: { icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-50' },
  success: {
    icon: CheckCircle,
    color: 'text-success-500',
    bg: 'bg-success-50',
  },
  info: { icon: Info, color: 'text-primary-500', bg: 'bg-primary-50' },
  peringatan: {
    icon: AlertTriangle,
    color: 'text-warning-500',
    bg: 'bg-warning-50',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning-500',
    bg: 'bg-warning-50',
  },
};

export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const { userRole } = useAuth();
  const { notifications, unreadCount, dismissNotification, markAllRead } =
    useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const greeting = `Selamat datang kembali, ${userRole?.name?.split(' ')[0] || 'User'} 👋`;

  // Initials for avatar
  const initials = (userRole?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Role badge color
  const roleBadge =
    {
      'super admin': 'bg-primary-100 text-primary-700',
      admin: 'bg-secondary-100 text-secondary-700',
      dosen: 'bg-success-100 text-success-700',
      user: 'bg-slate-100 text-slate-600',
    }[userRole?.roleName] || 'bg-slate-100 text-slate-600';

  return (
    <header className="h-[72px] bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 lg:left-[260px] z-40">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{greeting}</p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Search */}

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => {
              setBellOpen((v) => !v);
              if (!bellOpen) markAllRead();
            }}
            className="relative p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <Bell size={20} className="text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">
                  Notifikasi
                </span>
                <span className="text-xs text-slate-400">
                  {notifications.length} total
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    Tidak ada notifikasi.
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const cfg = NOTIF_ICON[n.type] || NOTIF_ICON.info;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <Icon size={15} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 leading-snug">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.description}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {n.time}
                          </span>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200" />

        {/* User profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white">
            {initials}
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-semibold text-slate-800 leading-tight">
              {userRole?.name || 'User'}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${roleBadge}`}
            >
              {userRole?.roleName || 'user'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
