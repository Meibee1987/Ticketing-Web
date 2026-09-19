import { useCallback, useEffect, useState } from 'react';
import HonorDosenTab from '../../components/HonorDosenTab';
import PageHeader from '../../components/ui/PageHeader';
import { supabase } from '../../supabaseClient';
import { assertSupabaseResults } from '../../utils/supabaseResults';

const PAGE_SIZE = 1000;

const parseIdList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
};

const fetchAllSchedules = async () => {
  const rows = [];
  let from = 0;

  while (true) {
    const result = await supabase
      .from('jadwal_perkuliahan')
      .select('*, dosen(*), angkatan(*), mata_kuliah(*)')
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) return result;

    rows.push(...(result.data || []));
    if (!result.data || result.data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: rows, error: null };
};

export default function HonorDosenPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [scheduleResult, dosenResult, angkatanResult] = await Promise.all([
        fetchAllSchedules(),
        supabase.from('dosen').select('id, nama_dosen'),
        supabase.from('angkatan').select('id, nama_angkatan, strata'),
      ]);

      assertSupabaseResults([
        ['Jadwal perkuliahan', scheduleResult],
        ['Referensi dosen', dosenResult],
        ['Referensi angkatan', angkatanResult],
      ]);

      const dosenMap = Object.fromEntries(
        (dosenResult.data || []).map((dosen) => [
          String(dosen.id),
          dosen.nama_dosen,
        ])
      );
      const angkatanMap = Object.fromEntries(
        (angkatanResult.data || []).map((angkatan) => [
          String(angkatan.id),
          angkatan,
        ])
      );

      setSchedules(
        (scheduleResult.data || []).map((schedule) => {
          const angkatanIds = parseIdList(schedule.id_angkatans);
          if (angkatanIds.length === 0 && schedule.id_angkatan) {
            angkatanIds.push(schedule.id_angkatan);
          }
          const dosenIds = parseIdList(schedule.dosen_ids);
          const angkatanRecords = angkatanIds
            .map((id) => angkatanMap[String(id)])
            .filter(Boolean);

          return {
            ...schedule,
            nama_dosen: schedule.dosen?.nama_dosen || '-',
            dosen_tambahan_names: dosenIds
              .map((id) => dosenMap[String(id)])
              .filter(Boolean),
            nama_angkatan:
              angkatanRecords.map((item) => item.nama_angkatan).join(', ') ||
              schedule.angkatan?.nama_angkatan ||
              '-',
            strata_angkatan:
              schedule.angkatan?.strata || angkatanRecords[0]?.strata || '',
            strata_angkatans: angkatanRecords
              .map((item) => item.strata)
              .filter(Boolean),
            nama_matkul:
              schedule.mata_kuliah?.mata_kuliah ||
              schedule.mata_kuliah?.nama_matkul ||
              '-',
          };
        })
      );
    } catch (fetchError) {
      console.error('Gagal memuat laporan honor dosen:', fetchError);
      setError(fetchError.message || 'Gagal memuat laporan honor dosen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('honor_dosen_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jadwal_perkuliahan' },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Honor Dosen"
        description="Rekap honor mengajar S1, S2, dan S3 per tanggal 1–15 dan 16–akhir bulan."
      />
      <div className="ui-card p-4 sm:p-5">
        <HonorDosenTab data={schedules} loading={loading} error={error} />
      </div>
    </div>
  );
}
