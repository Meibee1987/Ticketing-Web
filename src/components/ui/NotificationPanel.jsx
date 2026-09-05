/**
 * NotificationPanel – "Notifikasi Sistem" sidebar panel
 * Alert cards: conflict=red/warning, info=blue, success=green
 */
import { useState } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  PlusCircle,
  PenSquare,
  Trash2,
  X,
} from 'lucide-react';
import { formatNotificationTime } from '../../utils/notifications';
import StatePanel from './StatePanel';

const DEFAULT_VISIBLE_NOTIFICATIONS = 5;

const ALERT_CONFIG = {
  peringatan: {
    icon: AlertTriangle,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
    border: 'border-l-warning-500',
    tagBg: 'bg-danger-50 text-danger-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
    border: 'border-l-warning-500',
    tagBg: 'bg-danger-50 text-danger-600',
  },
  hapus: {
    icon: Trash2,
    iconBg: 'bg-danger-50',
    iconColor: 'text-danger-500',
    border: 'border-l-danger-500',
    tagBg: 'bg-danger-50 text-danger-600',
  },
  info: {
    icon: Info,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
    border: 'border-l-primary-500',
    tagBg: 'bg-primary-50 text-primary-600',
  },
  edit: {
    icon: PenSquare,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    border: 'border-l-amber-500',
    tagBg: 'bg-amber-50 text-amber-600',
  },
  tambah: {
    icon: PlusCircle,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    border: 'border-l-success-500',
    tagBg: 'bg-success-50 text-success-600',
  },
  sukses: {
    icon: CheckCircle,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    border: 'border-l-success-500',
    tagBg: 'bg-success-50 text-success-600',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    border: 'border-l-success-500',
    tagBg: 'bg-success-50 text-success-600',
  },
};

function AlertCard({ notification, onDismiss }) {
  const config = ALERT_CONFIG[notification.type] || ALERT_CONFIG.info;
  const IconComp = config.icon;

  return (
    <div
      className={`
        relative bg-white rounded-xl border border-slate-100
        border-l-4 ${config.border}
        p-4 shadow-[var(--shadow-card)]
        hover:shadow-[var(--shadow-card-hover)] transition-shadow
      `}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={() => onDismiss(notification.id)}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          aria-label={`Tutup notifikasi ${notification.title}`}
        >
          <X size={14} />
        </button>
      )}

      <div className="flex gap-3 pr-6">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0`}
        >
          <IconComp size={18} className={config.iconColor} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + tag */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-900">
              {notification.title}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.tagBg}`}
            >
              {notification.tag || notification.type}
            </span>
          </div>

          {/* Description */}
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
            {notification.description}
          </p>

          {/* Time */}
          <span className="text-[11px] text-slate-400 mt-1.5 block">
            {formatNotificationTime(notification.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationPanel({
  notifications = [],
  unreadCount,
  onDismiss,
  loading = false,
}) {
  const [showAll, setShowAll] = useState(false);
  const activeCount = notifications.length;
  const displayedNotifications = showAll
    ? notifications
    : notifications.slice(0, DEFAULT_VISIBLE_NOTIFICATIONS);
  const badgeCount = unreadCount ?? activeCount;
  const hiddenCount = Math.max(0, activeCount - DEFAULT_VISIBLE_NOTIFICATIONS);

  return (
    <div className="h-full rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="ui-card-title">Notifikasi Sistem</h3>
          <p className="ui-description">
            {activeCount} tersimpan · {badgeCount} belum dibaca
          </p>
        </div>
        <span className="ui-badge bg-primary-50 text-primary-700">
          {badgeCount}
        </span>
      </div>

      {/* Alert cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <StatePanel
          type="empty"
          title="Tidak ada notifikasi"
          description="Aktivitas dan perubahan jadwal akan muncul di sini."
          compact
        />
      ) : (
        <>
          <div
            className={`space-y-3 ${
              showAll ? 'max-h-[48rem] overflow-y-auto pr-1' : ''
            }`}
          >
            {displayedNotifications.map((notif) => (
              <AlertCard
                key={notif.id}
                notification={notif}
                onDismiss={onDismiss}
              />
            ))}
          </div>

          {activeCount > DEFAULT_VISIBLE_NOTIFICATIONS && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
              aria-expanded={showAll}
            >
              {showAll
                ? 'Tampilkan 5 terbaru'
                : `Lihat Semua (${hiddenCount} lainnya)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
