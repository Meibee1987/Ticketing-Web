import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
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
