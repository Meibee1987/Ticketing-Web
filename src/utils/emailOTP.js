import { supabase } from '../supabaseClient';

/**
 * Cek apakah email sudah terdaftar di tabel Teknisi
 * @param {string} email - Email user
 * @returns {Promise<{isRegistered: boolean, userInfo: object|null}>}
 */
export async function checkEmailRegistration(email) {
  try {
    const { data, error } = await supabase
      .from('Teknisi')
      .select('id, email, nama_teknisi, roles_id')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - email belum terdaftar
        return { isRegistered: false, userInfo: null };
      }
      throw error;
    }

    return {
      isRegistered: true,
      userInfo: data,
    };
  } catch (err) {
    console.error('Email registration check error:', err);
    throw new Error('Gagal memverifikasi email. Coba lagi.');
  }
}

/**
 * Kirim OTP ke email user
 * Hanya email yang terdaftar di tabel Teknisi yang bisa menerima OTP
 * @param {string} email - Email user
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendEmailOTP(email) {
  try {
    // Cek email terdaftar terlebih dahulu
    const { isRegistered, userInfo } = await checkEmailRegistration(email);

    if (!isRegistered) {
      throw new Error(
        'Email belum terdaftar. Hubungi admin untuk mendaftarkan email Anda.'
      );
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true, // Auto create user di Supabase Auth saat login pertama
      },
    });

    if (error) {
      console.error('Send OTP error:', error);

      // Handle specific error codes
      if (
        error.status === 429 ||
        error.message?.includes('Too Many Requests')
      ) {
        throw new Error(
          'Terlalu banyak permintaan. Tunggu 60 detik sebelum mencoba lagi.'
        );
      }

      if (error.message?.includes('12 seconds')) {
        throw new Error('Harap tunggu 12 detik sebelum mengirim OTP lagi.');
      }

      if (error.message?.includes('Signups not allowed')) {
        throw new Error(
          'Email OTP belum diaktifkan. Hubungi admin untuk mengaktifkan di Supabase Dashboard > Authentication > Email Provider.'
        );
      }

      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'OTP berhasil dikirim ke email Anda',
      data,
      userInfo,
    };
  } catch (err) {
    console.error('Unexpected error sending OTP:', err);
    throw err;
  }
}

/**
 * Verifikasi OTP dari email
 * @param {string} email - Email user
 * @param {string} token - OTP code 6 digit
 * @returns {Promise<{success: boolean, session: object}>}
 */
export async function verifyEmailOTP(email, token) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email', // untuk email OTP
    });

    if (error) {
      console.error('Verify OTP error:', error);

      // Handle specific error codes
      if (
        error.message?.includes('expired') ||
        error.message?.includes('invalid')
      ) {
        throw new Error(
          'OTP sudah kadaluarsa atau tidak valid. Kirim ulang OTP.'
        );
      }

      if (error.status === 403) {
        throw new Error('OTP tidak valid. Periksa kode yang Anda masukkan.');
      }

      throw new Error(error.message);
    }

    // Update auth_id di tabel Teknisi setelah login berhasil
    if (data.user && data.user.id) {
      try {
        await supabase
          .from('Teknisi')
          .update({ auth_id: data.user.id })
          .eq('email', email);
      } catch (updateErr) {
        console.error('Error updating auth_id:', updateErr);
        // Continue anyway, jangan throw error
      }
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
    };
  } catch (err) {
    console.error('Unexpected error verifying OTP:', err);
    throw err;
  }
}

/**
 * Resend OTP ke email (jika expired atau tidak terkirim)
 * @param {string} email - Email user
 */
export async function resendEmailOTP(email) {
  return sendEmailOTP(email);
}
