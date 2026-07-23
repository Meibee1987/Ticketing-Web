import { useState, useEffect } from 'react';
import { verifyOTPCode, getEnrolledFactors } from '../utils/twoFactorAuth';

export default function TwoFAVerification({ email, onSuccess, onCancel }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState(null);

  // Get factor ID untuk user yang login
  useEffect(() => {
    const fetchFactorId = async () => {
      try {
        const { totp } = await getEnrolledFactors();
        if (totp && totp.length > 0) {
          setFactorId(totp[0].id);
        }
      } catch (err) {
        console.error('Error fetching factors:', err);
      }
    };

    fetchFactorId();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate OTP format
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('OTP harus 6 digit angka');
      setIsLoading(false);
      return;
    }

    try {
      if (!factorId) {
        setError('Factor ID tidak ditemukan');
        setIsLoading(false);
        return;
      }

      const result = await verifyOTPCode(factorId, otp);

      if (result) {
        onSuccess();
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'OTP tidak valid atau sudah expired');
      setOtp('');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md px-8 py-12 relative">
        {/* ICON */}
        <div className="flex justify-center -mt-20 mb-8">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-14 w-14 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-2 15l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z" />
            </svg>
          </div>
        </div>

        <h2 className="text-center text-2xl font-semibold text-gray-800 mb-2">
          2-Factor Authentication
        </h2>
        <p className="text-center text-gray-500 mb-2 text-sm">
          Enter the 6-digit code from your authenticator app
        </p>
        <p className="text-center text-gray-400 mb-8 text-xs">{email}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OTP INPUT */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              OTP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full text-center text-2xl tracking-widest bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
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
              {otp.length}/6 digits
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-xs text-center">{error}</p>
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-3.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="flex-1 py-3.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        {/* HELP TEXT */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-xs">
            Don't have access to your authenticator?{' '}
            <button
              type="button"
              onClick={onCancel}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try another method
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
