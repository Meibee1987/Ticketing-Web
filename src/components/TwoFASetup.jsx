import { useState, useEffect } from 'react';
import {
  enrollTOTP,
  verifyOTPCode,
  unenrollTOTP,
  getEnrolledFactors,
} from '../utils/twoFactorAuth';

export default function TwoFASetup() {
  const [step, setStep] = useState('initial'); // initial, setup, verify, success, enabled
  const [totp, setTotp] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [existingFactor, setExistingFactor] = useState(null);

  // Check if user already has 2FA enabled
  useEffect(() => {
    const checkExisting2FA = async () => {
      try {
        const factors = await getEnrolledFactors();
        if (factors?.totp && factors.totp.length > 0) {
          const verifiedFactor = factors.totp.find(
            (f) => f.status === 'verified'
          );
          if (verifiedFactor) {
            setExistingFactor(verifiedFactor);
            setStep('enabled');
          }
        }
      } catch (err) {
        console.error('Error checking 2FA status:', err);
      }
    };
    checkExisting2FA();
  }, []);

  const handleEnroll = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await enrollTOTP();
      setTotp(data);
      setStep('setup');
    } catch (err) {
      setError(err.message || 'Gagal enroll 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (otpCode.length !== 6) {
      setError('OTP harus 6 digit');
      setLoading(false);
      return;
    }

    try {
      await verifyOTPCode(totp.id, otpCode);
      setStep('success');
    } catch (err) {
      setError(err.message || 'OTP tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menonaktifkan 2FA?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const factorId = existingFactor?.id || totp?.id;
      if (!factorId) {
        throw new Error('Factor ID tidak ditemukan');
      }
      await unenrollTOTP(factorId);
      setStep('initial');
      setTotp(null);
      setExistingFactor(null);
      setOtpCode('');
    } catch (err) {
      setError(err.message || 'Gagal disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('initial');
    setTotp(null);
    setOtpCode('');
    setError('');
    setShowSecret(false);
    setExistingFactor(null);
  };

  // STEP: Initial
  if (step === 'initial') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-2 15l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-gray-500">
              Tambahkan lapisan keamanan ekstra pada akun Anda
            </p>
          </div>
        </div>

        <button
          onClick={handleEnroll}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses...' : 'Aktifkan 2FA'}
        </button>
      </div>
    );
  }

  // STEP: Setup (Scan QR Code)
  if (step === 'setup') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Step 1: Scan QR Code
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Gunakan aplikasi authenticator seperti Google Authenticator, Microsoft
          Authenticator, atau Authy untuk scan QR code berikut:
        </p>

        {totp?.totp?.qr_code && (
          <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={totp.totp.qr_code}
              alt="QR Code"
              className="w-64 h-64 border-4 border-gray-200 rounded"
            />
          </div>
        )}

        {/* Secret Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Atau salin secret key ini jika QR code tidak bisa di-scan:
          </label>
          <div className="flex gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              value={totp?.totp?.secret || ''}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              {showSecret ? 'Sembunyikan' : 'Tampilkan'}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(totp?.totp?.secret || '');
                alert('Secret key copied!');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Next Step */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => setStep('verify')}
            className="flex-1 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Lanjut Verifikasi
          </button>
        </div>
      </div>
    );
  }

  // STEP: Verify (Enter OTP)
  if (step === 'verify') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Step 2: Verifikasi OTP
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Masukkan 6-digit kode dari aplikasi authenticator Anda:
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              className="w-full text-center text-2xl tracking-widest bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-mono"
              placeholder="000000"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength="6"
              required
              autoFocus
            />
            <p className="text-gray-500 text-xs mt-2 text-center">
              {otpCode.length}/6 digits
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('setup')}
              className="flex-1 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="flex-1 py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STEP: Success
  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-green-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          2FA Berhasil Diaktifkan
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Akun Anda sekarang dilindungi dengan Two-Factor Authentication
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Catatan Penting:</strong> Simpan kode backup Anda di tempat
            yang aman. Jika Anda kehilangan akses ke aplikasi authenticator,
            Anda akan membutuhkan kode ini untuk login.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReset}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Selesai
          </button>

          <button
            onClick={handleDisable}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg border border-red-300 hover:bg-red-50 text-red-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Nonaktifkan 2FA'}
          </button>
        </div>
      </div>
    );
  }

  // STEP: Already Enabled (user sudah punya 2FA aktif)
  if (step === 'enabled') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-green-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          2FA Sudah Aktif ✓
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Akun Anda dilindungi dengan Two-Factor Authentication
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleDisable}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg border border-red-300 hover:bg-red-50 text-red-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses...' : 'Nonaktifkan 2FA'}
        </button>
      </div>
    );
  }
}
