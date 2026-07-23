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
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Topbar */}
        <Topbar title={title} onMenuClick={() => setSidebarOpen((v) => !v)} />

        {/* Main content area */}
        <main className="min-h-screen pt-[68px] lg:ml-[236px]">
          <div className="app-page px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}
