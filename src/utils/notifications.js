export const MAX_NOTIFICATIONS = 50;

const NOTIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 5000;

const TABLE_LABELS = {
  jadwal_perkuliahan: 'Perkuliahan',
  jadwal_karya_akhir: 'Karya Akhir',
  jadwal_lain_lain: 'Lain-lain',
};

const EVENT_CONFIG = {
  INSERT: {
    type: 'sukses',
    tag: 'BARU',
    title: 'Jadwal Baru Ditambahkan',
    verb: 'ditambahkan',
  },
  UPDATE: {
    type: 'info',
    tag: 'UPDATE',
    title: 'Jadwal Diperbarui',
    verb: 'diperbarui',
  },
  DELETE: {
    type: 'peringatan',
    tag: 'HAPUS',
    title: 'Jadwal Dihapus',
    verb: 'dihapus',
  },
};

export function normalizeNotification(notification, now = Date.now()) {
  const timestamp = Number(notification?.timestamp) || now;

  return {
    id:
      notification?.id ||
      `notif-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    type: notification?.type || 'info',
    tag: notification?.tag || 'INFO',
    title: notification?.title || 'Notifikasi Sistem',
    description: notification?.description || 'Ada pembaruan pada sistem.',
    timestamp,
  };
}

export function mergeNotification(
  notifications,
  notification,
  now = Date.now()
) {
  const next = normalizeNotification(notification, now);
  const current = Array.isArray(notifications) ? notifications : [];

  if (current.some((item) => item.id === next.id)) return current;

  const duplicate = current.some(
    (item) =>
      item.title === next.title &&
      item.tag === next.tag &&
      Math.abs(Number(item.timestamp) - next.timestamp) <= DUPLICATE_WINDOW_MS
  );

  if (duplicate) return current;
  return [next, ...current].slice(0, MAX_NOTIFICATIONS);
}

export function formatNotificationTime(timestamp, now = Date.now()) {
  const elapsed = Math.max(0, now - Number(timestamp || now));
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function buildScheduleNotification(payload, now = Date.now()) {
  const eventType = payload?.eventType || 'UPDATE';
  const table = payload?.table || 'jadwal';
  const row = payload?.new || payload?.old || {};
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.UPDATE;
  const tableLabel = TABLE_LABELS[table] || table;
  const agenda =
    row.agenda ||
    row.nama_matkul ||
    row.agenda_jadwal_karya_akhir ||
    row.id_mata_kuliah ||
    'Data jadwal';

  return {
    id: `notif-${table}-${eventType}-${row.id || 'row'}-${now}`,
    type: config.type,
    tag: config.tag,
    title: config.title,
    description: `${tableLabel}: ${agenda} telah ${config.verb}.`,
    timestamp: now,
  };
}

export function loadNotificationState(rawValue, now = Date.now()) {
  try {
    const stored = rawValue ? JSON.parse(rawValue) : {};
    const notifications = (
      Array.isArray(stored.notifications) ? stored.notifications : []
    )
      .map((item) => normalizeNotification(item, now))
      .filter((item) => now - item.timestamp <= NOTIFICATION_MAX_AGE_MS)
      .slice(0, MAX_NOTIFICATIONS);
    const validIds = new Set(notifications.map((item) => item.id));
    const readIds = new Set(
      (Array.isArray(stored.readIds) ? stored.readIds : []).filter((id) =>
        validIds.has(id)
      )
    );

    return { notifications, readIds };
  } catch {
    return { notifications: [], readIds: new Set() };
  }
}
