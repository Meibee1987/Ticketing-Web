import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';

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
        console.log(
          '🔔 Auth event:',
          event,
          'Session:',
          session ? 'exists' : 'null'
        );

        try {
          // Handle token refresh errors
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.log('⚠️ Token refresh failed, clearing session');
            await clearSession();
            return;
          }

          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            await clearSession();
            return;
          }

          if (event === 'TOKEN_REFRESHED') {
            console.log('✅ Token refreshed successfully');
          }

          if (session?.user) {
            setUser(session.user);
            await fetchUserRole(session.user.id);
          } else {
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          // If any error, clear session
          if (error.message?.includes('Refresh Token')) {
            await clearSession();
          }
        } finally {
          setLoading(false);
          console.log('⏹️ Loading set to false');
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const clearSession = async () => {
    console.log('🧹 Clearing all session data...');
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem(
      'sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token'
    );
    setLoading(false);
  };

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user session...');
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log('📋 Session check result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        error: error?.message,
        expiresAt: session?.expires_at
          ? new Date(session.expires_at * 1000).toLocaleString()
          : 'N/A',
      });

      if (error) {
        console.error('❌ Session error:', error);
        // If token error, clear everything
        if (
          error.message?.includes('Refresh Token') ||
          error.message?.includes('refresh_token')
        ) {
          console.log('🧹 Invalid token detected, clearing...');
          await supabase.auth.signOut();
          await clearSession();
        }
        return;
      }

      if (session?.user) {
        console.log('✅ User found, fetching role...');
        await fetchUserRole(session.user.id);
        setUser(session.user);
      } else {
        console.log('⚠️ No session found');
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('❌ Error checking user:', error);
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (authId) => {
    try {
      console.log('🔍 Fetching role for auth_id:', authId);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching role')), 5000)
      );

      const fetchPromise = supabase
        .from('Teknisi')
        .select(
          'id, nama_teknisi, roles_id, roles:roles_id(id, role, deskripsi)'
        )
        .eq('auth_id', authId)
        .single();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) {
        console.error('❌ Error fetching role:', error);
        // Set default user role if fetch fails
        setUserRole({
          userId: null,
          name: 'User',
          roleId: 3,
          roleName: 'user',
          roleDesc: '',
        });
        return;
      }

      if (data) {
        console.log('✅ Role fetched:', data.roles?.role);
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
      console.error('❌ Error fetching user role:', error);
      // Set default user role on error
      setUserRole({
        userId: null,
        name: 'User',
        roleId: 3,
        roleName: 'user',
        roleDesc: '',
      });
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
