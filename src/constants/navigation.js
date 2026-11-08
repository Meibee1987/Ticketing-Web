import {
  Building2,
  CalendarDays,
  Database,
  LayoutDashboard,
  Banknote,
  MonitorPlay,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { HONOR_DOSEN_ALLOWED_EMAILS, isEmailAllowed } from './accessControl.js';

/**
 * @typedef {Object} NavigationItem
 * @property {string} to
 * @property {import('lucide-react').LucideIcon} icon
 * @property {string} label
 * @property {boolean} [end]
 * @property {readonly string[]} [roles]
 * @property {readonly string[]} [emails]
 */
/** @type {readonly NavigationItem[]} */
export const MENU_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/jadwal', icon: CalendarDays, label: 'Jadwal' },
  {
    to: '/dashboard/jadwal-admin',
    icon: ShieldCheck,
    label: 'Jadwal Admin',
    roles: ['admin', 'super admin'],
  },
  {
    to: '/dashboard/honor-dosen',
    icon: Banknote,
    label: 'Honor Dosen',
    emails: HONOR_DOSEN_ALLOWED_EMAILS,
  },
  {
    to: '/dashboard/monitor-settings',
    icon: MonitorPlay,
    label: 'Monitor Setting',
    roles: ['admin', 'super admin'],
  },
  { to: '/dashboard/ruangan', icon: Building2, label: 'Ruangan' },
  {
    to: '/dashboard/database',
    icon: Database,
    label: 'Master Data',
    roles: ['admin', 'super admin'],
  },
  {
    to: '/dashboard/users',
    icon: Users,
    label: 'Users',
    roles: ['super admin'],
  },
];

/**
 * Menu visibility only; route guards and database policies enforce access.
 * @param {string | undefined} roleName
 * @param {unknown} email
 * @returns {NavigationItem[]}
 */
export function getVisibleMenuItems(roleName, email) {
  return MENU_ITEMS.filter(
    (item) =>
      (!item.roles ||
        (roleName !== undefined && item.roles.includes(roleName))) &&
      (!item.emails || isEmailAllowed(email, item.emails))
  );
}
