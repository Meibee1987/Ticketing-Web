import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase, TOKEN_KEY } from "../../supabaseClient";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
  };

  const menuItemClass = ({ isActive }) =>
    `w-full text-left px-4 py-2 text-sm rounded-r-full flex items-center gap-2
     ${isActive ? "bg-slate-800 text-white" : "hover:bg-slate-800"}`;

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } bg-slate-900 text-slate-100 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <span className="text-xl font-bold tracking-tight">
            {isSidebarOpen ? "MyDashboard" : "MD"}
          </span>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4 space-y-1">
          <NavLink to="/dashboard" end className={menuItemClass}>
            <span>📊</span>
            {isSidebarOpen && <span>Overview</span>}
          </NavLink>

          {/* ➕ Menu baru: Jadwal */}
          <NavLink to="/dashboard/jadwal" className={menuItemClass}>
            <span>📅</span>
            {isSidebarOpen && <span>Jadwal</span>}
          </NavLink>

          <NavLink to="/dashboard/users" className={menuItemClass}>
            <span>👥</span>
            {isSidebarOpen && <span>Users</span>}
          </NavLink>

          <NavLink to="/dashboard/settings" className={menuItemClass}>
            <span>⚙️</span>
            {isSidebarOpen && <span>Settings</span>}
          </NavLink>
        </nav>

        {/* Logout di bawah */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-red-400"
          >
            🚪 {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md border border-slate-200"
            >
              ☰
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-800">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-slate-500">
              Hi, Azka 👋
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-300" />
          </div>
        </header>

        {/* Konten route */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
