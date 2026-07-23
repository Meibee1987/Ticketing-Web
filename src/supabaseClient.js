import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage dengan expiry untuk keamanan lebih baik
const createSecureStorage = () => {
  const SESSION_KEY = 'sb-session';
  const EXPIRY_KEY = 'sb-session-expiry';
  const EXPIRY_HOURS = 24; // Session berlaku 24 jam

  return {
    getItem: (key) => {
      try {
        // Untuk auth token, gunakan sessionStorage
        if (key.includes('auth-token')) {
          const item = sessionStorage.getItem(key);
          if (item) {
            const expiry = localStorage.getItem(EXPIRY_KEY);
            if (expiry && Date.now() > parseInt(expiry)) {
              // Session expired, hapus
              sessionStorage.removeItem(key);
              localStorage.removeItem(EXPIRY_KEY);
              return null;
            }
          }
          return item;
        }
        // Untuk lainnya tetap localStorage
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Storage error:', error);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        if (key.includes('auth-token')) {
          // Simpan di sessionStorage dengan expiry
          sessionStorage.setItem(key, value);
          const expiryTime = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
          localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
        } else {
          localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('Storage error:', error);
      }
    },
    removeItem: (key) => {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
        if (key.includes('auth-token')) {
          localStorage.removeItem(EXPIRY_KEY);
        }
      } catch (error) {
        console.warn('Storage error:', error);
      }
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: createSecureStorage(),
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'ticketing-web',
    },
  },
});

// Bersihkan session yang rusak saat pertama kali load
// Ini mencegah error "Invalid Refresh Token" berulang
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh gagal, bersihkan
    supabase.auth.signOut().catch(() => {});
  }
});

export const TOKEN_KEY = 'supabase_session';
