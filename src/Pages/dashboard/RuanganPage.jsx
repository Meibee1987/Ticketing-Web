/**
 * ================================================================================
 * FILE: RuanganPage.jsx
 * DESKRIPSI: Dashboard Ketersediaan Ruangan - Filter tanggal, data dari 3 tabel jadwal
 * ================================================================================
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

// ============= HELPER FUNCTIONS =============
const formatDate = (date) => {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const formatDateShort = (ts) => {
  if (!ts) return "-";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (ts) => {
  if (!ts) return "-";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDateInput = (date) => {
  return date.toISOString().split('T')[0];
};

const isSameDate = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export default function RuanganPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time setiap menit untuk refresh status "sedang digunakan"
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update setiap 1 menit
    return () => clearInterval(timer);
  }, []);

  const handleDateChange = (e) => {
    setSelectedDate(new Date(e.target.value + 'T00:00:00'));
  };

  const goToToday = () => setSelectedDate(new Date());
  const goToPrevDay = () => setSelectedDate(prev => new Date(prev.getTime() - 86400000));
  const goToNextDay = () => setSelectedDate(prev => new Date(prev.getTime() + 86400000));

  const isToday = isSameDate(selectedDate, new Date());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">📍 Ketersediaan Ruangan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lihat ketersediaan ruangan berdasarkan tanggal. Ruangan "Tersedia" hanya berkurang jika sedang digunakan.
        </p>
      </header>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="date"
              value={formatDateInput(selectedDate)}
              onChange={handleDateChange}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button onClick={goToNextDay} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Hari Ini
            </button>
            <span className="text-sm font-medium text-slate-700">{formatDate(selectedDate)}</span>
          </div>
        </div>
      </div>

      <RuanganStats key={`stats-${selectedDate.toDateString()}-${currentTime.getMinutes()}`} selectedDate={selectedDate} currentTime={currentTime} />
      <RuanganList key={`list-${selectedDate.toDateString()}-${currentTime.getMinutes()}`} selectedDate={selectedDate} currentTime={currentTime} />
    </div>
  );
}

// ============= DATA HOOK =============
function useRuanganData(selectedDate) {
  const [state, setState] = useState({
    ruangan: [],
    allBookings: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [ruanganRes, perkuliahanRes, karyaAkhirRes, lainLainRes, dosenRes, angkatanRes, matkulRes, agendaKARes] = await Promise.all([
        supabase.from("ruangan").select("*").order("nama_ruangan"),
        supabase.from("jadwal_perkuliahan").select("*"),
        supabase.from("jadwal_karya_akhir").select("*"),
        supabase.from("jadwal_lain_lain").select("*"),
        supabase.from("dosen").select("id, nama_dosen"),
        supabase.from("angkatan").select("id, nama_angkatan"),
        supabase.from("mata_kuliah").select("*"),
        supabase.from("agenda_karya_akhir").select("id, agenda_karya_akhir"),
      ]);

      if (ruanganRes.error) throw ruanganRes.error;

      const ruangan = ruanganRes.data || [];
      const dosenMap = Object.fromEntries((dosenRes.data || []).map(d => [d.id, d.nama_dosen]));
      const angkatanMap = Object.fromEntries((angkatanRes.data || []).map(a => [a.id, a.nama_angkatan]));
      const matkulMap = Object.fromEntries((matkulRes.data || []).map(m => [m.id, m.mata_kuliah || m.nama_matkul]));
      const agendaKAMap = Object.fromEntries((agendaKARes.data || []).map(a => [a.id, a.agenda_karya_akhir]));
      const ruanganMap = Object.fromEntries(ruangan.map(r => [r.id, r.nama_ruangan]));

      const allBookings = [];

      // 1. Jadwal Perkuliahan
      (perkuliahanRes.data || []).forEach(j => {
        if (!j.mulai_jadwal || !j.akhir_jadwal) return;
        allBookings.push({
          id: `perkuliahan-${j.id}`,
          ruangan_id: j.ruangan_id,
          ruangan_nama: ruanganMap[j.ruangan_id] || `Ruangan ${j.ruangan_id}`,
          mulai: new Date(j.mulai_jadwal),
          akhir: new Date(j.akhir_jadwal),
          source: "Perkuliahan",
          sourceColor: "blue",
          description: matkulMap[j.id_mata_kuliah] || "Mata Kuliah",
          detail: dosenMap[j.dosen_id] || "",
          angkatan: angkatanMap[j.id_angkatan] || "",
        });
      });

      // 2. Jadwal Karya Akhir
      (karyaAkhirRes.data || []).forEach(j => {
        if (!j.mulai_jadwal || !j.akhir_jadwal) return;
        allBookings.push({
          id: `karya_akhir-${j.id}`,
          ruangan_id: j.nama_ruangan,
          ruangan_nama: ruanganMap[j.nama_ruangan] || `Ruangan ${j.nama_ruangan}`,
          mulai: new Date(j.mulai_jadwal),
          akhir: new Date(j.akhir_jadwal),
          source: "Karya Akhir",
          sourceColor: "purple",
          description: agendaKAMap[j.agenda_jadwal_karya_akhir] || "Sidang/Seminar",
          detail: angkatanMap[j.nama_angkatan] || "",
        });
      });

      // 3. Jadwal Lain-lain
      (lainLainRes.data || []).forEach(j => {
        if (!j.mulai_jadwal || !j.akhir_jadwal) return;
        allBookings.push({
          id: `lain_lain-${j.id}`,
          ruangan_id: j.nama_ruangan,
          ruangan_nama: ruanganMap[j.nama_ruangan] || `Ruangan ${j.nama_ruangan}`,
          mulai: new Date(j.mulai_jadwal),
          akhir: new Date(j.akhir_jadwal),
          source: "Lain-lain",
          sourceColor: "orange",
          description: j.agenda || "Kegiatan",
          detail: j.nama_user || "",
        });
      });

      allBookings.sort((a, b) => a.mulai - b.mulai);

      setState({ ruangan, allBookings, loading: false, error: null });
    } catch (err) {
      console.error("Error fetching data:", err);
      setState({ ruangan: [], allBookings: [], loading: false, error: err.message || "Gagal mengambil data" });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription untuk 3 tabel jadwal + ruangan
  useEffect(() => {
    const channels = [
      supabase.channel('ruangan-realtime-ruangan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ruangan' }, fetchData)
        .subscribe(),
      supabase.channel('ruangan-realtime-perkuliahan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_perkuliahan' }, fetchData)
        .subscribe(),
      supabase.channel('ruangan-realtime-karya-akhir')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_karya_akhir' }, fetchData)
        .subscribe(),
      supabase.channel('ruangan-realtime-lain-lain')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_lain_lain' }, fetchData)
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchData]);

  // Filter bookings berdasarkan tanggal yang dipilih
  const filteredBookings = useMemo(() => {
    return state.allBookings.filter(b => {
      const bookingDate = new Date(b.mulai);
      return isSameDate(bookingDate, selectedDate);
    });
  }, [state.allBookings, selectedDate]);

  return { ...state, filteredBookings };
}

// ============= STATS COMPONENT =============
function RuanganStats({ selectedDate, currentTime }) {
  const { ruangan, filteredBookings, loading } = useRuanganData(selectedDate);

  const stats = useMemo(() => {
    if (loading || !ruangan.length) return { total: 0, tersedia: 0, adaJadwal: 0, sedangDigunakan: 0 };

    const now = currentTime || new Date();
    const isToday = isSameDate(selectedDate, now);
    
    const ruanganSedangDigunakan = new Set();
    const ruanganAdaJadwal = new Set();

    filteredBookings.forEach(b => {
      // Hanya cek "sedang digunakan" jika hari ini
      if (isToday && now >= b.mulai && now < b.akhir) {
        ruanganSedangDigunakan.add(b.ruangan_id);
      } else {
        ruanganAdaJadwal.add(b.ruangan_id);
      }
    });

    // Ruangan yang sedang digunakan jangan dihitung sebagai "ada jadwal"
    ruanganSedangDigunakan.forEach(id => ruanganAdaJadwal.delete(id));

    // TERSEDIA = Total - Sedang Digunakan (ada jadwal TIDAK mengurangi ketersediaan)
    return {
      total: ruangan.length,
      sedangDigunakan: ruanganSedangDigunakan.size,
      adaJadwal: ruanganAdaJadwal.size,
      tersedia: ruangan.length - ruanganSedangDigunakan.size,
    };
  }, [ruangan, filteredBookings, loading, selectedDate, currentTime]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Total Ruangan", value: stats.total, icon: "🏢", bgColor: "bg-slate-50", textColor: "text-slate-700" },
    { title: "Tersedia", value: stats.tersedia, icon: "✅", bgColor: "bg-green-50", textColor: "text-green-600", subtitle: "Tidak sedang digunakan" },
    { title: "Sedang Digunakan", value: stats.sedangDigunakan, icon: "🔴", bgColor: "bg-red-50", textColor: "text-red-600" },
    { title: "Ada Jadwal", value: stats.adaJadwal, icon: "📅", bgColor: "bg-amber-50", textColor: "text-amber-600", subtitle: "Sudah di-booking" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <div key={idx} className={`${card.bgColor} rounded-xl shadow-sm border border-slate-200 p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className={`text-3xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
              {card.subtitle && <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>}
            </div>
            <span className="text-3xl">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============= RUANGAN LIST =============
function RuanganList({ selectedDate, currentTime }) {
  const { ruangan, filteredBookings, loading, error } = useRuanganData(selectedDate);
  const [filter, setFilter] = useState("all");

  const enhancedRuangan = useMemo(() => {
    if (loading || !ruangan.length) return [];

    const now = currentTime || new Date();
    const isToday = isSameDate(selectedDate, now);

    return ruangan.map(r => {
      const bookingsForRoom = filteredBookings.filter(b => String(b.ruangan_id) === String(r.id));
      
      // Sedang digunakan (hanya jika hari ini)
      const currentBooking = isToday ? bookingsForRoom.find(b => now >= b.mulai && now < b.akhir) : null;
      
      // Jadwal yang akan datang atau sudah lewat di hari itu
      const scheduledBookings = bookingsForRoom.filter(b => {
        if (currentBooking && b.id === currentBooking.id) return false;
        return true;
      }).sort((a, b) => a.mulai - b.mulai);

      // Tentukan status
      let status = "tersedia";
      if (currentBooking) {
        status = "sedang_digunakan";
      } else if (scheduledBookings.length > 0) {
        status = "ada_jadwal";
      }

      return { ...r, status, currentBooking, scheduledBookings, totalBookings: bookingsForRoom.length };
    }).sort((a, b) => {
      // Sort by status priority first
      const order = { sedang_digunakan: 0, ada_jadwal: 1, tersedia: 2 };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // For rooms with the same status, sort by nearest start time
      const getNextStartTime = (room) => {
        if (room.currentBooking) return room.currentBooking.mulai;
        if (room.scheduledBookings.length > 0) {
          // Find the nearest upcoming booking or the earliest booking
          const now = new Date();
          const upcomingBooking = room.scheduledBookings.find(b => b.mulai > now);
          return upcomingBooking ? upcomingBooking.mulai : room.scheduledBookings[0].mulai;
        }
        return new Date(9999, 11, 31); // Far future for rooms without bookings
      };
      
      return getNextStartTime(a) - getNextStartTime(b);
    });
  }, [ruangan, filteredBookings, loading, selectedDate, currentTime]);

  const filteredRuangan = useMemo(() => {
    if (filter === "all") return enhancedRuangan;
    return enhancedRuangan.filter(r => r.status === filter);
  }, [enhancedRuangan, filter]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  const filterButtons = [
    { key: "all", label: "Semua", count: enhancedRuangan.length },
    { key: "tersedia", label: "Tersedia", count: enhancedRuangan.filter(r => r.status === "tersedia").length },
    { key: "sedang_digunakan", label: "Sedang Digunakan", count: enhancedRuangan.filter(r => r.status === "sedang_digunakan").length },
    { key: "ada_jadwal", label: "Ada Jadwal", count: enhancedRuangan.filter(r => r.status === "ada_jadwal").length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterButtons.map(btn => (
          <button key={btn.key} onClick={() => setFilter(btn.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === btn.key ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRuangan.map(r => <RuanganCard key={r.id} ruangan={r} selectedDate={selectedDate} />)}
      </div>

      {filteredRuangan.length === 0 && (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <p className="text-slate-500">Tidak ada ruangan dengan filter ini pada tanggal {formatDate(selectedDate)}</p>
        </div>
      )}
    </div>
  );
}

// ============= RUANGAN CARD =============
function RuanganCard({ ruangan, selectedDate }) {
  const [expanded, setExpanded] = useState(false);
  const isToday = isSameDate(selectedDate, new Date());

  const statusConfig = {
    sedang_digunakan: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", icon: "🔴", text: "Sedang Digunakan" },
    ada_jadwal: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", icon: "📅", text: "Ada Jadwal" },
    tersedia: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", icon: "✅", text: "Tersedia" },
  };

  const config = statusConfig[ruangan.status];
  const sourceColors = { blue: "bg-blue-100 text-blue-700", purple: "bg-purple-100 text-purple-700", orange: "bg-orange-100 text-orange-700" };

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{ruangan.nama_ruangan || `Ruangan ${ruangan.id}`}</h3>
          <span className={`${config.badge} text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 mt-1`}>
            <span>{config.icon}</span>{config.text}
          </span>
        </div>
        {ruangan.totalBookings > 0 && (
          <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-full">{ruangan.totalBookings} jadwal</span>
        )}
      </div>

      {/* Sedang digunakan (hanya tampil jika hari ini) */}
      {ruangan.currentBooking && isToday && (() => {
        const now = new Date();
        const isFinished = now >= ruangan.currentBooking.akhir;
        const timeUntilEnd = Math.max(0, Math.floor((ruangan.currentBooking.akhir - now) / 60000)); // minutes
        
        return (
        <div className={`${isFinished ? 'bg-slate-100/50' : 'bg-red-100/50'} rounded-lg p-3 mb-3`}>
          <div className="flex items-center gap-2 mb-1">
            {isFinished ? (
              <span className="text-xs font-medium text-slate-600">✓ SELESAI</span>
            ) : (
              <span className="text-xs font-medium text-red-600">🔴 SEDANG BERLANGSUNG</span>
            )}
            <span className={`${sourceColors[ruangan.currentBooking.sourceColor]} text-xs px-2 py-0.5 rounded-full`}>
              {ruangan.currentBooking.source}
            </span>
          </div>
          <p className={`text-sm font-semibold ${isFinished ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{ruangan.currentBooking.description}</p>
          {ruangan.currentBooking.detail && <p className={`text-xs ${isFinished ? 'text-slate-400' : 'text-slate-500'}`}>{ruangan.currentBooking.detail}</p>}
          <p className={`text-xs ${isFinished ? 'text-slate-500' : 'text-slate-600'} mt-1`}>
            ⏰ {formatTime(ruangan.currentBooking.mulai)} - {formatTime(ruangan.currentBooking.akhir)}
            {!isFinished && timeUntilEnd > 0 && (
              <span className="ml-2 text-red-600 font-medium">({timeUntilEnd} menit lagi)</span>
            )}
          </p>
        </div>
        );
      })()}

      {/* Jadwal lain di hari ini */}
      {ruangan.scheduledBookings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {isToday ? "Jadwal Hari Ini:" : `Jadwal ${formatDateShort(selectedDate)}:`}
          </p>
          
          {(expanded ? ruangan.scheduledBookings : ruangan.scheduledBookings.slice(0, 2)).map((booking) => {
            const now = new Date();
            const isFinished = now >= booking.akhir;
            
            return (
            <div key={booking.id} className={`bg-white/60 rounded-lg p-2.5 border border-slate-100 ${isFinished ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`${sourceColors[booking.sourceColor]} text-xs px-2 py-0.5 rounded-full`}>{booking.source}</span>
                <span className="text-xs text-slate-400">{formatTime(booking.mulai)} - {formatTime(booking.akhir)}</span>
                {isFinished && (
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">✓ Selesai</span>
                )}
              </div>
              <p className={`text-sm font-medium ${isFinished ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{booking.description}</p>
              {booking.detail && <p className={`text-xs ${isFinished ? 'text-slate-400' : 'text-slate-500'}`}>{booking.detail}</p>}
            </div>
            );
          })}

          {ruangan.scheduledBookings.length > 2 && (
            <button onClick={() => setExpanded(!expanded)} className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1">
              {expanded ? "⬆️ Tutup" : `⬇️ Lihat ${ruangan.scheduledBookings.length - 2} jadwal lainnya`}
            </button>
          )}
        </div>
      )}

      {/* Jika tidak ada jadwal sama sekali */}
      {ruangan.status === "tersedia" && ruangan.scheduledBookings.length === 0 && (
        <p className="text-sm text-green-600 font-medium">✨ Tidak ada jadwal pada tanggal ini</p>
      )}
    </div>
  );
}
