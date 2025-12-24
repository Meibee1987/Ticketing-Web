import { Navigate, Outlet } from 'react-router-dom';
import { TOKEN_KEY } from '../supabaseClient';

export default function ProtectedRoute() {
  const session =
    JSON.parse(localStorage.getItem(TOKEN_KEY)) ||
    JSON.parse(sessionStorage.getItem(TOKEN_KEY));

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
