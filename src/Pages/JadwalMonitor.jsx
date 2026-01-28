import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function JadwalMonitor() {
  const [jadwalData, setJadwalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);
      const today = new Date();
      // Format tanggal untuk filter (YYYY-MM-DD)
      const todayStr = today.toISOString().split('T')[0];
      const startOfDay = todayStr + 'T00:00:00.000Z';
      const endOfDay = todayStr + 'T23:59:59.999Z';

      console.log(
        'Filtering for date:',
        todayStr,
        'from',
        startOfDay,
        'to',
        endOfDay
      );

      // Fetch semua jadwal hari ini menggunakan logika yang sama dengan JadwalPage
      const [
        perkuliahanRes,
        karyaAkhirRes,
        lainLainRes,
        ruanganRes,
        agendaRes,
      ] = await Promise.all([
        // Jadwal Perkuliahan dengan filter tanggal yang lebih ketat
        supabase
          .from('jadwal_perkuliahan')
          .select('*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)')
          .gte('mulai_jadwal', startOfDay)
          .lt('mulai_jadwal', todayStr + 'T24:00:00.000Z') // Lebih ketat, tidak termasuk hari berikutnya
          .order('mulai_jadwal', { ascending: true }),

        // Jadwal Karya Akhir
        supabase
          .from('jadwal_karya_akhir')
          .select('*')
          .gte('mulai_jadwal', startOfDay)
          .lt('mulai_jadwal', todayStr + 'T24:00:00.000Z')
          .order('mulai_jadwal', { ascending: true }),

        // Jadwal Lain-lain
        supabase
          .from('jadwal_lain_lain')
          .select('*')
          .gte('mulai_jadwal', startOfDay)
          .lt('mulai_jadwal', todayStr + 'T24:00:00.000Z')
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
            kode: 'KA',
            jam: `${formatTime(merged.mulai_jadwal)} - ${formatTime(merged.akhir_jadwal)}`,
            kegiatan: `${merged.display_agenda} - ${merged.display_mahasiswa}`,
            tempat:
              merged.jenis_pertemuan === 'daring'
                ? '🌐 Daring'
                : merged.display_ruangan || '-',
            dosen: dosenNames,
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
            kode: 'LAIN',
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

      // Filter tambahan: pastikan hanya jadwal hari ini
      const currentDate = new Date();
      const todayDateOnly = currentDate.toISOString().split('T')[0]; // '2026-01-28'

      const filteredSchedules = allSchedules.filter((item) => {
        const itemDate = item.mulai.toISOString().split('T')[0];
        const isToday = itemDate === todayDateOnly;
        if (!isToday) {
          console.log('Filtering out item from different date:', {
            id: item.id,
            type: item.type,
            kegiatan: item.kegiatan,
            dosen: item.dosen,
            itemDate,
            todayDateOnly,
            mulai: item.mulai,
          });
        }
        return isToday;
      });

      console.log(
        'Final filtered schedules:',
        filteredSchedules.length,
        'items for date:',
        todayDateOnly
      );
      console.log('Total schedules before filter:', allSchedules.length);
      setJadwalData(filteredSchedules);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Memuat jadwal hari ini...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-2 md:p-4">
      {/* Header */}
      <div className="mb-3 md:mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xl md:text-2xl font-bold text-blue-900">
                📚
              </span>
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-bold text-white mb-1 md:mb-2">
                INFORMASI JADWAL
              </h1>
              <p className="text-yellow-300 text-xs md:text-xl font-semibold">
                {formatCurrentTime()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {jadwalData.length === 0 ? (
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 max-w-md mx-auto">
            <div className="text-4xl md:text-6xl mb-4">📅</div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Tidak Ada Jadwal
            </h2>
            <p className="text-sm md:text-base text-gray-300">
              Tidak ada kegiatan yang terjadwal untuk hari ini
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-6 shadow-2xl">
          {/* Table Header - Hidden on Mobile, use card layout instead */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 font-bold text-gray-800 bg-gray-100 p-4 rounded-lg mb-4 text-sm">
            <div className="col-span-1">KODE</div>
            <div className="col-span-2">JAM</div>
            <div className="col-span-4">KEGIATAN</div>
            <div className="col-span-2">TEMPAT</div>
            <div className="col-span-2">DOSEN/PIC</div>
            <div className="col-span-1">STATUS</div>
          </div>

          {/* Table Content dengan Separator per Jenis dan Ruangan */}
          <div className="space-y-2">
            {jadwalData.map((item, index) => {
              // Cek apakah perlu separator jenis kegiatan
              const prevItem = index > 0 ? jadwalData[index - 1] : null;
              const showTypeSeparator =
                !prevItem || prevItem.type !== item.type;

              return (
                <div key={item.id}>
                  {/* Separator Jenis Kegiatan */}
                  {showTypeSeparator && (
                    <div className="my-3 md:my-6 first:mt-0">
                      <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
                        <div
                          className={`h-0.5 md:h-1 flex-1 rounded ${
                            item.type === 'perkuliahan'
                              ? 'bg-blue-400'
                              : item.type === 'karya_akhir'
                                ? 'bg-purple-400'
                                : 'bg-green-400'
                          }`}
                        ></div>
                        <h3 className="text-xs md:text-lg font-bold text-gray-700 px-2 md:px-4 py-0.5 md:py-1 rounded-full bg-gray-100">
                          {item.type === 'perkuliahan' && '📚 PERKULIAHAN'}
                          {item.type === 'karya_akhir' && '🎓 KARYA AKHIR'}
                          {item.type === 'lain_lain' && '📋 LAIN-LAIN'}
                        </h3>
                        <div
                          className={`h-0.5 md:h-1 flex-1 rounded ${
                            item.type === 'perkuliahan'
                              ? 'bg-blue-400'
                              : item.type === 'karya_akhir'
                                ? 'bg-purple-400'
                                : 'bg-green-400'
                          }`}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Baris Jadwal - Card style for mobile, Grid for desktop */}
                  <div
                    className={`lg:grid lg:grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 rounded-lg border-l-4 ${getTypeColor(item.type)} ${getStatusColor(item.status)}`}
                  >
                    {/* Mobile Card Layout */}
                    <div className="lg:hidden space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm md:text-base">
                          {item.kode}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'ongoing'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'upcoming'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.status === 'ongoing' && '🟢 Berlangsung'}
                          {item.status === 'upcoming' && '⏰ Akan Datang'}
                          {item.status === 'finished' && '✅ Selesai'}
                        </span>
                      </div>
                      <div className="font-mono text-sm md:text-base font-semibold text-gray-700">
                        {item.jam}
                      </div>
                      <div className="font-semibold text-sm md:text-base leading-tight">
                        {item.kegiatan}
                      </div>
                      {item.jenis_pertemuan && (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                            item.jenis_pertemuan === 'daring'
                              ? 'bg-green-100 text-green-700'
                              : item.jenis_pertemuan === 'hybrid'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.jenis_pertemuan === 'daring' && '🌐 Daring'}
                          {item.jenis_pertemuan === 'luring' && '🏢 Luring'}
                          {item.jenis_pertemuan === 'hybrid' && '🔄 Hybrid'}
                        </span>
                      )}
                      <div className="flex justify-between text-xs md:text-sm text-gray-700">
                        <span className="font-semibold">📍 {item.tempat}</span>
                        <span>{item.dosen}</span>
                      </div>
                    </div>

                    {/* Desktop Grid Layout */}
                    <div className="hidden lg:contents">
                      <div className="col-span-1">
                        <span className="font-bold text-lg">{item.kode}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-mono text-lg font-semibold">
                          {item.jam}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <div className="font-semibold text-lg leading-tight">
                          {item.kegiatan}
                        </div>
                        {item.jenis_pertemuan && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                              item.jenis_pertemuan === 'daring'
                                ? 'bg-green-100 text-green-700'
                                : item.jenis_pertemuan === 'hybrid'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.jenis_pertemuan === 'daring' && '🌐 Daring'}
                            {item.jenis_pertemuan === 'luring' && '🏢 Luring'}
                            {item.jenis_pertemuan === 'hybrid' && '🔄 Hybrid'}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-lg font-semibold">
                          {item.tempat}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-base">{item.dosen}</span>
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'ongoing'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'upcoming'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.status === 'ongoing' && '🟢 Berlangsung'}
                          {item.status === 'upcoming' && '⏰ Akan Datang'}
                          {item.status === 'finished' && '✅ Selesai'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-4 md:mt-8 text-center">
            <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-300 rounded border border-blue-400"></div>
                <span>Perkuliahan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-300 rounded border border-purple-400"></div>
                <span>Karya Akhir</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-green-300 rounded border border-green-400"></div>
                <span>Lain-lain</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 md:mt-4">
              Data diperbarui otomatis setiap 5 menit • Total kegiatan hari ini:{' '}
              {jadwalData.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
