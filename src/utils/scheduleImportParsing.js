// Preserve spreadsheet interpretation, including permissive legacy inputs.

/** @param {unknown} value */
export function getScheduleTypeFromLabel(value) {
  const label = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!label) return null;
  if (/^kuliah(?:\s|$)|^perkuliahan(?:\s|$)/.test(label)) return 'perkuliahan';
  if (
    /karya akhir|sidang|ujian|tesis|disertasi|prelim|seminar|kolokium/.test(
      label
    )
  )
    return 'karya_akhir';
  if (/^lain lain(?:\s|$)/.test(label)) return 'lain_lain';

  return null;
}

/**
 * @param {unknown} jamStr
 * @param {Date | string | null | undefined} tanggal
 */
export function parseJam(jamStr, tanggal) {
  if (!jamStr || !tanggal) return { mulai: null, akhir: null };
  const str = String(jamStr).trim();
  // Format: "HH.MM - HH.MM" atau "HH:MM - HH:MM" atau "HH.MM-HH.MM"
  const match = str.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
  if (!match) return { mulai: null, akhir: null };

  const [, h1, m1, h2, m2] = match;
  const dateStr =
    tanggal instanceof Date
      ? dateToLocalStr(tanggal)
      : String(tanggal).split('T')[0];

  return {
    mulai: `${dateStr}T${h1.padStart(2, '0')}:${m1}:00`,
    akhir: `${dateStr}T${h2.padStart(2, '0')}:${m2}:00`,
  };
}

/** @param {unknown} str */
export function parseJenisPertemuan(str) {
  if (!str) return 'luring';
  const lower = String(str).toLowerCase().trim();
  if (lower.includes('hybrid') || lower.includes('blended')) return 'hybrid';
  if (
    lower.includes('daring') ||
    lower.includes('online') ||
    lower.includes('async') ||
    lower.includes('asynchronous') ||
    lower.includes('asinkron') ||
    lower.includes('synchronous') ||
    lower.includes('sinkron')
  )
    return 'daring';
  return 'luring';
}

/** @param {unknown} str */
export function parseZoomInfo(str) {
  if (!str) return { zoom_id: null, zoom_password: null };
  const s = String(str);
  const idMatch = s.match(/(?:ID|id|Id)[:\s]*([0-9\s]+)/);
  const passMatch = s.match(
    /(?:Pass|pass|Password|password|Passcode|passcode|Kode Sandi|sandi)[:\s]*([^\s),]+)/i
  );
  return {
    zoom_id: idMatch ? idMatch[1].trim() : null,
    zoom_password: passMatch ? passMatch[1].trim() : null,
  };
}

/** @param {Date | null | undefined} d */
export function dateToLocalStr(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
