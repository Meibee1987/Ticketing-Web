import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
);

const AccessDenied = ({ roleName }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center max-w-md p-8 bg-white rounded-lg shadow">
      <div className="text-6xl mb-4">🚫</div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
      <p className="text-slate-600 mb-4">
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <p className="text-sm text-slate-500">
        Role Anda:{' '}
        <span className="font-semibold">{roleName || 'unknown'}</span>
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

export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userRole, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.length || allowedRoles.includes(userRole?.roleName))
    return children;
  return <AccessDenied roleName={userRole?.roleName} />;
}
