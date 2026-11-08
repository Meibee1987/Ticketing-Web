import { supabase } from '../supabaseClient';

/**
 * Cek cooldown OTP untuk email tertentu
 * @param {string} email - Email user
 * @returns {{isOnCooldown: boolean, remainingSeconds: number}}
 */
export function checkOtpCooldown(email) {
  try {
    const cooldownEndStr = localStorage.getItem(`otp_cooldown_${email}`);
    if (!cooldownEndStr) {
      return { isOnCooldown: false, remainingSeconds: 0 };
    }

    const cooldownEnd = parseInt(cooldownEndStr);
    const now = Date.now();

    if (now >= cooldownEnd) {
      // Cooldown sudah berakhir, hapus dari localStorage
      localStorage.removeItem(`otp_cooldown_${email}`);
      return { isOnCooldown: false, remainingSeconds: 0 };
    }

    const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
    return { isOnCooldown: true, remainingSeconds };
  } catch {
    // Jika error parsing, abaikan
    return { isOnCooldown: false, remainingSeconds: 0 };
  }
}

/**
 * Set cooldown OTP untuk email tertentu
 * @param {string} email - Email user
 * @param {number} seconds - Durasi cooldown dalam detik
 */
export function setOtpCooldown(email, seconds = 60) {
  const cooldownEnd = Date.now() + seconds * 1000;
  localStorage.setItem(`otp_cooldown_${email}`, cooldownEnd.toString());
}

/**
 * Cek apakah email sudah terdaftar di tabel Teknisi atau Dosen
 * @param {string} email - Email user
 * @returns {Promise<{isRegistered: boolean, userInfo: object|null, userType: string|null}>}
 */
export async function checkEmailRegistration(email) {
  try {
    // 1. Cek di tabel Teknisi dulu
    const { data: teknisiData, error: teknisiError } = await supabase
      .from('Teknisi')
      .select('id, email, nama_teknisi, roles_id')
      .eq('email', email)
      .single();

    if (!teknisiError && teknisiData) {
      return {
        isRegistered: true,
        userInfo: teknisiData,
        userType: 'teknisi',
      };
    }

    // 2. Jika tidak ditemukan di Teknisi, cek di tabel dosen
    const { data: dosenData, error: dosenError } = await supabase
      .from('dosen')
      .select('id, email, nama_dosen, roles_id')
      .eq('email', email)
      .not('roles_id', 'is', null) // Hanya dosen yang sudah punya role
      .single();

    if (!dosenError && dosenData) {
      return {
        isRegistered: true,
        userInfo: dosenData,
        userType: 'dosen',
      };
    }

    // 3. Tidak ditemukan di kedua tabel
    return { isRegistered: false, userInfo: null, userType: null };
  } catch {
    throw new Error('Gagal memverifikasi email. Coba lagi.');
  }
}

/**
 * Kirim OTP ke email user
 * Hanya email yang terdaftar di tabel Teknisi atau Dosen (dengan role) yang bisa menerima OTP
 * @param {string} email - Email user
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendEmailOTP(email) {
  // Cek email terdaftar terlebih dahulu
  const { isRegistered, userInfo, userType } =
    await checkEmailRegistration(email);

  if (!isRegistered) {
    throw new Error(
      'Email belum terdaftar atau belum di-assign role. Hubungi admin untuk mendaftarkan email Anda.'
    );
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    // Handle specific error codes
    const errorLower = error.message?.toLowerCase() || '';

    // Cek apakah ini "email rate limit exceeded" (hard limit, butuh waktu lama)
    const isHardRateLimit =
      errorLower.includes('email rate limit') ||
      errorLower.includes('rate limit exceeded');

    // Cek rate limit biasa (per-request)
    const isSoftRateLimit =
      error.status === 429 ||
      errorLower.includes('too many requests') ||
      errorLower.includes('rate limit') ||
      errorLower.includes('security purposes') ||
      errorLower.includes('request this after');

    if (isHardRateLimit || isSoftRateLimit) {
      let waitTime;

      if (isHardRateLimit) {
        // Hard rate limit: Supabase blokir pengiriman email, perlu tunggu lebih lama
        // Cek apakah sudah ada cooldown sebelumnya (artinya user sudah pernah kena rate limit)
        const existingCooldown = localStorage.getItem(`otp_cooldown_${email}`);
        const existingRemaining = existingCooldown
          ? Math.max(
              0,
              Math.ceil((parseInt(existingCooldown) - Date.now()) / 1000)
            )
          : 0;

        if (existingRemaining > 60) {
          // Sudah ada cooldown panjang yang belum habis, perpanjang sedikit
          waitTime = existingRemaining + 30;
        } else {
          // Pertama kali kena hard rate limit, set 5 menit
          waitTime = 300;
        }
      } else {
        // Soft rate limit: parse waktu tunggu dari error message
        waitTime = 60; // Default 60 detik

        const patterns = [
          /after\s+(\d+)\s+second/i,
          /wait\s+(\d+)\s+second/i,
          /(\d+)\s*s(?:econd)?s?(?:\s|$)/i,
          /(\d+)\s*menit/i,
          /(\d+)\s*minute/i,
          /tunggu\s+(\d+)\s+detik/i,
        ];

        for (const pattern of patterns) {
          const match = errorLower.match(pattern);
          if (match) {
            const value = parseInt(match[1]);
            if (
              pattern.source.includes('menit') ||
              pattern.source.includes('minute')
            ) {
              waitTime = value * 60;
            } else {
              waitTime = value;
            }
            break;
          }
        }

        // Tambah buffer 5 detik
        waitTime = waitTime + 5;
      }

      // Simpan cooldown end time ke localStorage
      const cooldownEnd = Date.now() + waitTime * 1000;
      localStorage.setItem(`otp_cooldown_${email}`, cooldownEnd.toString());

      const minutes = Math.ceil(waitTime / 60);
      const errorMsg = isHardRateLimit
        ? `Batas pengiriman email tercapai. Tunggu ${minutes} menit (${waitTime} detik) sebelum mencoba lagi.`
        : `Terlalu banyak permintaan. Tunggu ${waitTime} detik sebelum mencoba lagi.`;

      throw new Error(errorMsg);
    }

    if (errorLower.includes('12 seconds')) {
      const cooldownEnd12 = Date.now() + 15 * 1000;
      localStorage.setItem(`otp_cooldown_${email}`, cooldownEnd12.toString());
      throw new Error('Harap tunggu 15 detik sebelum mengirim OTP lagi.');
    }

    if (errorLower.includes('signups not allowed')) {
      throw new Error('Email belum terdaftar di akun login. Hubungi admin.');
    }

    // Handle unexpected_failure: biasanya terjadi karena SMTP tidak dikonfigurasi
    // atau batas email Supabase free tier sudah habis
    if (
      error.code === 'unexpected_failure' ||
      errorLower.includes('unexpected_failure') ||
      errorLower.includes('error sending magic link email')
    ) {
      throw new Error(
        'Gagal mengirim email OTP. Layanan email sedang tidak tersedia. Hubungi admin untuk memeriksa konfigurasi SMTP di Supabase Dashboard.'
      );
    }

    throw new Error(error.message);
  }

  return {
    success: true,
    message: 'OTP berhasil dikirim ke email Anda',
    data,
    userInfo,
    userType,
  };
}

/**
 * Verifikasi OTP dari email
 * @param {string} email - Email user
 * @param {string} token - OTP code 6 digit
 * @returns {Promise<{success: boolean, session: object}>}
 */
export async function verifyEmailOTP(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    const message = error.message?.toLowerCase() || '';
    if (error.code === 'otp_expired' || message.includes('expired')) {
      // Supabase dapat memakai otp_expired untuk kode salah maupun kedaluwarsa.
      throw new Error('OTP salah atau sudah kedaluwarsa. Kirim ulang OTP.');
    }
    if (message.includes('invalid') || error.status === 403) {
      throw new Error('OTP tidak valid. Periksa kode yang Anda masukkan.');
    }
    throw new Error('Gagal memverifikasi OTP. Coba lagi.');
  }

  if (!data?.session || !data?.user) {
    throw new Error('Sesi login belum terbentuk. Silakan coba lagi.');
  }

  // Supabase mengelola sesi; AuthContext tetap mengambil role dari relasi existing.
  return {
    success: true,
    session: data.session,
    user: data.user,
  };
}

/**
 * Resend OTP ke email (jika expired atau tidak terkirim)
 * @param {string} email - Email user
 */
export async function resendEmailOTP(email) {
  return sendEmailOTP(email);
}
