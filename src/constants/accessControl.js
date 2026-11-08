export const HONOR_DOSEN_ALLOWED_EMAILS = [
  'indahayu@apps.ipb.ac.id',
  'azka.mbipb@gmail.com',
];

/** @param {unknown} email */
export const normalizeAccessEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

/**
 * @param {unknown} email
 * @param {readonly string[]} allowedEmails
 */
export const isEmailAllowed = (email, allowedEmails = []) => {
  if (allowedEmails.length === 0) return true;
  const normalizedEmail = normalizeAccessEmail(email);
  return allowedEmails.some(
    (allowedEmail) => normalizeAccessEmail(allowedEmail) === normalizedEmail
  );
};
