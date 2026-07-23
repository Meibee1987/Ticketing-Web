import { createContext } from 'react';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  dismissNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  addNotification: () => {},
});
