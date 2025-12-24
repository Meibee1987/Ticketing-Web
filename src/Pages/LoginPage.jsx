// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, TOKEN_KEY } from '../supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Jika sudah login, lempar ke main page
  useEffect(() => {
    const session =
      JSON.parse(localStorage.getItem(TOKEN_KEY)) ||
      JSON.parse(sessionStorage.getItem(TOKEN_KEY));

    if (session) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email atau password salah.');
      return;
    }

    const session = data.session;

    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      localStorage.removeItem(TOKEN_KEY);
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md px-8 py-12 relative">
        {/* ICON bulat */}
        <div className="flex justify-center -mt-20 mb-8">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-14 w-14 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
            </svg>
          </div>
        </div>

        <h2 className="text-center text-2xl font-semibold text-gray-800 mb-2">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Please sign in to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
              <input
                type="email"
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
              <input
                type="password"
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
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
            <span className="text-gray-600 text-sm">Remember me</span>
          </label>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-xs text-center">{error}</p>
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
