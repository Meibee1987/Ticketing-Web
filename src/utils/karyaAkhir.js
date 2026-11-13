export const normalizeKaryaAkhirAgenda = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+[1-4]\s*$/, '')
    .trim()
    .replace(/^sidang\s+promosi\s+terbuka$/i, 'Promosi Terbuka');
