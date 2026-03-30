/**
 * Sidebar – Dark navy sidebar matching Figma design
 * - Active pill highlight (blue)
 * - Icon + label menu items
 * - Version footer
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  MonitorPlay,
  Building2,
  Database,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

/* ── Menu definition ── */
const MENU_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/jadwal', icon: CalendarDays, label: 'Jadwal' },
  {
    to: '/dashboard/jadwal-admin',
    icon: ShieldCheck,
    label: 'Jadwal Admin',
    roles: ['admin', 'super admin'],
  },
  {
    to: '/dashboard/monitor-settings',
    icon: MonitorPlay,
    label: 'Monitor Jadwal',
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
  {
    to: '/dashboard/settings',
    icon: Settings,
    label: 'Settings',
    roles: ['super admin', 'admin'],
  },
];

export default function Sidebar({ open, onClose }) {
  const { userRole, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole?.roleName)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[260px]
          flex flex-col
          bg-[var(--color-sidebar-bg)] text-white
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Logo area ── */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
            <img
              src="/IPB.png"
              alt="IPB"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-white">
              IPB University
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              School of Business
            </span>
          </div>
          {/* Online indicator */}
          <div className="ml-auto w-2.5 h-2.5 rounded-full bg-success-500 ring-2 ring-success-500/30" />
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto sidebar-scroll">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-[var(--color-sidebar-active)] text-white shadow-lg shadow-primary-500/25'
                    : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* External monitor link */}
          <a
            href="/jadwal-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white transition-all duration-200"
          >
            <MonitorPlay size={18} strokeWidth={1.8} />
            <span>Monitor Jadwal</span>
            <span className="text-[10px] ml-auto opacity-50">↗</span>
          </a>
        </nav>

        {/* ── Logout + Version ── */}
        <div className="px-3 pb-4 pt-2 space-y-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Logout</span>
          </button>

          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-300">
              v2.4.1 · 2026
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Academic Year 2025/2026
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
