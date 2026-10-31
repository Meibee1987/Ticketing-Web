export const normalizeKaryaAkhirAgenda = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+[1-4]\s*$/, '')
    .trim();
