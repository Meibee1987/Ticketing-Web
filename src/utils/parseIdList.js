/**
 * Read existing JSON-array fields without coercing or filtering their elements.
 * The Honor Dosen page also accepts CSV; it deliberately uses its own parser.
 * @param {unknown} value
 * @returns {unknown[]}
 */
export const parseIdList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
