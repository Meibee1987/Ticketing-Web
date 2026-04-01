import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const STORAGE_KEY = 'jadwal_monitor_slides';

export default function JadwalMonitor() {
  const [jadwalData, setJadwalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [slideImages, setSlideImages] = useState([]);

  // 🎯 KONFIGURASI - Ubah sesuai kebutuhan
  const ITEMS_PER_PAGE = 5; // Maksimal 6 data per halaman
  const AUTO_SLIDE_INTERVAL = 10000; // 7 detik per slide

  // 🖼️ Load gambar dari localStorage (dikelola via halaman MonitorSettings)
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

    // Refresh gambar setiap 5 menit (sinkron dengan refresh jadwal)
    const interval = setInterval(loadSlides, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const SLIDE_IMAGES = slideImages; // Gunakan gambar dari localStorage

  // Update waktu setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data jadwal hari ini
  useEffect(() => {
    fetchTodaySchedule();
    // Refresh data setiap 5 menit
    const interval = setInterval(fetchTodaySchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🎯 AUTO-SLIDE: Pindah halaman otomatis setiap 7 detik
  useEffect(() => {
    // Group jadwal by type and paginate each group
    const perkuliahanData = jadwalData.filter((j) => j.type === 'perkuliahan');
    const karyaAkhirData = jadwalData.filter((j) => j.type === 'karya_akhir');
    const lainLainData = jadwalData.filter((j) => j.type === 'lain_lain');

    // Calculate pages for each type (max 5 items per page)
    const perkuliahanPages = Math.ceil(perkuliahanData.length / ITEMS_PER_PAGE);
    const karyaAkhirPages = Math.ceil(karyaAkhirData.length / ITEMS_PER_PAGE);
    const lainLainPages = Math.ceil(lainLainData.length / ITEMS_PER_PAGE);

    const totalDataPages = perkuliahanPages + karyaAkhirPages + lainLainPages;
    const totalPages = totalDataPages + SLIDE_IMAGES.length;

    if (totalPages <= 1) return; // Tidak perlu auto-slide jika hanya 1 halaman

    const slideTimer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(slideTimer);
  }, [jadwalData.length, SLIDE_IMAGES.length]);

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);

      // Fetch semua data, filter tanggal dilakukan client-side (sama seperti JadwalPage)
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

        // Jadwal Karya Akhir
        supabase
          .from('jadwal_karya_akhir')
          .select('*')
          .order('mulai_jadwal', { ascending: true }),

        // Jadwal Lain-lain
        supabase
          .from('jadwal_lain_lain')
          .select('*')
          .order('mulai_jadwal', { ascending: true }),

        // Reference data
        supabase.from('ruangan').select('id, nama_ruangan'),
        supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
      ]);

      // Create maps untuk reference data
      const ruanganMap = Object.fromEntries(
        (ruanganRes.data || []).map((r) => [r.id, r.nama_ruangan])
      );
      const agendaMap = Object.fromEntries(
        (agendaRes.data || []).map((a) => [a.id, a.agenda_karya_akhir])
      );

      // Gabungkan dan format data menggunakan logika JadwalPage
      const allSchedules = [];

      // Format Perkuliahan (sama dengan JadwalPage)
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
                ? '🌐 Daring'
                : merged.nama_ruangan || '-',
            dosen: merged.nama_dosen || '-',
            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      // Format Karya Akhir (sama dengan JadwalPage)
      if (karyaAkhirRes.data) {
        karyaAkhirRes.data.forEach((item) => {
          const merged = {
            ...item,
            display_ruangan: ruanganMap[item.nama_ruangan] || '-',
            display_mahasiswa: item.nama_mahasiswa || '-',
            display_agenda: agendaMap[item.agenda_jadwal_karya_akhir] || '-',
          };

          // Parse dosen_ids jika ada
          let dosenNames = '-';
          if (item.dosen_ids) {
            try {
              const dosenIds =
                typeof item.dosen_ids === 'string'
                  ? JSON.parse(item.dosen_ids)
                  : item.dosen_ids;

              if (Array.isArray(dosenIds) && dosenIds.length > 0) {
                dosenNames =
                  dosenIds.length > 2
                    ? `${dosenIds.length} Dosen Penguji`
                    : 'Dosen Penguji';
              }
            } catch (e) {
              console.error('Error parsing dosen_ids:', e);
            }
          }

          allSchedules.push({
            id: `K${merged.id}`,
            type: 'karya_akhir',
            kode: 'KARYA AKHIR',
            jam: `${formatTime(merged.mulai_jadwal)} - ${formatTime(merged.akhir_jadwal)}`,
            kegiatan: `${merged.display_agenda}`,
            tempat:
              merged.jenis_pertemuan === 'daring'
                ? '🌐 Daring'
                : merged.display_ruangan || '-',
            dosen: merged.display_mahasiswa,

            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      // Format Lain-lain (sama dengan JadwalPage)
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
                ? '🌐 Daring'
                : merged.ruangan_display || '-',
            dosen: merged.user_display || '-',
            status: getStatus(merged.mulai_jadwal, merged.akhir_jadwal),
            mulai: new Date(merged.mulai_jadwal),
            jenis_pertemuan: merged.jenis_pertemuan || 'luring',
          });
        });
      }

      // Sort berdasarkan: 1) Jenis kegiatan, 2) Ruangan, 3) Waktu
      allSchedules.sort((a, b) => {
        // 1. Urutan jenis kegiatan: perkuliahan -> karya_akhir -> lain_lain
        const typeOrder = { perkuliahan: 1, karya_akhir: 2, lain_lain: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }

        // 2. Urutan ruangan: Daring pertama, lalu alfabetis
        if (a.tempat !== b.tempat) {
          // Daring selalu di atas
          if (a.tempat === '🌐 Daring' && b.tempat !== '🌐 Daring') return -1;
          if (b.tempat === '🌐 Daring' && a.tempat !== '🌐 Daring') return 1;

          // Ruangan alfabetis
          return a.tempat.localeCompare(b.tempat, 'id', {
            sensitivity: 'base',
          });
        }

        // 3. Urutan waktu dalam ruangan yang sama
        return a.mulai - b.mulai;
      });

      // Filter client-side: hanya jadwal hari ini (compare tanggal lokal, sama seperti JadwalPage)
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
    } finally {
      setLoading(false);
    }
  };

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

  const getTypeColor = (type) => {
    switch (type) {
      case 'perkuliahan':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'karya_akhir':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'lain_lain':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'text-gray-600';
      case 'ongoing':
        return 'text-green-600 font-bold';
      case 'finished':
        return 'text-gray-400';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
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

  // Stats
  const totalJadwal = jadwalData.length;
  const jadwalSelesai = jadwalData.filter(
    (i) => i.status === 'finished'
  ).length;
  const jadwalBerlangsung = jadwalData.filter(
    (i) => i.status === 'ongoing'
  ).length;
  const jadwalAkanDatang = jadwalData.filter(
    (i) => i.status === 'upcoming'
  ).length;

  const getTypeLabel = (type) => {
    switch (type) {
      case 'perkuliahan':
        return 'JADWAL PERKULIAHAN';
      case 'karya_akhir':
        return 'JADWAL KARYA AKHIR';
      case 'lain_lain':
        return 'JADWAL LAIN-LAIN';
      default:
        return 'JADWAL';
    }
  };

  const getTypeIconBg = (type) => {
    switch (type) {
      case 'perkuliahan':
        return 'from-blue-500 to-blue-600';
      case 'karya_akhir':
        return 'from-purple-500 to-purple-600';
      case 'lain_lain':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeBorderColor = (type) => {
    switch (type) {
      case 'perkuliahan':
        return 'border-blue-500';
      case 'karya_akhir':
        return 'border-purple-500';
      case 'lain_lain':
        return 'border-green-500';
      default:
        return 'border-gray-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          label: 'Berlangsung',
          icon: '🟢',
        };
      case 'upcoming':
        return {
          bg: 'bg-amber-500',
          text: 'text-white',
          label: 'Akan Datang',
          icon: '⏰',
        };
      case 'finished':
        return {
          bg: 'bg-emerald-500',
          text: 'text-white',
          label: 'Selesai',
          icon: '✅',
        };
      default:
        return { bg: 'bg-gray-400', text: 'text-white', label: '-', icon: '' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Floating patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 -right-16 w-56 h-56 bg-white/5 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute -bottom-10 left-1/3 w-40 h-40 bg-white/5 rounded-full animate-pulse delay-500"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-white text-xl font-medium">
            Memuat jadwal hari ini...
          </div>
        </div>
      </div>
    );
  }

  // 🎯 PAGINATION LOGIC - Group by type with max 5 items per page
  // Group jadwal by type
  const perkuliahanData = jadwalData.filter((j) => j.type === 'perkuliahan');
  const karyaAkhirData = jadwalData.filter((j) => j.type === 'karya_akhir');
  const lainLainData = jadwalData.filter((j) => j.type === 'lain_lain');

  // Calculate pages for each type (max 5 items per page)
  const perkuliahanPages = Math.ceil(perkuliahanData.length / ITEMS_PER_PAGE);
  const karyaAkhirPages = Math.ceil(karyaAkhirData.length / ITEMS_PER_PAGE);
  const lainLainPages = Math.ceil(lainLainData.length / ITEMS_PER_PAGE);

  const totalDataPages = perkuliahanPages + karyaAkhirPages + lainLainPages;
  const totalPages = totalDataPages + SLIDE_IMAGES.length;

  // Determine if current page is showing image or data
  const isImageSlide = currentPage >= totalDataPages;
  const imageSlideIndex = currentPage - totalDataPages;

  // Get current page data (only for data pages)
  let currentPageData = [];
  if (!isImageSlide) {
    if (currentPage < perkuliahanPages) {
      // Page is in perkuliahan group
      const startIdx = currentPage * ITEMS_PER_PAGE;
      currentPageData = perkuliahanData.slice(
        startIdx,
        startIdx + ITEMS_PER_PAGE
      );
    } else if (currentPage < perkuliahanPages + karyaAkhirPages) {
      // Page is in karya akhir group
      const pageInGroup = currentPage - perkuliahanPages;
      const startIdx = pageInGroup * ITEMS_PER_PAGE;
      currentPageData = karyaAkhirData.slice(
        startIdx,
        startIdx + ITEMS_PER_PAGE
      );
    } else {
      // Page is in lain-lain group
      const pageInGroup = currentPage - perkuliahanPages - karyaAkhirPages;
      const startIdx = pageInGroup * ITEMS_PER_PAGE;
      currentPageData = lainLainData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }
  }

  const clock = formatClockTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col relative overflow-hidden">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 overflow-hidden ">
        {/* Animated floating patterns */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div
            className="absolute top-4 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute -bottom-8 left-1/2 w-64 h-24 bg-white/5 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '2s' }}
          ></div>
          <div className="absolute bottom-0 right-0 w-96 h-32 bg-gradient-to-tl from-blue-800/30 to-transparent rounded-tl-full"></div>
        </div>

        <div className="relative z-10 px-3 md:px-6 lg:px-10 xl:px-12 2xl:px-16 3xl:px-24 4xl:px-32 py-2 md:py-3 lg:py-4 3xl:py-6 4xl:py-8">
          {/* ── Mobile Header (stacked, centered) ── */}
          <div className="md:hidden flex flex-col items-center gap-1">
            {/* Logo */}
            <img
              src="/logo_sb.png"
              alt="Logo IPB University"
              className="h-8 w-auto object-contain"
            />
            {/* Title */}
            <h1 className="text-sm font-black text-white tracking-tight drop-shadow-lg">
              INFORMASI JADWAL
            </h1>
            {/* Date */}
            <div className="bg-yellow-400/90 backdrop-blur-sm px-3 py-0.5 rounded-full shadow-lg border border-yellow-300/50">
              <span className="text-blue-700 text-[10px] font-bold whitespace-nowrap">
                {formatDateOnly()}
              </span>
            </div>
          </div>

          {/* ── Desktop Header (single row) ── */}
          <div className="hidden md:flex items-center justify-between gap-2">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <img
                src="/logo_sb.png"
                alt="Logo IPB University"
                className="h-10 lg:h-12 xl:h-14 2xl:h-16 3xl:h-20 4xl:h-28 5xl:h-36 w-auto object-contain"
              />
            </div>

            {/* Center: Title + Date */}
            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
              <h1 className="text-lg lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4xl:text-7xl 5xl:text-9xl font-black text-white tracking-tight drop-shadow-lg leading-tight text-center">
                INFORMASI JADWAL
              </h1>
              <div className="mt-1 inline-block bg-yellow-400/90 backdrop-blur-sm px-4 lg:px-6 3xl:px-8 4xl:px-12 py-1 lg:py-1.5 3xl:py-2 4xl:py-3 rounded-full shadow-lg border border-yellow-300/50">
                <span className="text-blue-700 text-xs lg:text-sm 2xl:text-base 3xl:text-xl 4xl:text-3xl 5xl:text-4xl font-bold whitespace-nowrap">
                  {formatDateOnly()}
                </span>
              </div>
            </div>

            {/* Right: Digital Clock */}
            <div className="flex-shrink-0 bg-white/15 backdrop-blur-md rounded-xl px-3 lg:px-5 3xl:px-7 4xl:px-10 py-1.5 lg:py-2 3xl:py-3 4xl:py-5 border border-white/20 shadow-lg">
              <div className="flex items-center gap-1 3xl:gap-2 4xl:gap-3">
                <span className="text-yellow-300 text-xs lg:text-sm 3xl:text-xl 4xl:text-3xl">
                  ⏱
                </span>
                <span className="text-white font-bold text-base lg:text-xl 2xl:text-2xl 3xl:text-4xl 4xl:text-6xl 5xl:text-7xl font-mono tracking-wider">
                  {clock.hours}
                </span>
                <span className="text-yellow-300 font-bold text-base lg:text-xl 2xl:text-2xl 3xl:text-4xl 4xl:text-6xl 5xl:text-7xl animate-pulse">
                  :
                </span>
                <span className="text-white font-bold text-base lg:text-xl 2xl:text-2xl 3xl:text-4xl 4xl:text-6xl 5xl:text-7xl font-mono tracking-wider">
                  {clock.minutes}
                </span>
                <span className="text-white/50 font-bold text-xs lg:text-sm 2xl:text-base 3xl:text-2xl 4xl:text-4xl 5xl:text-5xl font-mono">
                  : {clock.seconds}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="flex-1 px-3 md:px-6 lg:px-10 xl:px-12 2xl:px-16 3xl:px-24 4xl:px-32 py-3 md:py-4 lg:py-5 3xl:py-8 4xl:py-12">
        {jadwalData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-2xl p-8 md:p-12 max-w-md mx-auto shadow-xl text-center">
              <div className="text-4xl md:text-5xl mb-4">📅</div>
              <h2 className="text-base md:text-xl font-bold text-gray-800 mb-2">
                Tidak Ada Jadwal
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                Tidak ada kegiatan yang terjadwal untuk hari ini
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 🖼️ IMAGE SLIDE */}
            {isImageSlide && SLIDE_IMAGES[imageSlideIndex] ? (
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                <div className="relative w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-240px)] md:h-[calc(100vh-260px)] lg:h-[calc(100vh-280px)] xl:h-[calc(100vh-300px)] 3xl:h-[calc(100vh-340px)] 4xl:h-[calc(100vh-420px)] flex items-center justify-center bg-gray-50">
                  <img
                    src={SLIDE_IMAGES[imageSlideIndex].url}
                    alt={SLIDE_IMAGES[imageSlideIndex].title || 'Slide Image'}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="hidden text-center p-8">
                    <div className="text-4xl mb-4">🖼️</div>
                    <p className="text-base text-gray-500">
                      Gambar tidak dapat dimuat
                    </p>
                  </div>
                </div>
                {SLIDE_IMAGES[imageSlideIndex].title && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 px-6">
                    <h3 className="text-sm md:text-base lg:text-lg font-bold">
                      {SLIDE_IMAGES[imageSlideIndex].title}
                    </h3>
                  </div>
                )}
              </div>
            ) : (
              /* 📋 DATA SLIDE */
              <div className="space-y-2 md:space-y-3 lg:space-y-4 3xl:space-y-5 4xl:space-y-8">
                {currentPageData.map((item, index) => {
                  const prevItem =
                    index > 0 ? currentPageData[index - 1] : null;
                  const showTypeSeparator =
                    !prevItem || prevItem.type !== item.type;
                  const statusBadge = getStatusBadge(item.status);

                  return (
                    <div key={item.id}>
                      {/* ── Schedule Card ── */}
                      <div
                        className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group hover:-translate-y-0.5 ${item.status === 'ongoing' ? 'ring-2 ring-green-400/50' : ''}`}
                      >
                        <div className="flex">
                          {/* Left accent border */}
                          <div
                            className={`w-1 md:w-1.5 ${getTypeBorderColor(item.type)} bg-current flex-shrink-0`}
                            style={{
                              backgroundColor:
                                item.type === 'perkuliahan'
                                  ? '#3b82f6'
                                  : item.type === 'karya_akhir'
                                    ? '#a855f7'
                                    : '#22c55e',
                            }}
                          ></div>

                          {/* Card content */}
                          <div className="flex-1 p-2.5 md:p-3 lg:p-4 xl:p-5 3xl:p-6 4xl:p-10">
                            {/* Mobile Layout */}
                            <div className="lg:hidden space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                    {item.kode}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="font-medium">
                                      {item.jam}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`${statusBadge.bg} ${statusBadge.text} text-[10px] font-semibold px-3 py-1.5 rounded-full shadow-sm`}
                                >
                                  {statusBadge.icon} {statusBadge.label}
                                </span>
                              </div>
                              <div className="font-semibold text-gray-800 text-sm">
                                {item.kegiatan}
                              </div>
                              {item.jenis_pertemuan && (
                                <span
                                  className={`inline-block px-2.5 py-1 text-[10px] rounded-full font-medium ${
                                    item.jenis_pertemuan === 'daring'
                                      ? 'bg-green-50 text-green-600'
                                      : item.jenis_pertemuan === 'hybrid'
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'bg-blue-50 text-blue-600'
                                  }`}
                                >
                                  {item.jenis_pertemuan === 'daring' &&
                                    '🌐 Daring'}
                                  {item.jenis_pertemuan === 'luring' &&
                                    '🏢 Luring'}
                                  {item.jenis_pertemuan === 'hybrid' &&
                                    '🔄 Hybrid'}
                                </span>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span className="flex items-center gap-1.5">
                                  <svg
                                    className="w-4 h-4 text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  {item.tempat}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <svg
                                    className="w-4 h-4 text-purple-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  {item.dosen}
                                </span>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden lg:grid lg:grid-cols-12 items-center gap-2 lg:gap-3 xl:gap-4 3xl:gap-6 4xl:gap-10">
                              {/* Kode + Jam */}
                              <div className="col-span-2 flex items-center gap-2 xl:gap-4">
                                <div className="flex flex-col items-center">
                                  <span className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs xl:text-sm 3xl:text-base 4xl:text-2xl 5xl:text-3xl font-bold px-2.5 lg:px-3 xl:px-4 3xl:px-5 4xl:px-8 py-1.5 xl:py-2 3xl:py-3 4xl:py-4 rounded-lg shadow-sm">
                                    {item.kode}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-2"></div>
                                </div>
                              </div>

                              {/* Kegiatan */}
                              <div className="col-span-3 flex items-center gap-2 xl:gap-3 3xl:gap-4">
                                <div
                                  className={`w-6 h-6 xl:w-8 xl:h-8 3xl:w-10 3xl:h-10 4xl:w-16 4xl:h-16 bg-gradient-to-br ${getTypeIconBg(item.type)} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}
                                >
                                  <svg
                                    className="w-3 h-3 xl:w-4 xl:h-4 3xl:w-5 3xl:h-5 4xl:w-8 4xl:h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-700 text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-4xl 5xl:text-5xl leading-tight truncate">
                                    {item.kegiatan}
                                  </div>
                                  {item.jenis_pertemuan && (
                                    <span
                                      className={`inline-block mt-1 px-2 xl:px-2.5 3xl:px-3 4xl:px-5 py-0.5 3xl:py-1 text-[10px] xl:text-xs 3xl:text-sm 4xl:text-xl rounded-full font-bold ${
                                        item.jenis_pertemuan === 'daring'
                                          ? 'bg-green-50 text-green-600'
                                          : item.jenis_pertemuan === 'hybrid'
                                            ? 'bg-orange-50 text-orange-600'
                                            : 'bg-blue-50 text-blue-600'
                                      }`}
                                    >
                                      {item.jenis_pertemuan === 'daring' &&
                                        '🌐 Daring'}
                                      {item.jenis_pertemuan === 'luring' &&
                                        '🏢 Luring'}
                                      {item.jenis_pertemuan === 'hybrid' &&
                                        '🔄 Hybrid'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tempat */}
                              <div className="col-span-3 flex items-center gap-2 3xl:gap-3">
                                <svg
                                  className="w-4 h-4 xl:w-6 xl:h-6 3xl:w-7 3xl:h-7 4xl:w-10 4xl:h-10 text-red-400 flex-shrink-0 self-start mt-1.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-700 text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-4xl 5xl:text-5xl leading-tight truncate">
                                    {item.tempat}
                                  </div>
                                  <span className="font-medium block text-center w-full text-xs xl:text-sm 3xl:text-base 4xl:text-2xl">
                                    {item.jam}
                                  </span>
                                </div>
                              </div>

                              {/* Dosen */}
                              <div className="col-span-2 flex items-center gap-2 3xl:gap-3">
                                <svg
                                  className="w-4 h-4 xl:w-5 xl:h-5 3xl:w-6 3xl:h-6 4xl:w-9 4xl:h-9 text-purple-400 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <span className="text-gray-600 text-xs xl:text-sm 3xl:text-base 4xl:text-2xl 5xl:text-3xl font-bold truncate">
                                  {item.dosen}
                                </span>
                              </div>

                              {/* Status */}
                              <div className="col-span-2 flex justify-end">
                                <span
                                  className={`${statusBadge.bg} ${statusBadge.text} text-[9px] xl:text-[10px] 3xl:text-xs 4xl:text-xl 5xl:text-2xl font-semibold px-2 xl:px-3 3xl:px-4 4xl:px-6 py-1 xl:py-1.5 3xl:py-2 4xl:py-3 rounded-full shadow-sm whitespace-nowrap`}
                                >
                                  {statusBadge.icon} {statusBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {/* ═══════════════ FOOTER ═══════════════ */}
      <div className="px-3 md:px-6 lg:px-10 xl:px-12 2xl:px-16 3xl:px-24 4xl:px-32 pb-2 md:pb-3 lg:pb-4 3xl:pb-6 4xl:pb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-3 md:px-6 py-2 md:py-2.5 shadow-sm border border-gray-100">
          {/* Desktop: single row | Mobile: stacked */}
          <div className="hidden md:flex items-center justify-between gap-3">
            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span>Perkuliahan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                <span>Karya Akhir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span>Lain-lain</span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">
                Total: <strong>{totalJadwal}</strong> kegiatan
              </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage(
                      (prev) => (prev - 1 + totalPages) % totalPages
                    )
                  }
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`transition-all duration-300 rounded-full ${
                        currentPage === index
                          ? 'w-6 bg-blue-500'
                          : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                      } h-2.5`}
                      title={`Halaman ${index + 1}${index >= totalDataPages ? ' (Gambar)' : ''}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => (prev + 1) % totalPages)
                  }
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <span className="text-[10px] text-gray-500 ml-1">
                  {currentPage + 1}/{totalPages}
                </span>
              </div>
            )}

            {/* Developer credit */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-[8px] font-bold">W</span>
              </div>
              <span className="text-[12px] text-gray-400">
                Developed by{' '}
                <span className="font-bold text-gray-500">Wanda Saputra</span>
              </span>
            </div>
          </div>

          {/* Mobile layout: 2 compact rows */}
          <div className="md:hidden space-y-1.5">
            {/* Row 1: Legend + Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                  <span>Perkuliahan</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                  <span>Karya Akhir</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                  <span>Lain-lain</span>
                </div>
              </div>
              <span className="text-[9px] text-gray-500">
                Total: <strong>{totalJadwal}</strong>
              </span>
            </div>
            {/* Row 2: Pagination + Dev credit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-[6px] font-bold">W</span>
                </div>
                <span className="text-[9px] text-gray-400">
                  by{' '}
                  <span className="font-bold text-gray-500">Wanda Saputra</span>
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setCurrentPage(
                        (prev) => (prev - 1 + totalPages) % totalPages
                      )
                    }
                    className="bg-blue-50 text-blue-600 p-0.5 rounded transition-colors"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`transition-all duration-300 rounded-full h-1.5 ${
                          currentPage === index
                            ? 'w-4 bg-blue-500'
                            : 'w-1.5 bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => (prev + 1) % totalPages)
                    }
                    className="bg-blue-50 text-blue-600 p-0.5 rounded transition-colors"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <span className="text-[9px] text-gray-500">
                    {currentPage + 1}/{totalPages}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
