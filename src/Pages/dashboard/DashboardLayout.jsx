import { NavLink, Outlet } from 'react-router-dom';
import { supabase, TOKEN_KEY } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
  const { userRole, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const menuItemClass = ({ isActive }) =>
    `w-full text-left px-4 py-2 text-sm rounded-r-full flex items-center gap-2 transition-all
     ${isActive ? 'bg-gradient-to-r from-[#e6c200] to-[#c9a900] text-[#5c0017] font-semibold shadow-md' : 'hover:bg-[#7a1c2f]/80'}`;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-yellow-50 to-blue-100">
      {/* Sidebar - Fixed */}
      <aside className="w-64 bg-gradient-to-b from-[#6b1a27] via-[#7a1c2f] to-[#4a0d18] text-white overflow-hidden flex flex-col fixed left-0 top-0 h-screen z-50 shadow-xl border-r-2 border-[#e6c200]/10">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#e6c200]/20 bg-gradient-to-r from-transparent to-[#e6c200]/5">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-[#e6c200] bg-clip-text text-transparent">
            MyDashboard
          </span>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 bg-[#e6c200]/10 border-b border-[#e6c200]/20">
          <p className="text-xs text-[#e6c200]/70">Logged in as</p>
          <p className="text-sm font-semibold truncate">
            {userRole?.name || 'User'}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-[#e6c200]/20 text-[#e6c200] text-xs rounded-full">
            {userRole?.roleName || 'user'}
          </span>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto">
          {/* Semua role bisa akses Jadwal */}
          <NavLink to="/dashboard/jadwal" className={menuItemClass}>
            <span>📅</span>
            <span>Jadwal</span>
          </NavLink>

          {/* Admin dan Super Admin */}
          {(userRole?.roleName === 'admin' ||
            userRole?.roleName === 'super admin') && (
            <NavLink to="/dashboard/jadwal-admin" className={menuItemClass}>
              <span>🔐</span>
              <span>Jadwal Admin</span>
            </NavLink>
          )}

          {/* Semua role bisa akses Ruangan */}
          <NavLink to="/dashboard/ruangan" className={menuItemClass}>
            <span>🏢</span>
            <span>Ruangan</span>
          </NavLink>

          {/* Admin dan Super Admin bisa akses Master Data */}
          {(userRole?.roleName === 'admin' ||
            userRole?.roleName === 'super admin') && (
            <NavLink to="/dashboard/database" className={menuItemClass}>
              <span>🗄️</span>
              <span>Master Data</span>
            </NavLink>
          )}

          {/* Hanya Super Admin bisa akses Users */}
          {userRole?.roleName === 'super admin' && (
            <NavLink to="/dashboard/users" className={menuItemClass}>
              <span>👥</span>
              <span>Users</span>
            </NavLink>
          )}

          {/* Admin dan Super Admin bisa akses Settings */}
          {(userRole?.roleName === 'admin' ||
            userRole?.roleName === 'super admin') && (
            <NavLink to="/dashboard/settings" className={menuItemClass}>
              <span>⚙️</span>
              <span>Settings</span>
            </NavLink>
          )}
        </nav>

        {/* Logout di bawah */}
        <div className="border-t border-[#e6c200]/20 p-4 bg-gradient-to-t from-[#e6c200]/5 to-transparent">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-white hover:text-[#e6c200] transition-colors hover:scale-105 transform"
          >
            🚪 <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area dengan margin untuk sidebar */}
      <div className="flex-1 flex flex-col min-h-screen ml-64">
        {/* Header - Fixed */}
        <header
          className="h-16 bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e40af] border-b-2 border-[#fed80b]/50 flex items-center justify-between px-4 md:px-6 fixed top-0 right-0 z-40 shadow-xl"
          style={{ left: '16rem' }}
        >
          <div className="flex items-center gap-3"></div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-[#fed80b] font-medium">
              Hi, {userRole?.name || 'User'}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fed80b] to-[#f5c400] ring-2 ring-white/50 shadow-lg flex items-center justify-center text-xs font-bold text-[#5c0017]">
              {userRole?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Konten route dengan padding top untuk header fixed */}
        <main className="flex-1 p-4 md:p-6 mt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
