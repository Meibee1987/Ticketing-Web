import { supabase } from '../supabaseClient';

/**
 * Enroll user ke 2FA (TOTP)
 */
export async function enrollTOTP() {
  try {
    // Check if user already has factors enrolled
    const { data: existingFactors } = await supabase.auth.mfa.listFactors();

    // Unenroll ALL existing TOTP factors first
    if (existingFactors?.totp && existingFactors.totp.length > 0) {
      for (const factor of existingFactors.totp) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
          console.log('Unenrolled factor:', factor.id);
        } catch (unenrollErr) {
          console.warn('Failed to unenroll factor:', factor.id, unenrollErr);
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      console.error('Enroll error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during TOTP enroll:', err);
    throw err;
  }
}

/**
 * Challenge 2FA (minta verifikasi)
 */
export async function challengeTOTP(factorId) {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: factorId,
    });

    if (error) {
      console.error('Challenge error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during challenge:', err);
    throw err;
  }
}

/**
 * Verify OTP code - perlu challenge dulu baru verify
 */
export async function verifyOTPCode(factorId, code) {
  try {
    // Step 1: Create challenge
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

    if (challengeError) {
      console.error('Challenge error:', challengeError);
      throw new Error(challengeError.message);
    }

    // Step 2: Verify with challenge ID
    const { data, error } = await supabase.auth.mfa.verify({
      factorId: factorId,
      challengeId: challengeData.id,
      code: code,
    });

    if (error) {
      console.error('Verify error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during OTP verify:', err);
    throw err;
  }
}

/**
 * Get list of enrolled MFA factors
 */
export async function getEnrolledFactors() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error('List factors error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during list factors:', err);
    throw err;
  }
}

/**
 * Unenroll/disable 2FA
 */
export async function unenrollTOTP(factorId) {
  try {
    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId: factorId,
    });

    if (error) {
      console.error('Unenroll error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during unenroll:', err);
    throw err;
  }
}
