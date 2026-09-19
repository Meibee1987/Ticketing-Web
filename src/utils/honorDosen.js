const PERIOD_RANGES = {
  first: [1, 15],
  second: [16, 31],
};

const cleanText = (value, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : fallback;
};

export const isHonorStrata = (strata) => {
  const normalized = String(strata ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return normalized === 'S2' || normalized === 'S3';
};

export const normalizeStrata = (strata) =>
  String(strata ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const getHonorValue = (mulai, akhir) => {
  const start = new Date(mulai);
  const end = new Date(akhir);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (durationMinutes <= 0) return 0;
  return durationMinutes > 150 ? 4 : 2;
};

export const getHonorPeriodLabel = (monthValue, period) => {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return '';
  const endDay = period === 'first' ? 15 : new Date(year, month, 0).getDate();
  const startDay = period === 'first' ? 1 : 16;
  const monthName = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
  return `${startDay}–${endDay} ${monthName}`;
};

export const buildHonorDosenRows = (
  schedules,
  { monthValue, period = 'first', strataFilter = 'S1' }
) => {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month || !PERIOD_RANGES[period]) return [];
  const [startDay, configuredEndDay] = PERIOD_RANGES[period];
  const endDay = Math.min(configuredEndDay, new Date(year, month, 0).getDate());

  const rows = [];
  schedules.forEach((schedule) => {
    const start = new Date(schedule.mulai_jadwal);
    if (Number.isNaN(start.getTime())) return;
    if (
      start.getFullYear() !== year ||
      start.getMonth() !== month - 1 ||
      start.getDate() < startDay ||
      start.getDate() > endDay
    ) {
      return;
    }

    const strata = Array.isArray(schedule.strata_angkatans)
      ? schedule.strata_angkatans
      : [schedule.strata_angkatan];
    if (
      strataFilter &&
      !strata.some(
        (value) => normalizeStrata(value) === normalizeStrata(strataFilter)
      )
    )
      return;

    const lecturers = [
      schedule.nama_dosen,
      ...(schedule.dosen_tambahan_names || []),
    ]
      .map((name) => cleanText(name, ''))
      .filter(Boolean);

    [...new Set(lecturers)].forEach((dosen) => {
      rows.push({
        id: `${schedule.id}-${dosen}`,
        mulai: start,
        akhir: new Date(schedule.akhir_jadwal),
        dosen,
        mataKuliah: cleanText(schedule.nama_matkul || schedule.agenda_display),
        angkatan: cleanText(schedule.nama_angkatan),
        kegiatan: cleanText(schedule.jenis_pertemuan, 'luring'),
        ket: getHonorValue(schedule.mulai_jadwal, schedule.akhir_jadwal),
      });
    });
  });

  return rows.sort(
    (a, b) =>
      a.dosen.localeCompare(b.dosen, 'id-ID') ||
      a.mulai.getTime() - b.mulai.getTime()
  );
};

export const groupHonorRows = (rows) =>
  rows.reduce((groups, row) => {
    const current = groups.at(-1);
    if (!current || current.dosen !== row.dosen) {
      groups.push({ dosen: row.dosen, rows: [row], total: row.ket });
    } else {
      current.rows.push(row);
      current.total += row.ket;
    }
    return groups;
  }, []);
