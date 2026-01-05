import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika allowedRoles kosong, izinkan semua role yang sudah login
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check apakah role user ada di allowedRoles
  const hasAccess = allowedRoles.includes(userRole?.roleName);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-slate-600 mb-4">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <p className="text-sm text-slate-500">
            Role Anda:{' '}
            <span className="font-semibold">
              {userRole?.roleName || 'unknown'}
            </span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return children;
}
