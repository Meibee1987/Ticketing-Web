import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { NotificationContext } from './notificationContextValue';
import {
  buildScheduleNotification,
  loadNotificationState,
  mergeNotification,
} from '../utils/notifications';

const STORAGE_PREFIX = 'ticketing.notifications.v1';
const SCHEDULE_TABLES = [
  'jadwal_perkuliahan',
  'jadwal_karya_akhir',
  'jadwal_lain_lain',
];

function NotificationStore({ children, userId }) {
  const storageKey = `${STORAGE_PREFIX}.${userId}`;
  const initialState = loadNotificationState(localStorage.getItem(storageKey));
  const [notifications, setNotifications] = useState(
    initialState.notifications
  );
  const [readIds, setReadIds] = useState(initialState.readIds);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          notifications,
          readIds: [...readIds],
        })
      );
    } catch (error) {
      console.warn('Gagal menyimpan notifikasi:', error);
    }
  }, [notifications, readIds, storageKey]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== storageKey) return;
      const stored = loadNotificationState(event.newValue);
      setNotifications(stored.notifications);
      setReadIds(stored.readIds);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  const addNotification = useCallback((notification) => {
    setNotifications((current) => mergeNotification(current, notification));
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`global-notifications-${userId}`);
    const handler = (payload) =>
      addNotification(buildScheduleNotification(payload));

    SCHEDULE_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        handler
      );
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Koneksi notifikasi realtime gagal:', status);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification, userId]);

  const dismissNotification = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(
      new Set(notificationsRef.current.map((notification) => notification.id))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !readIds.has(notification.id)
  ).length;

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      dismissNotification,
      markAllRead,
      clearAll,
      addNotification,
    }),
    [
      notifications,
      unreadCount,
      dismissNotification,
      markAllRead,
      clearAll,
      addNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  return (
    <NotificationStore
      key={user?.id || 'anonymous'}
      userId={user?.id || 'anonymous'}
    >
      {children}
    </NotificationStore>
  );
}
