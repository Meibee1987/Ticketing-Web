import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  CalendarDays,
  Database,
  LayoutDashboard,
  LogOut,
  MonitorPlay,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

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

export default function Sidebar({ open, onClose }) {
  const { userRole, signOut } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const academicYear =
    month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  const version = '1.0.0';

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole?.roleName)
  );

  const navigationClass = ({ isActive }) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-white ${
      isActive
        ? 'bg-[var(--color-sidebar-active)] text-white'
        : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
    }`;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Navigasi utama"
        className={`fixed top-0 left-0 z-50 flex h-screen w-[236px] flex-col border-r border-white/5 bg-[var(--color-sidebar-bg)] text-white transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex min-h-[84px] items-center gap-3 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/95">
            <img
              src="/IPB.png"
              alt="Logo IPB University"
              className="h-8 w-8 object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[14px] font-semibold tracking-tight text-white">
              IPB University
            </span>
            <span className="truncate text-[11px] font-medium text-slate-400">
              School of Business
            </span>
          </div>
          <span
            className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-success-500 ring-2 ring-success-500/20"
            title="Online"
          >
            <span className="sr-only">Status online</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mx-4 h-px bg-white/8" />

        <nav className="sidebar-scroll mt-5 flex-1 space-y-1 overflow-y-auto px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={navigationClass}
            >
              <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <a
            href="/jadwal-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium text-[var(--color-sidebar-text)] transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] hover:text-white focus-visible:outline-white"
          >
            <MonitorPlay size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Monitor Jadwal</span>
            <span className="ml-auto text-xs opacity-50" aria-hidden="true">
              ↗
            </span>
          </a>
        </nav>

        <div className="space-y-2 px-3 pb-4 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-danger-500/10 hover:text-danger-100 focus-visible:outline-white"
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Logout</span>
          </button>

          <div className="rounded-lg border border-white/5 bg-white/[0.035] px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-300">
              KIS v{version} · {year}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Academic Year {academicYear}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
