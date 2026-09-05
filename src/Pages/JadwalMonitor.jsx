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
import {
  fetchMonitorSlides,
  MONITOR_SLIDES_TABLE,
  readLegacyMonitorSlides,
} from '../utils/monitorSlides';
import { assertSupabaseResults } from '../utils/supabaseResults';
import { usesPhysicalRoom } from '../utils/meetingRoom';

const ITEMS_PER_PAGE = 7;
const AUTO_SLIDE_INTERVAL = 7 * 1000;
const DATA_REFRESH_INTERVAL = 7 * 1000;
const SLIDE_REFRESH_INTERVAL = 15 * 1000;

const hasSameSlides = (currentSlides, nextSlides) =>
  currentSlides.length === nextSlides.length &&
  currentSlides.every((slide, index) => {
    const nextSlide = nextSlides[index];
    return (
      slide.id === nextSlide?.id &&
      slide.url === nextSlide.url &&
      slide.title === nextSlide.title &&
      slide.sortOrder === nextSlide.sortOrder
    );
  });

const parseIdList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function JadwalMonitor() {
  const [jadwalData, setJadwalData] = useState([]);
  // Pengaman render untuk state lama (misalnya setelah hot reload): daring tidak
  // boleh pernah diteruskan ke kartu monitor.
  const visibleJadwalData = jadwalData.filter((item) =>
    usesPhysicalRoom(item.jenis_pertemuan)
  );
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [slideImages, setSlideImages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSlides = async () => {
      try {
        const remoteSlides = await fetchMonitorSlides();
        if (!isMounted) return;

        setSlideImages((currentSlides) =>
          hasSameSlides(currentSlides, remoteSlides)
            ? currentSlides
            : remoteSlides
        );
      } catch (error) {
        console.error('Error loading monitor slides:', error);

        const legacySlides = readLegacyMonitorSlides();
        if (isMounted && legacySlides.length > 0) {
          setSlideImages(legacySlides);
        }
      }
    };

    loadSlides();

    const channel = supabase
      .channel('jadwal-monitor-slides')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: MONITOR_SLIDES_TABLE },
        loadSlides
      )
      .subscribe();
    const interval = setInterval(loadSlides, SLIDE_REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const totalDataPages = Math.ceil(visibleJadwalData.length / ITEMS_PER_PAGE);
    const totalPages = totalDataPages + slideImages.length;

    if (totalPages <= 1) return;

    const slideTimer = setTimeout(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, AUTO_SLIDE_INTERVAL);

    return () => clearTimeout(slideTimer);
  }, [currentPage, visibleJadwalData.length, slideImages]);

  useEffect(() => {
    const totalDataPages = Math.ceil(visibleJadwalData.length / ITEMS_PER_PAGE);
    const totalPages = totalDataPages + slideImages.length;

    setCurrentPage((page) => (totalPages > 0 && page >= totalPages ? 0 : page));
  }, [visibleJadwalData.length, slideImages.length]);

  const fetchTodaySchedule = useCallback(async () => {
    try {
      setError('');

      const [
        perkuliahanRes,
        karyaAkhirRes,
        lainLainRes,
        ruanganRes,
        agendaRes,
        angkatanRes,
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
        supabase.from('angkatan').select('id, nama_angkatan'),
      ]);

      assertSupabaseResults([
        ['Jadwal perkuliahan', perkuliahanRes],
        ['Jadwal karya akhir', karyaAkhirRes],
        ['Jadwal lain-lain', lainLainRes],
        ['Referensi ruangan', ruanganRes],
        ['Referensi agenda', agendaRes],
        ['Referensi angkatan', angkatanRes],
      ]);

      const ruanganMap = Object.fromEntries(
        (ruanganRes.data || []).map((r) => [r.id, r.nama_ruangan])
      );
      const agendaMap = Object.fromEntries(
        (agendaRes.data || []).map((a) => [a.id, a.agenda_karya_akhir])
      );
      const angkatanMap = Object.fromEntries(
        (angkatanRes.data || []).map((a) => [a.id, a.nama_angkatan])
      );

      const allSchedules = [];

      if (perkuliahanRes.data) {
        perkuliahanRes.data.forEach((item) => {
          if (!usesPhysicalRoom(item.jenis_pertemuan)) return;

          const merged = {
            ...item,
            nama_dosen: item.dosen?.nama_dosen || '-',
            nama_ruangan: item.ruangan?.nama_ruangan || '-',
            nama_angkatan:
              (parseIdList(item.id_angkatans).length
                ? parseIdList(item.id_angkatans)
                    .map((id) => angkatanMap[id])
                    .filter(Boolean)
                    .join(', ')
                : item.angkatan?.nama_angkatan) || '-',
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
          if (!usesPhysicalRoom(item.jenis_pertemuan)) return;

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
          if (!usesPhysicalRoom(item.jenis_pertemuan)) return;

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
          usesPhysicalRoom(item.jenis_pertemuan) &&
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
    const interval = setInterval(fetchTodaySchedule, DATA_REFRESH_INTERVAL);
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

  const totalJadwal = visibleJadwalData.length;
  const totalDataPages = Math.ceil(visibleJadwalData.length / ITEMS_PER_PAGE);
  const totalPages = totalDataPages + slideImages.length;
  const isImageSlide = currentPage >= totalDataPages;
  const imageSlideIndex = currentPage - totalDataPages;

  let currentPageData = [];
  if (!isImageSlide) {
    const startIdx = currentPage * ITEMS_PER_PAGE;
    currentPageData = visibleJadwalData.slice(
      startIdx,
      startIdx + ITEMS_PER_PAGE
    );
  }

  const clock = formatClockTime();
  const activeSlide = slideImages[imageSlideIndex];

  return (
    <div className="monitor-page flex min-h-screen flex-col overflow-x-hidden bg-background">
      <MonitorHeader dateLabel={formatDateOnly()} clock={clock} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
          {loading ? (
            <MonitorScheduleSkeleton />
          ) : error && slideImages.length === 0 ? (
            <MonitorScheduleErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                fetchTodaySchedule();
              }}
            />
          ) : totalPages === 0 ? (
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

      {!loading && (!error || slideImages.length > 0) && (
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
