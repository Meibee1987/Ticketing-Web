import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';
import { AuthContext } from './authContextValue';

const DEFAULT_ROLE = {
  userId: null,
  name: 'User',
  roleId: 3,
  roleName: 'user',
  roleDesc: '',
};
const STORAGE_KEY = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0] || 'app'}-auth-token`;
const USER_ROLE_KEY = 'userRole';
const ROLE_EXPIRY_KEY = 'userRoleExpiry';
const ROLE_EXPIRY_HOURS = 1; // Role data expire setelah 1 jam

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchRoleRef = useRef(null); // Prevent duplicate fetch

  const clearSession = useCallback(() => {
    setUser(null);
    setUserRole(null);
    sessionStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(ROLE_EXPIRY_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(`${STORAGE_KEY}-code-verifier`);
    localStorage.removeItem(`${STORAGE_KEY}-code-verifier`);
    localStorage.removeItem('sb-session-expiry');
    setLoading(false);
  }, []);

  const fetchUserRole = useCallback(async (authId) => {
    // Prevent multiple simultaneous fetches
    if (fetchRoleRef.current === authId) return;
    fetchRoleRef.current = authId;

    try {
      // Check sessionStorage first dengan expiry check
      const savedRole = sessionStorage.getItem(USER_ROLE_KEY);
      const expiry = localStorage.getItem(ROLE_EXPIRY_KEY);
      const isExpired = expiry && Date.now() > parseInt(expiry);

      if (savedRole && !isExpired) {
        try {
          const parsed = JSON.parse(savedRole);
          setUserRole(parsed);
          return; // Gunakan cached role jika masih valid
        } catch {
          console.warn('Invalid saved role, fetching fresh');
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
        // Simpan di sessionStorage dengan expiry
        sessionStorage.setItem(USER_ROLE_KEY, JSON.stringify(roleData));
        const expiryTime = Date.now() + ROLE_EXPIRY_HOURS * 60 * 60 * 1000;
        localStorage.setItem(ROLE_EXPIRY_KEY, expiryTime.toString());
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
        // Simpan di sessionStorage dengan expiry
        sessionStorage.setItem(USER_ROLE_KEY, JSON.stringify(roleData));
        const expiryTime = Date.now() + ROLE_EXPIRY_HOURS * 60 * 60 * 1000;
        localStorage.setItem(ROLE_EXPIRY_KEY, expiryTime.toString());
        return;
      }

      // 3. Jika tidak ditemukan di kedua tabel, gunakan default
      setUserRole(DEFAULT_ROLE);
    } catch (err) {
      console.warn('Role fetch failed, using cached/default:', err.message);
      // Keep existing userRole or use default
      const savedRole = sessionStorage.getItem(USER_ROLE_KEY);
      const roleData = savedRole ? JSON.parse(savedRole) : DEFAULT_ROLE;
      setUserRole((currentRole) => currentRole || roleData);
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
      (event, session) => {
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

          // Jalankan query role setelah callback auth selesai. Callback async yang
          // memanggil Supabase kembali dapat menahan auth lock dan membuat
          // signOut menunggu selamanya.
          window.setTimeout(() => {
            fetchUserRole(session.user.id).finally(() => setLoading(false));
          }, 0);
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [checkUser, clearSession, fetchUserRole]);

  const signOut = useCallback(async () => {
    let timeoutId;

    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => {
          timeoutId = window.setTimeout(
            () => resolve({ error: new Error('Logout timeout') }),
            2000
          );
        }),
      ]);

      if (result?.error) {
        console.warn(
          'Supabase logout failed, clearing local session:',
          result.error
        );
      }
    } catch (error) {
      console.warn('Unexpected logout error, clearing local session:', error);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      clearSession();
    }
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
