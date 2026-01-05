// src/App.jsx
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

// Import pages & layout
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import LoginPage from './Pages/LoginPage';

import DashboardLayout from './Pages/dashboard/DashboardLayout';
import OverviewPage from './Pages/dashboard/OverviewPage';
import DashboardTicketPage from './Pages/dashboard/DashboardTicketPage';
import TicketingPage from './Pages/dashboard/TicketingPage';
import AllTicketsPage from './Pages/dashboard/AllTicketsPage';
import MyTicketsPage from './Pages/dashboard/MyTicketsPage';
import UsersPage from './Pages/dashboard/UsersPage';
import SettingsPage from './Pages/dashboard/SettingsPage';
import JadwalPage from './Pages/dashboard/JadwalPage';
import JadwalPageAdmin from './Pages/dashboard/JadwalPageAdmin';
import RuanganPage from './Pages/dashboard/RuanganPage';
import MasterData from './Pages/dashboard/MasterData';

// Router configuration
const router = createBrowserRouter([
  // Public Route
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected Routes (harus login)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardLayout />,

        // Nested routes di dalam dashboard
        children: [
          { index: true, element: <DashboardTicketPage /> }, // /dashboard
          { path: 'ticketing', element: <TicketingPage /> }, // /dashboard/ticketing
          { path: 'tickets', element: <AllTicketsPage /> }, // /dashboard/tickets
          { path: 'my-tickets', element: <MyTicketsPage /> }, // /dashboard/my-tickets (includes create ticket)
          {
            path: 'users',
            element: (
              <RoleProtectedRoute allowedRoles={['super admin']}>
                <UsersPage />
              </RoleProtectedRoute>
            ),
          }, // Hanya super admin
          {
            path: 'settings',
            element: (
              <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                <SettingsPage />
              </RoleProtectedRoute>
            ),
          }, // super admin & admin
          { path: 'jadwal', element: <JadwalPage /> }, // Semua role bisa akses
          {
            path: 'jadwal-admin',
            element: (
              <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                <JadwalPageAdmin />
              </RoleProtectedRoute>
            ),
          }, // Hanya super admin & admin
          { path: 'ruangan', element: <RuanganPage /> }, // Semua role bisa akses
          {
            path: 'database',
            element: (
              <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                <MasterData />
              </RoleProtectedRoute>
            ),
          }, // super admin & admin
        ],
      },
    ],
  },

  // Redirect semua undefined routes
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
