const hasValue = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== '' &&
  String(value).trim() !== '-';

export function normalizeKelasForDatabase(kelas) {
  const value = String(kelas || '').trim();
  const normalizedValue = value.toLowerCase();

  if (!value || value === '-') return null;
  if (
    normalizedValue === 'int' ||
    normalizedValue.includes('international') ||
    normalizedValue.includes('internasional')
  ) {
    return 'INT';
  }
  if (normalizedValue === 'reg' || normalizedValue.includes('reguler')) {
    return 'REG';
  }
  if (normalizedValue === 'res' || normalizedValue.includes('reserved')) {
    return 'RES';
  }

  return value.slice(0, 10);
}

export function formatAngkatanLabel(angkatan, paralel, kelas) {
  const parts = [hasValue(angkatan) ? String(angkatan).trim() : '-'];

  if (hasValue(paralel)) parts.push(`(${String(paralel).trim()})`);

  if (normalizeKelasForDatabase(kelas) === 'INT') {
    parts.push('Int');
  }

  return parts.join(' ');
}
