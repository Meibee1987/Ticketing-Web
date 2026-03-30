/**
 * NotificationContext – Global realtime notification state
 *
 * Subscribes to Supabase realtime changes on all 3 jadwal tables.
 * Provides notifications + unread count to:
 *   - Topbar bell badge
 *   - NotificationPanel on Dashboard
 *   - Any other component that needs it
 */
import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  dismissNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const notifRef = useRef(notifications);
  notifRef.current = notifications;

  // ── Unread count ──
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // ── Dismiss a single notification ──
  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Mark all as read (clears the bell badge) ──
  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifRef.current.forEach((n) => next.add(n.id));
      return next;
    });
  }, []);

  // ── Clear all notifications ──
  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  // ── Manually add a notification (called from pages after CRUD) ──
  const addNotification = useCallback((notif) => {
    const fullNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: 'Baru saja',
      timestamp: Date.now(),
      ...notif,
    };
    setNotifications((prev) =>
      [fullNotif, ...prev].slice(0, MAX_NOTIFICATIONS)
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        dismissNotification,
        markAllRead,
        clearAll,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
