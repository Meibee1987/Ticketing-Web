// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TwoFAVerification from '../components/TwoFAVerification';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [need2FA, setNeed2FA] = useState(false);

  // Cek session saat load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // If token error, clear everything
        if (error?.message?.includes('Refresh Token')) {
          console.log('🧹 Clearing corrupt session...');
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          return;
        }

        if (session) {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError('Email atau password salah.');
        setIsLoading(false);
        return;
      }

      // Check if user has 2FA enrolled
      if (data?.session) {
        try {
          const { totp } = await supabase.auth.mfa.listFactors();

          // Jika user punya 2FA yang enrolled
          if (totp && totp.length > 0) {
            setNeed2FA(true);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking 2FA factors:', err);
        }

        // Jika tidak ada 2FA, langsung login
        window.location.href = '/dashboard';
      } else {
        setError('Gagal membuat session. Coba lagi.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    // 2FA verified, redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handle2FACancel = () => {
    setNeed2FA(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <>
      {need2FA ? (
        <TwoFAVerification
          email={email}
          onSuccess={handle2FASuccess}
          onCancel={handle2FACancel}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md px-6 sm:px-8 py-10 sm:py-12 relative">
            {/* ICON bulat */}
            <div className="flex justify-center -mt-16 sm:-mt-20 mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 sm:h-14 sm:w-14 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
                </svg>
              </div>
            </div>

            <h2 className="text-center text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
              Welcome Back
            </h2>
            <p className="text-center text-gray-500 mb-6 sm:mb-8 text-xs sm:text-sm">
              Please sign in to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* EMAIL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <input
                    type="email"
                    className="w-full bg-transparent outline-none text-xs sm:text-sm text-gray-700 placeholder-gray-400"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <input
                    type="password"
                    className="w-full bg-transparent outline-none text-xs sm:text-sm text-gray-700 placeholder-gray-400"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* REMEMBER ME */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-600 text-xs sm:text-sm">
                  Remember me
                </span>
              </label>

              {/* ERROR */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-xs text-center mb-2">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      localStorage.clear();
                      sessionStorage.clear();
                      setError('');
                      window.location.reload();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear session & reload
                  </button>
                </div>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 sm:py-3.5 rounded-lg bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
