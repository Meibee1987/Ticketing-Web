// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import pages & layout
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import LoginPage from './Pages/LoginPage';
import LoginPageOTP from './Pages/LoginPageOTP';
import JadwalMonitor from './Pages/JadwalMonitor';

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPageOTP />} />
          <Route path="/login-password" element={<LoginPage />} />
          <Route path="/jadwal-monitor" element={<JadwalMonitor />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              {/* Default redirect ke jadwal untuk semua role */}
              <Route
                index
                element={<Navigate to="/dashboard/jadwal" replace />}
              />

              {/* === HALAMAN UNTUK SEMUA ROLE (termasuk dosen) === */}
              <Route path="jadwal" element={<JadwalPage />} />
              <Route path="ruangan" element={<RuanganPage />} />

              {/* === HALAMAN KHUSUS ADMIN (tidak untuk dosen) === */}
              <Route
                path="ticketing"
                element={
                  <RoleProtectedRoute
                    allowedRoles={['super admin', 'admin', 'user']}
                  >
                    <TicketingPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="tickets"
                element={
                  <RoleProtectedRoute
                    allowedRoles={['super admin', 'admin', 'user']}
                  >
                    <AllTicketsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="my-tickets"
                element={
                  <RoleProtectedRoute
                    allowedRoles={['super admin', 'admin', 'user']}
                  >
                    <MyTicketsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <RoleProtectedRoute allowedRoles={['super admin']}>
                    <UsersPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                    <SettingsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="jadwal-admin"
                element={
                  <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                    <JadwalPageAdmin />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="database"
                element={
                  <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                    <MasterData />
                  </RoleProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* Root redirect ke login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Redirect semua undefined routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
