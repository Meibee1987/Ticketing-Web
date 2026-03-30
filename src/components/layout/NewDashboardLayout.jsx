/**
 * NewDashboardLayout – Shell layout (Sidebar + Topbar + <Outlet />)
 * Replaces old DashboardLayout with Figma-matching design
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { NotificationProvider } from '../../contexts/NotificationContext';

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/dashboard/jadwal': 'Jadwal',
  '/dashboard/jadwal-admin': 'Jadwal Admin',
  '/dashboard/ruangan': 'Ruangan',
  '/dashboard/database': 'Master Data',
  '/dashboard/users': 'Users',
  '/dashboard/settings': 'Settings',
  '/dashboard/monitor-settings': 'Monitor Settings',
  '/dashboard/ticketing': 'Ticketing',
  '/dashboard/tickets': 'All Tickets',
  '/dashboard/my-tickets': 'My Tickets',
};

export default function NewDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = ROUTE_TITLES[location.pathname] || 'Dashboard';

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[var(--color-background)]">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Topbar */}
        <Topbar title={title} onMenuClick={() => setSidebarOpen((v) => !v)} />

        {/* Main content area */}
        <main className="lg:ml-[260px] pt-[72px] min-h-screen">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}
