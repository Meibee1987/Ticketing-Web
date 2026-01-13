import { supabase } from '../supabaseClient';

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
  } catch (err) {
    console.error('Email registration check error:', err);
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
  try {
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
      userType,
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

    // Update auth_id setelah login berhasil
    if (data.user && data.user.id) {
      try {
        // Cek user type dulu
        const { userType } = await checkEmailRegistration(email);

        if (userType === 'teknisi') {
          // Update auth_id di tabel Teknisi
          await supabase
            .from('Teknisi')
            .update({ auth_id: data.user.id })
            .eq('email', email);
        } else if (userType === 'dosen') {
          // Update auth_id di tabel dosen
          await supabase
            .from('dosen')
            .update({ auth_id: data.user.id })
            .eq('email', email);
        }
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
