/**
 * Supabase Data Layer – Dashboard queries
 * KPI logic synced with RuanganPage (time-aware "sedang digunakan")
 * Jenis pertemuan: luring / daring(online) / hybrid from all 3 tables
 * Realtime subscription with notification builder
 */
import { supabase } from '../supabaseClient';
import { assertSupabaseResults } from '../utils/supabaseResults';
import { buildScheduleNotification } from '../utils/notifications';

// ────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────

/** Build start/end of a given date in local time (no UTC conversion) */
function dayRange(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return {
    start: `${yyyy}-${mm}-${dd}T00:00:00`,
    end: `${yyyy}-${mm}-${dd}T23:59:59`,
  };
}

/** Get Monday of the week that contains `date` */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

const isSameDate = (d1, d2) => d1.toDateString() === d2.toDateString();

// ────────────────────────────────────────
// UNIFIED BOOKING FETCH
// ────────────────────────────────────────

/**
 * Fetch all jadwal bookings for a specific date from all 3 tables.
 * Returns normalized array with ruangan_key, mulai, akhir, jenis.
 */
export async function fetchAllBookingsForDate(date = new Date()) {
  const { start, end } = dayRange(date);

  const [r1, r2, r3] = await Promise.all([
    supabase
      .from('jadwal_perkuliahan')
      .select('id, ruangan_id, mulai_jadwal, akhir_jadwal, jenis_pertemuan')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end),
    supabase
      .from('jadwal_karya_akhir')
      .select('id, nama_ruangan, mulai_jadwal, akhir_jadwal, jenis_pertemuan')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end),
    supabase
      .from('jadwal_lain_lain')
      .select('id, nama_ruangan, mulai_jadwal, akhir_jadwal, jenis_pertemuan')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end),
  ]);

  assertSupabaseResults([
    ['Jadwal perkuliahan', r1],
    ['Jadwal karya akhir', r2],
    ['Jadwal lain-lain', r3],
  ]);

  return [
    ...(r1.data || []).map((j) => ({
      id: `perkuliahan-${j.id}`,
      ruangan_key: j.ruangan_id,
      mulai: new Date(j.mulai_jadwal),
      akhir: new Date(j.akhir_jadwal),
      jenis: j.jenis_pertemuan || 'luring',
      source: 'perkuliahan',
    })),
    ...(r2.data || []).map((j) => ({
      id: `karya_akhir-${j.id}`,
      ruangan_key: j.nama_ruangan,
      mulai: new Date(j.mulai_jadwal),
      akhir: new Date(j.akhir_jadwal),
      jenis: j.jenis_pertemuan || 'luring',
      source: 'karya_akhir',
    })),
    ...(r3.data || []).map((j) => ({
      id: `lain_lain-${j.id}`,
      ruangan_key: j.nama_ruangan,
      mulai: new Date(j.mulai_jadwal),
      akhir: new Date(j.akhir_jadwal),
      jenis: j.jenis_pertemuan || 'luring',
      source: 'lain_lain',
    })),
  ];
}

// ────────────────────────────────────────
// KPI DATA – Synced with RuanganPage logic
// ────────────────────────────────────────

/**
 * Calculate KPI stats – EXACTLY matches RuanganPage's RuanganStats logic.
 * sedangDigunakan is time-aware: only counts rooms where now >= mulai && now < akhir
 */
export async function fetchDashboardKPI(date = new Date()) {
  const [ruanganRes, dosenRes, bookings] = await Promise.all([
    supabase.from('ruangan').select('id', { count: 'exact', head: true }),
    supabase.from('dosen').select('id', { count: 'exact', head: true }),
    fetchAllBookingsForDate(date),
  ]);

  assertSupabaseResults([
    ['Data ruangan', ruanganRes],
    ['Data dosen', dosenRes],
  ]);

  const totalRuangan = ruanganRes.count || 0;
  const dosenAktif = dosenRes.count || 0;
  const totalJadwal = bookings.length;

  // ── Exact RuanganPage logic ──
  const now = new Date();
  const isToday = isSameDate(date, now);
  const sedangDigunakan = new Set();

  bookings.forEach((b) => {
    if (isToday && now >= b.mulai && now < b.akhir && b.ruangan_key) {
      sedangDigunakan.add(b.ruangan_key);
    }
  });

  return {
    totalJadwal,
    ruanganUsed: sedangDigunakan.size,
    totalRuangan,
    tersedia: totalRuangan - sedangDigunakan.size,
    dosenAktif,
  };
}

// ────────────────────────────────────────
// CHART DATA
// ────────────────────────────────────────

/** Jadwal count per day for the week containing `date`, broken down by jenis */
export async function fetchWeeklyStats(date = new Date()) {
  const monday = getMonday(date);
  const days = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const results = await Promise.all(
    days.map(async (d) => {
      const bookings = await fetchAllBookingsForDate(d);
      let luring = 0,
        online = 0,
        hybrid = 0;
      bookings.forEach((b) => {
        const jenis = (b.jenis || '').toLowerCase();
        if (jenis === 'daring' || jenis === 'online') online++;
        else if (jenis === 'hybrid') hybrid++;
        else luring++;
      });
      return { luring, online, hybrid };
    })
  );

  return results;
}

/**
 * Jenis Pertemuan breakdown: Luring vs Online vs Hybrid
 * Queries all 3 jadwal tables (all have jenis_pertemuan column).
 */
export async function fetchJenisPertemuanStats(date = new Date()) {
  const bookings = await fetchAllBookingsForDate(date);

  let luring = 0;
  let online = 0;
  let hybrid = 0;

  bookings.forEach((b) => {
    const jenis = (b.jenis || '').toLowerCase();
    if (jenis === 'daring' || jenis === 'online') {
      online++;
    } else if (jenis === 'hybrid') {
      hybrid++;
    } else {
      luring++; // default to luring
    }
  });

  return { luring, online, hybrid };
}

// ────────────────────────────────────────
// TABLE DATA – "Jadwal Hari Ini"
// Fetches ALL 3 jadwal tables and normalizes for DataTable
// ────────────────────────────────────────

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

const toTimeDisplay = (mulai, akhir) =>
  mulai && akhir ? `${fmtTime(mulai)} - ${fmtTime(akhir)}` : '-';

export async function fetchJadwalHariIni(date = new Date()) {
  const { start, end } = dayRange(date);

  // Fetch lookup tables + all 3 jadwal tables in parallel
  // (same pattern as JadwalPageAdmin – raw select + map resolution)
  const [
    ruanganRes,
    angkatanRes,
    agendaRes,
    dosenAllRes,
    perkuliahanRes,
    karyaAkhirRes,
    lainLainRes,
  ] = await Promise.all([
    supabase.from('ruangan').select('id, nama_ruangan'),
    supabase.from('angkatan').select('id, nama_angkatan'),
    supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
    supabase.from('dosen').select('id, nama_dosen'),
    supabase
      .from('jadwal_perkuliahan')
      .select('*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end)
      .order('mulai_jadwal', { ascending: true }),
    supabase
      .from('jadwal_karya_akhir')
      .select('*')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end)
      .order('mulai_jadwal', { ascending: true }),
    supabase
      .from('jadwal_lain_lain')
      .select('*')
      .gte('mulai_jadwal', start)
      .lte('mulai_jadwal', end)
      .order('mulai_jadwal', { ascending: true }),
  ]);

  // Build lookup maps (id → name) – same as JadwalPageAdmin's createMap
  assertSupabaseResults([
    ['Referensi ruangan', ruanganRes],
    ['Referensi angkatan', angkatanRes],
    ['Referensi agenda', agendaRes],
    ['Referensi dosen', dosenAllRes],
    ['Jadwal perkuliahan', perkuliahanRes],
    ['Jadwal karya akhir', karyaAkhirRes],
    ['Jadwal lain-lain', lainLainRes],
  ]);

  const toMap = (arr, key) =>
    Object.fromEntries((arr || []).map((x) => [x.id, x[key]]));
  const ruanganMap = toMap(ruanganRes.data, 'nama_ruangan');
  const angkatanMap = toMap(angkatanRes.data, 'nama_angkatan');
  const agendaMap = toMap(agendaRes.data, 'agenda_karya_akhir');
  const dosenMap = toMap(dosenAllRes.data, 'nama_dosen');

  // Normalize perkuliahan (uses FK joins – works fine for this table)
  const perkuliahan = (perkuliahanRes.data || []).map((r) => ({
    id: `pk-${r.id}`,
    source: 'Perkuliahan',
    nama_angkatan: r.angkatan?.nama_angkatan || '-',
    waktu_display: toTimeDisplay(r.mulai_jadwal, r.akhir_jadwal),
    nama_matkul:
      r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || '-',
    nama_ruangan: r.ruangan?.nama_ruangan || '-',
    nama_dosen: r.dosen?.nama_dosen || '-',
    jenis_pertemuan: r.jenis_pertemuan || 'luring',
    mulai_jadwal: r.mulai_jadwal,
  }));

  // Normalize karya_akhir (raw select + map, same as admin page)
  const karyaAkhir = (karyaAkhirRes.data || []).map((r) => {
    // Parse dosen_ids (may be JSON array)
    let dosenNames = '-';
    if (r.dosen_ids) {
      try {
        const ids =
          typeof r.dosen_ids === 'string'
            ? JSON.parse(r.dosen_ids)
            : r.dosen_ids;
        const names = (ids || []).map((id) => dosenMap[id]).filter(Boolean);
        if (names.length) dosenNames = names.join(', ');
      } catch {
        /* ignore */
      }
    }

    return {
      id: `ka-${r.id}`,
      source: 'Karya Akhir',
      nama_angkatan: angkatanMap[r.nama_angkatan] || '-',
      waktu_display: toTimeDisplay(r.mulai_jadwal, r.akhir_jadwal),
      nama_matkul: agendaMap[r.agenda_jadwal_karya_akhir] || 'Sidang/Seminar',
      nama_ruangan: ruanganMap[r.nama_ruangan] || '-',
      nama_dosen: dosenNames,
      jenis_pertemuan: r.jenis_pertemuan || 'luring',
      mulai_jadwal: r.mulai_jadwal,
    };
  });

  // Normalize lain_lain (raw select + map, same as admin page)
  const lainLain = (lainLainRes.data || []).map((r) => ({
    id: `ll-${r.id}`,
    source: 'Lain-lain',
    nama_angkatan: '-',
    waktu_display: toTimeDisplay(r.mulai_jadwal, r.akhir_jadwal),
    nama_matkul: r.agenda || 'Kegiatan',
    nama_ruangan: ruanganMap[r.nama_ruangan] || '-',
    nama_dosen: r.nama_user || '-',
    jenis_pertemuan: r.jenis_pertemuan || 'luring',
    mulai_jadwal: r.mulai_jadwal,
  }));

  // Merge and sort by mulai_jadwal
  return [...perkuliahan, ...karyaAkhir, ...lainLain].sort(
    (a, b) => new Date(a.mulai_jadwal) - new Date(b.mulai_jadwal)
  );
}

// ────────────────────────────────────────
// REALTIME + NOTIFICATION BUILDER
// ────────────────────────────────────────

/**
 * Subscribe to jadwal changes with notification support.
 * @param {Function} onChange - Called on any change (for data refresh)
 * @param {Function} [onNotification] - Called with notification object
 * @returns {Function} cleanup function
 */
export function subscribeJadwalChanges(onChange, onNotification) {
  const handler = (payload) => {
    onChange();
    if (onNotification) onNotification(buildScheduleNotification(payload));
  };

  // Unique channel name to avoid conflicts if multiple subscribers exist
  const channelName = `jadwal-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jadwal_perkuliahan' },
      handler
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jadwal_karya_akhir' },
      handler
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jadwal_lain_lain' },
      handler
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
