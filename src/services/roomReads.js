import { assertSupabaseResults } from '../utils/supabaseResults.js';

const toMap = (arr, key, val) =>
  Object.fromEntries(arr.map((x) => [x[key], x[val]]));

// Returns the existing room/booking shape. Date and status filtering stays in the UI.
export async function fetchRoomData(supabase) {
  const [
    ruanganRes,
    perkuliahanRes,
    karyaAkhirRes,
    lainLainRes,
    dosenRes,
    angkatanRes,
    matkulRes,
    agendaKARes,
  ] = await Promise.all([
    supabase
      .from('ruangan')
      .select('id, nama_ruangan, kapasitas_ruangan, gedung, aktif_nonaktif')
      .order('nama_ruangan'),
    supabase.from('jadwal_perkuliahan').select('*'),
    supabase.from('jadwal_karya_akhir').select('*'),
    supabase.from('jadwal_lain_lain').select('*'),
    supabase.from('dosen').select('id, nama_dosen'),
    supabase.from('angkatan').select('id, nama_angkatan'),
    supabase.from('mata_kuliah').select('*'),
    supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
  ]);

  assertSupabaseResults([
    ['Data ruangan', ruanganRes],
    ['Jadwal perkuliahan', perkuliahanRes],
    ['Jadwal karya akhir', karyaAkhirRes],
    ['Jadwal lain-lain', lainLainRes],
    ['Referensi dosen', dosenRes],
    ['Referensi angkatan', angkatanRes],
    ['Referensi mata kuliah', matkulRes],
    ['Referensi agenda', agendaKARes],
  ]);

  const ruangan = ruanganRes.data || [];
  const maps = {
    dosen: toMap(dosenRes.data || [], 'id', 'nama_dosen'),
    angkatan: toMap(angkatanRes.data || [], 'id', 'nama_angkatan'),
    matkul: toMap(matkulRes.data || [], 'id', 'mata_kuliah'),
    agendaKA: toMap(agendaKARes.data || [], 'id', 'agenda_karya_akhir'),
    ruangan: toMap(ruangan, 'id', 'nama_ruangan'),
  };

  const createBooking = (j, type, ruanganKey, desc, detail, extra = {}) => ({
    id: `${type}-${j.id}`,
    ruangan_id: j[ruanganKey],
    ruangan_nama: maps.ruangan[j[ruanganKey]] || `Ruangan ${j[ruanganKey]}`,
    mulai: new Date(j.mulai_jadwal),
    akhir: new Date(j.akhir_jadwal),
    source: {
      perkuliahan: 'Perkuliahan',
      karya_akhir: 'Karya Akhir',
      lain_lain: 'Lain-lain',
    }[type],
    sourceColor: {
      perkuliahan: 'blue',
      karya_akhir: 'purple',
      lain_lain: 'orange',
    }[type],
    description: desc,
    detail,
    ...extra,
  });

  const allBookings = [
    ...(perkuliahanRes.data || [])
      .filter((j) => j.mulai_jadwal && j.akhir_jadwal)
      .map((j) =>
        createBooking(
          j,
          'perkuliahan',
          'ruangan_id',
          maps.matkul[j.id_mata_kuliah] || 'Mata Kuliah',
          maps.dosen[j.dosen_id] || '',
          {
            angkatan: maps.angkatan[j.id_angkatan] || '',
            jenis_pertemuan: j.jenis_pertemuan || 'luring',
          }
        )
      ),
    ...(karyaAkhirRes.data || [])
      .filter((j) => j.mulai_jadwal && j.akhir_jadwal)
      .map((j) =>
        createBooking(
          j,
          'karya_akhir',
          'nama_ruangan',
          maps.agendaKA[j.agenda_jadwal_karya_akhir] || 'Sidang/Seminar',
          maps.angkatan[j.nama_angkatan] || ''
        )
      ),
    ...(lainLainRes.data || [])
      .filter((j) => j.mulai_jadwal && j.akhir_jadwal)
      .map((j) =>
        createBooking(
          j,
          'lain_lain',
          'nama_ruangan',
          j.agenda || 'Kegiatan',
          j.nama_user || ''
        )
      ),
  ].sort((a, b) => a.mulai - b.mulai);

  return { ruangan, allBookings };
}
