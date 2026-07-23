import { useContext } from 'react';
import { NotificationContext } from '../contexts/notificationContextValue';

export function useNotifications() {
  return useContext(NotificationContext);
}
