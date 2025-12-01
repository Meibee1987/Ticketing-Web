// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TOKEN_KEY } from "../supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Jika sudah login, lempar ke main page
  useEffect(() => {
    const session =
      JSON.parse(localStorage.getItem(TOKEN_KEY)) ||
      JSON.parse(sessionStorage.getItem(TOKEN_KEY));

    if (session) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email atau password salah.");
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

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
      <div className="fixed inset-0 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md px-10 py-10 relative">
          {/* ICON bulat */}
          <div className="flex justify-center -mt-16 mb-6">
            <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
              </svg>
            </div>
          </div>

          <h2 className="text-center text-xl font-semibold text-gray-800 mb-1">
            Welcome Back
          </h2>
          <p className="text-center text-gray-500 mb-8 text-sm">
            Please sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-3 shadow-sm">
                <input
                  type="email"
                  className="w-full outline-none text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-3 shadow-sm">
                <input
                  type="password"
                  className="w-full outline-none text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* REMEMBER ME */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-gray-600 text-sm">Remember me</span>
            </label>

            {/* ERROR */}
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-red-800 to-red-600 text-white text-sm font-semibold shadow-md"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
