import { supabase } from '../supabaseClient';

/**
 * Kirim OTP ke email user
 * @param {string} email - Email user
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendEmailOTP(email) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Set false untuk OTP code, true untuk magic link
        shouldCreateUser: true, // Auto create user jika belum ada
      },
    });

    if (error) {
      console.error('Send OTP error:', error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'OTP berhasil dikirim ke email Anda',
      data,
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
      throw new Error(error.message);
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
