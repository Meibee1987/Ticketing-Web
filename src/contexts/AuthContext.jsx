import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

const DEFAULT_ROLE = {
  userId: null,
  name: 'User',
  roleId: 3,
  roleName: 'user',
  roleDesc: '',
};
const STORAGE_KEY = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0] || 'app'}-auth-token`;
const USER_ROLE_KEY = 'userRole';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchRoleRef = useRef(null); // Prevent duplicate fetch

  const clearSession = useCallback(() => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setLoading(false);
  }, []);

  const fetchUserRole = useCallback(async (authId) => {
    // Prevent multiple simultaneous fetches
    if (fetchRoleRef.current === authId) return;
    fetchRoleRef.current = authId;

    try {
      // Check localStorage first for faster loading
      const savedRole = localStorage.getItem(USER_ROLE_KEY);
      if (savedRole) {
        try {
          const parsed = JSON.parse(savedRole);
          setUserRole(parsed);
        } catch (e) {
          console.warn('Invalid saved role, using default');
        }
      }

      // 1. Coba cari di tabel Teknisi dulu
      const { data: teknisiData, error: teknisiError } = await Promise.race([
        supabase
          .from('Teknisi')
          .select(
            'id, nama_teknisi, roles_id, roles:roles_id(id, role, deskripsi)'
          )
          .eq('auth_id', authId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000)
        ),
      ]);

      if (!teknisiError && teknisiData) {
        const roleData = {
          userId: teknisiData.id,
          name: teknisiData.nama_teknisi,
          roleId: teknisiData.roles_id,
          roleName: teknisiData.roles?.role || 'user',
          roleDesc: teknisiData.roles?.deskripsi || '',
          userType: 'teknisi',
        };
        setUserRole(roleData);
        localStorage.setItem(USER_ROLE_KEY, JSON.stringify(roleData));
        return;
      }

      // 2. Jika tidak ditemukan di Teknisi, cari di tabel dosen
      const { data: dosenData, error: dosenError } = await Promise.race([
        supabase
          .from('dosen')
          .select(
            'id, nama_dosen, email, roles_id, roles:roles_id(id, role, deskripsi)'
          )
          .eq('auth_id', authId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000)
        ),
      ]);

      if (!dosenError && dosenData) {
        const roleData = {
          userId: dosenData.id,
          name: dosenData.nama_dosen,
          roleId: dosenData.roles_id,
          roleName: dosenData.roles?.role || 'dosen',
          roleDesc: dosenData.roles?.deskripsi || '',
          userType: 'dosen',
        };
        setUserRole(roleData);
        localStorage.setItem(USER_ROLE_KEY, JSON.stringify(roleData));
        return;
      }

      // 3. Jika tidak ditemukan di kedua tabel, gunakan default
      if (!savedRole) {
        setUserRole(DEFAULT_ROLE);
      }
    } catch (err) {
      console.warn('Role fetch failed, using cached/default:', err.message);
      // Keep existing userRole or use default
      if (!userRole) {
        const savedRole = localStorage.getItem(USER_ROLE_KEY);
        const roleData = savedRole ? JSON.parse(savedRole) : DEFAULT_ROLE;
        setUserRole(roleData);
      }
    } finally {
      fetchRoleRef.current = null;
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (
        error?.message?.includes('Refresh Token') ||
        error?.message?.includes('refresh_token')
      ) {
        await supabase.auth.signOut();
        clearSession();
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
      }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession, fetchUserRole]);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Jangan fetch role jika belum ada user
        if (!session?.user) {
          if (['SIGNED_OUT', 'USER_DELETED'].includes(event)) {
            clearSession();
          } else {
            setUser(null);
            setUserRole(null);
          }
          setLoading(false);
          return;
        }

        // Hanya fetch role jika ada session valid
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setUser(session.user);
          await fetchUserRole(session.user.id);
          setLoading(false);
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [checkUser, clearSession, fetchUserRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      userRole,
      loading,
      signOut,
      isAdmin: ['admin', 'super admin'].includes(userRole?.roleName),
      isSuperAdmin: userRole?.roleName === 'super admin',
      isDosen: userRole?.roleName === 'dosen' || userRole?.userType === 'dosen',
      isUser: userRole?.roleName === 'user',
    }),
    [user, userRole, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
