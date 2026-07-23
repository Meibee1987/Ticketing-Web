import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

const LoginPage = lazy(() => import('./Pages/LoginPage'));
const LoginPageOTP = lazy(() => import('./Pages/LoginPageOTP'));
const JadwalMonitor = lazy(() => import('./Pages/JadwalMonitor'));
const NewDashboardLayout = lazy(
  () => import('./components/layout/NewDashboardLayout')
);
const NewOverviewPage = lazy(() => import('./Pages/dashboard/NewOverviewPage'));
const TicketingPage = lazy(() => import('./Pages/dashboard/TicketingPage'));
const AllTicketsPage = lazy(() => import('./Pages/dashboard/AllTicketsPage'));
const MyTicketsPage = lazy(() => import('./Pages/dashboard/MyTicketsPage'));
const UsersPage = lazy(() => import('./Pages/dashboard/UsersPage'));
const SettingsPage = lazy(() => import('./Pages/dashboard/SettingsPage'));
const JadwalPage = lazy(() => import('./Pages/dashboard/JadwalPage'));
const JadwalPageAdmin = lazy(() => import('./Pages/dashboard/JadwalPageAdmin'));
const RuanganPage = lazy(() => import('./Pages/dashboard/RuanganPage'));
const MasterData = lazy(() => import('./Pages/dashboard/MasterData'));
const MonitorSettings = lazy(() => import('./Pages/dashboard/MonitorSettings'));
const NotFoundPage = lazy(() => import('./Pages/NotFoundPage'));

function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <span className="text-sm font-medium">Memuat halaman...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPageOTP />} />
            <Route path="/login-password" element={<LoginPage />} />
            <Route path="/jadwal-monitor" element={<JadwalMonitor />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<NewDashboardLayout />}>
                <Route index element={<NewOverviewPage />} />
                <Route path="jadwal" element={<JadwalPage />} />
                <Route path="ruangan" element={<RuanganPage />} />
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
                <Route
                  path="monitor-settings"
                  element={
                    <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
                      <MonitorSettings />
                    </RoleProtectedRoute>
                  }
                />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
