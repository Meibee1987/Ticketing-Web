import { NavLink, Outlet } from "react-router-dom";
import { supabase, TOKEN_KEY } from "../../supabaseClient";

export default function DashboardLayout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
  };

  const menuItemClass = ({ isActive }) =>
    `w-full text-left px-4 py-2 text-sm rounded-r-full flex items-center gap-2 transition-all
     ${isActive ? "bg-gradient-to-r from-[#e6c200] to-[#c9a900] text-[#5c0017] font-semibold shadow-md" : "hover:bg-[#7a1c2f]/80"}`;

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

        {/* Menu */}
        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto">
          {/* <NavLink to="/dashboard" end className={menuItemClass}>
            <span>📊</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/dashboard/tickets" className={menuItemClass}>
            <span>🎫</span>
            <span>Tickets</span>
          </NavLink>

          <NavLink to="/dashboard/my-tickets" className={menuItemClass}>
            <span>📋</span>
            <span>My Tickets</span>
          </NavLink> */}

          <NavLink to="/dashboard/jadwal" className={menuItemClass}>
            <span>📅</span>
            <span>Jadwal</span>
          </NavLink>

          <NavLink to="/dashboard/ruangan" className={menuItemClass}>
            <span>🏢</span>
            <span>Ruangan</span>
          </NavLink>

          <NavLink to="/dashboard/database" className={menuItemClass}>
            <span>🗄️</span>
            <span>Database</span>
          </NavLink>

          <NavLink to="/dashboard/users" className={menuItemClass}>
            <span>👥</span>
            <span>Users</span>
          </NavLink>

          <NavLink to="/dashboard/settings" className={menuItemClass}>
            <span>⚙️</span>
            <span>Settings</span>
          </NavLink>
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
        <header className="h-16 bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e40af] border-b-2 border-[#fed80b]/50 flex items-center justify-between px-4 md:px-6 fixed top-0 right-0 z-40 shadow-xl" style={{ left: '16rem' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-[#fed80b] font-medium">
              Hi, Azka 
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fed80b] to-[#f5c400] ring-2 ring-white/50 shadow-lg" />
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
