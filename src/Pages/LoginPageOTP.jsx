// src/pages/LoginPageOTP.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  sendEmailOTP,
  verifyEmailOTP,
  checkOtpCooldown,
  setOtpCooldown,
} from '../utils/emailOTP';

export default function LoginPageOTP() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' atau 'otp'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Cek session saat load dan restore cooldown dari localStorage
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // Session tidak valid (misalnya refresh token expired/not found)
          // Bersihkan session yang rusak supaya tidak terus error
          console.warn('Session invalid, signing out:', error.message);
          await supabase.auth.signOut();
          localStorage.removeItem('supabase_session');
          return;
        }

        if (session) {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        // Jika error apapun saat cek session, bersihkan saja
        console.warn('Error checking session, clearing:', err.message);
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('supabase_session');
      }
    };

    // Cek session
    checkSession();

    // Restore cooldown dari localStorage (berlaku di semua step)
    if (email) {
      const { isOnCooldown, remainingSeconds } = checkOtpCooldown(email);
      if (isOnCooldown) {
        setCountdown(remainingSeconds);
      }
    }
  }, [step, email]);

  // Countdown timer untuk resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle kirim OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Cek apakah masih dalam cooldown sebelumnya
    const { isOnCooldown, remainingSeconds } = checkOtpCooldown(email);
    if (isOnCooldown) {
      setCountdown(remainingSeconds);
      return;
    }

    setIsLoading(true);

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Masukkan email yang valid');
      setIsLoading(false);
      return;
    }

    try {
      await sendEmailOTP(email);
      setSuccess('OTP berhasil dikirim! Cek email Anda.');
      setStep('otp');
      // Set cooldown di localStorage dan UI agar sinkron dengan Supabase
      setOtpCooldown(email, 60);
      setCountdown(60);
    } catch (err) {
      // Error dari sendEmailOTP sudah set localStorage cooldown
      // Cukup ambil dari localStorage, jangan parse ulang
      const errorMsg = err.message || 'Gagal mengirim OTP. Coba lagi.';

      // Check apakah cooldown sudah di-set di localStorage (dari emailOTP.js)
      const { isOnCooldown, remainingSeconds } = checkOtpCooldown(email);
      if (isOnCooldown) {
        setCountdown(remainingSeconds);
        // Countdown banner akan tampil otomatis, tidak perlu set error
        setError('');
      } else {
        // Error bukan rate-limit (misal: email tidak terdaftar), tampilkan saja tanpa cooldown
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verifikasi OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate OTP
    if (otp.length !== 6) {
      setError('OTP harus 6 digit');
      setIsLoading(false);
      return;
    }

    try {
      const result = await verifyEmailOTP(email, otp);
      if (result.success && result.session) {
        // Clear cooldown saat login berhasil
        localStorage.removeItem(`otp_cooldown_${email}`);
        setSuccess('Login berhasil! Mengalihkan...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'OTP tidak valid atau sudah expired');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    // Cek apakah masih dalam cooldown
    const { isOnCooldown, remainingSeconds } = checkOtpCooldown(email);
    if (isOnCooldown || countdown > 0) {
      const waitTime = Math.max(countdown, remainingSeconds);
      setCountdown(waitTime);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await sendEmailOTP(email);
      setSuccess('OTP baru berhasil dikirim!');
      // Set cooldown di localStorage dan UI
      setOtpCooldown(email, 60);
      setCountdown(60);
    } catch (err) {
      // Error dari sendEmailOTP sudah set localStorage cooldown
      const errorMsg = err.message || 'Gagal mengirim OTP';

      // Check apakah cooldown sudah di-set di localStorage (dari emailOTP.js)
      const { isOnCooldown, remainingSeconds } = checkOtpCooldown(email);
      if (isOnCooldown) {
        setCountdown(remainingSeconds);
        setError('');
      } else {
        // Error bukan rate-limit, tampilkan saja tanpa cooldown tambahan
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back to email step
  const handleBack = () => {
    setStep('email');
    setOtp('');
    setError('');
    setSuccess('');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md px-8 py-12 relative">
        {/* ICON */}
        <div className="flex justify-center -mt-20 mb-8">
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl ${
              step === 'email'
                ? 'bg-gradient-to-br from-blue-400 to-blue-500'
                : 'bg-gradient-to-br from-green-400 to-green-500'
            }`}
          >
            {step === 'email' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            )}
          </div>
        </div>

        {/* STEP 1: Email Input */}
        {step === 'email' && (
          <>
            <h2 className="text-center text-2xl font-semibold text-gray-800 mb-2">
              Login dengan Email
            </h2>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Masukkan email untuk menerima kode OTP
            </p>

            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  <input
                    type="email"
                    className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Countdown Warning - live countdown */}
              {countdown > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-700 text-xs text-center font-medium">
                    ⏳ Tunggu{' '}
                    {countdown > 60
                      ? `${Math.ceil(countdown / 60)} menit ${countdown % 60} detik`
                      : `${countdown} detik`}{' '}
                    sebelum mengirim OTP lagi
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-xs text-center">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-xs text-center">
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || countdown > 0}
                className="w-full py-3.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Mengirim...
                  </span>
                ) : countdown > 0 ? (
                  `Kirim OTP (${countdown}s)`
                ) : (
                  'Kirim OTP'
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 'otp' && (
          <>
            <h2 className="text-center text-2xl font-semibold text-gray-800 mb-2">
              Verifikasi OTP
            </h2>
            <p className="text-center text-gray-500 mb-2 text-sm">
              Masukkan 6 digit kode yang dikirim ke
            </p>
            <p className="text-center text-blue-600 font-medium mb-6 text-sm">
              {email}
            </p>

            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-4 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  maxLength="6"
                  required
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  {otp.length}/6 digit
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-xs text-center">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-xs text-center">
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Memverifikasi...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>

              {/* Resend & Back buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  ← Ganti Email
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0 || isLoading}
                  className={`text-sm font-medium ${
                    countdown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  {countdown > 0
                    ? `Kirim ulang (${countdown}s)`
                    : 'Kirim Ulang OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-400 text-xs">
            Cek folder spam jika tidak menemukan email OTP
          </p>
        </div>
        <div>
          <p className="text-center text-gray-400 text-xs">Version 1.0.1</p>
        </div>
      </div>
    </div>
  );
}
