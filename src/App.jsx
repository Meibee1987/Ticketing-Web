// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardTicketPage />} />
              <Route path="ticketing" element={<TicketingPage />} />
              <Route path="tickets" element={<AllTicketsPage />} />
              <Route path="my-tickets" element={<MyTicketsPage />} />
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
              <Route path="jadwal" element={<JadwalPage />} />
              <Route
                path="jadwal-admin"
                element={
                  <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                    <JadwalPageAdmin />
                  </RoleProtectedRoute>
                }
              />
              <Route path="ruangan" element={<RuanganPage />} />
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

          {/* Redirect semua undefined routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
