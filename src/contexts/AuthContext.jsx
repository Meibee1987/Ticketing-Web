import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserRole(session.user.id);
          setUser(session.user);
        } else {
          setUser(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserRole(session.user.id);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (authId) => {
    try {
      // Cek di tabel Teknisi
      const { data, error } = await supabase
        .from('Teknisi')
        .select(
          'id, nama_teknisi, roles_id, roles:roles_id(id, role, deskripsi)'
        )
        .eq('auth_id', authId)
        .single();

      if (!error && data) {
        setUserRole({
          userId: data.id,
          name: data.nama_teknisi,
          roleId: data.roles_id,
          roleName: data.roles?.role || 'user',
          roleDesc: data.roles?.deskripsi || '',
        });

        // Simpan ke localStorage untuk quick access
        localStorage.setItem(
          'userRole',
          JSON.stringify({
            userId: data.id,
            name: data.nama_teknisi,
            roleId: data.roles_id,
            roleName: data.roles?.role || 'user',
          })
        );
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('userRole');
  };

  const value = {
    user,
    userRole,
    loading,
    signOut,
    isAdmin:
      userRole?.roleName === 'admin' || userRole?.roleName === 'super admin',
    isSuperAdmin: userRole?.roleName === 'super admin',
    isUser: userRole?.roleName === 'user',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
