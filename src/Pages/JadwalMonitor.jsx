import { useCallback, useEffect, useState } from 'react';
import {
  MonitorFooter,
  MonitorHeader,
  MonitorImageSlide,
  MonitorScheduleCard,
  MonitorScheduleEmptyState,
  MonitorScheduleErrorState,
  MonitorScheduleSkeleton,
} from '../components/monitor/MonitorScheduleUI';
import { supabase } from '../supabaseClient';
import { assertSupabaseResults } from '../utils/supabaseResults';

const STORAGE_KEY = 'jadwal_monitor_slides';

export default function JadwalMonitor() {
  const [jadwalData, setJadwalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [slideImages, setSlideImages] = useState([]);
  const [error, setError] = useState('');

  const ITEMS_PER_PAGE = 5;
  const AUTO_SLIDE_INTERVAL = 10000;

  useEffect(() => {
    const loadSlides = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSlideImages(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading slides:', error);
      }
    };

    loadSlides();

    const interval = setInterval(loadSlides, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const SLIDE_IMAGES = slideImages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const totalDataPages = Math.ceil(jadwalData.length / ITEMS_PER_PAGE);
    const totalPages = totalDataPages + SLIDE_IMAGES.length;

    if (totalPages <= 1) return;

    const slideTimer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(slideTimer);
  }, [jadwalData.length, SLIDE_IMAGES.length]);

  const fetchTodaySchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [
        perkuliahanRes,
        karyaAkhirRes,
        lainLainRes,
        ruanganRes,
        agendaRes,
      ] = await Promise.all([
        supabase
          .from('jadwal_perkuliahan')
          .select('*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)')
          .order('mulai_jadwal', { ascending: true }),

        supabase
          .from('jadwal_karya_akhir')
          .select('*')
          .order('mulai_jadwal', { ascending: true }),

        supabase
          .from('jadwal_lain_lain')
          .select('*')
          .order('mulai_jadwal', { ascending: true }),

        supabase.from('ruangan').select('id, nama_ruangan'),
        supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
      ]);

      assertSupabaseResults([
        ['Jadwal perkuliahan', perkuliahanRes],
        ['Jadwal karya akhir', karyaAkhirRes],
        ['Jadwal lain-lain', lainLainRes],
        ['Referensi ruangan', ruanganRes],
        ['Referensi agenda', agendaRes],
      ]);

      const ruanganMap = Object.fromEntries(
        (ruanganRes.data || []).map((r) => [r.id, r.nama_ruangan])
      );
      const agendaMap = Object.fromEntries(
        (agendaRes.data || []).map((a) => [a.id, a.agenda_karya_akhir])
      );

      const allSchedules = [];

      if (perkuliahanRes.data) {
        perkuliahanRes.data.forEach((item) => {
          const merged = {
            ...item,
            nama_dosen: item.dosen?.nama_dosen || '-',
            nama_ruangan: item.ruangan?.nama_ruangan || '-',
            nama_angkatan: item.angkatan?.nama_angkatan || '-',
            nama_matkul:
              item.mata_kuliah?.mata_kuliah ||
              item.mata_kuliah?.nama_matkul ||
              '-',
          };

          allSchedules.push({
            id: `P${merged.id}`,
            type: 'perkuliahan',
            kode: merged.nama_angkatan || '-',
            jam: `${formatTime(merged.mulai_jadwal)} - ${formatTime(merged.akhir_jadwal)}`,
            kegiatan: merged.nama_matkul,
            tempat:
              merged.jenis_pertemuan === 'daring'
                ? 'Daring (Online)'
                : merged.nama_ruangan || '-',
            dosen: merged.nama_dosen || '-',
            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      if (karyaAkhirRes.data) {
        karyaAkhirRes.data.forEach((item) => {
          const merged = {
            ...item,
            display_ruangan: ruanganMap[item.nama_ruangan] || '-',
            display_mahasiswa: item.nama_mahasiswa || '-',
            display_agenda: agendaMap[item.agenda_jadwal_karya_akhir] || '-',
          };

          allSchedules.push({
            id: `K${merged.id}`,
            type: 'karya_akhir',
            kode: 'KARYA AKHIR',
            jam: `${formatTime(merged.mulai_jadwal)} - ${formatTime(merged.akhir_jadwal)}`,
            kegiatan: `${merged.display_agenda}`,
            tempat:
              merged.jenis_pertemuan === 'daring'
                ? 'Daring (Online)'
                : merged.display_ruangan || '-',
            dosen: merged.display_mahasiswa,
            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      if (lainLainRes.data) {
        lainLainRes.data.forEach((item) => {
          const merged = {
            ...item,
            ruangan_display: ruanganMap[item.nama_ruangan] || '-',
            user_display: item.nama_user || '-',
          };

          allSchedules.push({
            id: `L${merged.id}`,
            type: 'lain_lain',
            kode: 'LAINNYA',
            jam: `${formatTime(merged.mulai_jadwal)} - ${formatTime(merged.akhir_jadwal)}`,
            kegiatan: merged.agenda || 'Kegiatan Lain',
            tempat:
              merged.jenis_pertemuan === 'daring'
                ? 'Daring (Online)'
                : merged.ruangan_display || '-',
            dosen: merged.user_display || '-',
            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      allSchedules.sort((a, b) => {
        const typeOrder = { perkuliahan: 1, karya_akhir: 2, lain_lain: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }

        if (a.tempat !== b.tempat) {
          if (a.tempat === 'Daring (Online)' && b.tempat !== 'Daring (Online)')
            return -1;
          if (b.tempat === 'Daring (Online)' && a.tempat !== 'Daring (Online)')
            return 1;

          return a.tempat.localeCompare(b.tempat, 'id', {
            sensitivity: 'base',
          });
        }

        return a.mulai - b.mulai;
      });

      const now = new Date();
      const todaySchedules = allSchedules.filter((item) => {
        return (
          item.mulai.getFullYear() === now.getFullYear() &&
          item.mulai.getMonth() === now.getMonth() &&
          item.mulai.getDate() === now.getDate()
        );
      });

      setJadwalData(todaySchedules);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError(error.message || 'Gagal memuat jadwal monitor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaySchedule();
    const interval = setInterval(fetchTodaySchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTodaySchedule]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  const getStatus = (mulai, akhir) => {
    const now = new Date();
    const startTime = new Date(mulai);
    const endTime = new Date(akhir);

    if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'ongoing';
    } else {
      return 'finished';
    }
  };

  const formatDateOnly = () => {
    return currentTime.toLocaleString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatClockTime = () => {
    return {
      hours: currentTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        hour12: false,
      }),
      minutes: currentTime.toLocaleTimeString('id-ID', { minute: '2-digit' }),
      seconds: currentTime.toLocaleTimeString('id-ID', { second: '2-digit' }),
    };
  };

  const totalJadwal = jadwalData.length;
  const totalDataPages = Math.ceil(jadwalData.length / ITEMS_PER_PAGE);
  const totalPages = totalDataPages + SLIDE_IMAGES.length;
  const isImageSlide = currentPage >= totalDataPages;
  const imageSlideIndex = currentPage - totalDataPages;

  let currentPageData = [];
  if (!isImageSlide) {
    const startIdx = currentPage * ITEMS_PER_PAGE;
    currentPageData = jadwalData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }

  const clock = formatClockTime();
  const activeSlide = SLIDE_IMAGES[imageSlideIndex];

  return (
    <div className="monitor-page flex min-h-screen flex-col overflow-x-hidden bg-background">
      <MonitorHeader dateLabel={formatDateOnly()} clock={clock} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
          {!loading && !error && jadwalData.length > 0 && (
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold leading-7 text-slate-900 sm:text-xl">
                  {isImageSlide ? 'Informasi Kampus' : 'Jadwal Hari Ini'}
                </h2>
                {!isImageSlide && (
                  <p className="mt-0.5 text-sm leading-5 text-slate-500">
                    Menampilkan {currentPageData.length} dari {totalJadwal}{' '}
                    kegiatan.
                  </p>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <MonitorScheduleSkeleton />
          ) : error ? (
            <MonitorScheduleErrorState
              message={error}
              onRetry={fetchTodaySchedule}
            />
          ) : jadwalData.length === 0 ? (
            <MonitorScheduleEmptyState />
          ) : isImageSlide && activeSlide ? (
            <MonitorImageSlide slide={activeSlide} />
          ) : (
            <section
              className="space-y-3 sm:space-y-4"
              aria-label="Daftar jadwal hari ini"
            >
              {currentPageData.map((item) => (
                <MonitorScheduleCard key={item.id} item={item} />
              ))}
            </section>
          )}
        </div>
      </main>

      {!loading && !error && (
        <MonitorFooter
          totalSchedules={totalJadwal}
          totalPages={totalPages}
          totalDataPages={totalDataPages}
          currentPage={currentPage}
          onPrevious={() =>
            setCurrentPage(
              (previous) => (previous - 1 + totalPages) % totalPages
            )
          }
          onNext={() =>
            setCurrentPage((previous) => (previous + 1) % totalPages)
          }
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
