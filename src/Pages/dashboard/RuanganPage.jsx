/**
 * RuanganPage.jsx - Dashboard Ketersediaan Ruangan
 * Filter tanggal, realtime data dari 3 tabel jadwal
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

// ============= HELPERS =============
const formatDate = (d) =>
  d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
const formatDateShort = (ts) =>
  ts
    ? new Date(ts).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';
const formatTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '-';
const formatDateInput = (d) => d.toISOString().split('T')[0];
const isSameDate = (d1, d2) => d1.toDateString() === d2.toDateString();
const toMap = (arr, key, val) =>
  Object.fromEntries(arr.map((x) => [x[key], x[val]]));

// ============= CONSTANTS =============
const SOURCE_COLORS = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};
const STATUS_CONFIG = {
  sedang_digunakan: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: '🔴',
    text: 'Sedang Digunakan',
  },
  tersedia: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    icon: '✅',
    text: 'Tersedia',
  },
};

// ============= MAIN COMPONENT =============
export default function RuanganPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = isSameDate(selectedDate, new Date());
  const goTo = (fn) => () => setSelectedDate(fn);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">
          📍 Ketersediaan Ruangan
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Lihat ketersediaan ruangan berdasarkan tanggal. Ruangan "Tersedia"
          hanya berkurang jika sedang digunakan.
        </p>
      </header>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <NavButton
              onClick={goTo(new Date(selectedDate.getTime() - 86400000))}
              icon="M15 19l-7-7 7-7"
            />
            <input
              type="date"
              value={formatDateInput(selectedDate)}
              onChange={(e) =>
                setSelectedDate(new Date(e.target.value + 'T00:00:00'))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <NavButton
              onClick={goTo(new Date(selectedDate.getTime() + 86400000))}
              icon="M9 5l7 7-7 7"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goTo(new Date())}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Hari Ini
            </button>
            <span className="text-sm font-medium text-slate-700">
              {formatDate(selectedDate)}
            </span>
          </div>
        </div>
      </div>

      <RuanganStats selectedDate={selectedDate} currentTime={currentTime} />
      <RuanganList selectedDate={selectedDate} currentTime={currentTime} />
    </div>
  );
}

// Nav Button Component
const NavButton = ({ onClick, icon }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
  >
    <svg
      className="w-5 h-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={icon}
      />
    </svg>
  </button>
);

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
      setState((s) => ({ ...s, loading: true, error: null }));

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
        supabase.from('ruangan').select('*').order('nama_ruangan'),
        supabase.from('jadwal_perkuliahan').select('*'),
        supabase.from('jadwal_karya_akhir').select('*'),
        supabase.from('jadwal_lain_lain').select('*'),
        supabase.from('dosen').select('id, nama_dosen'),
        supabase.from('angkatan').select('id, nama_angkatan'),
        supabase.from('mata_kuliah').select('*'),
        supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
      ]);

      if (ruanganRes.error) throw ruanganRes.error;

      const ruangan = ruanganRes.data || [];
      const maps = {
        dosen: toMap(dosenRes.data || [], 'id', 'nama_dosen'),
        angkatan: toMap(angkatanRes.data || [], 'id', 'nama_angkatan'),
        matkul: toMap(matkulRes.data || [], 'id', 'mata_kuliah'),
        agendaKA: toMap(agendaKARes.data || [], 'id', 'agenda_karya_akhir'),
        ruangan: toMap(ruangan, 'id', 'nama_ruangan'),
      };

      const createBooking = (
        j,
        type,
        ruanganKey,
        desc,
        detail,
        extra = {}
      ) => ({
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
              { angkatan: maps.angkatan[j.id_angkatan] || '' }
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

      setState({ ruangan, allBookings, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching data:', err);
      setState({
        ruangan: [],
        allBookings: [],
        loading: false,
        error: err.message || 'Gagal mengambil data',
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const tables = [
      'ruangan',
      'jadwal_perkuliahan',
      'jadwal_karya_akhir',
      'jadwal_lain_lain',
    ];
    const channels = tables.map((t) =>
      supabase
        .channel(`ruangan-rt-${t}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: t },
          fetchData
        )
        .subscribe()
    );
    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, [fetchData]);

  const filteredBookings = useMemo(
    () => state.allBookings.filter((b) => isSameDate(b.mulai, selectedDate)),
    [state.allBookings, selectedDate]
  );

  return { ...state, filteredBookings };
}

// ============= STATS COMPONENT =============
function RuanganStats({ selectedDate, currentTime }) {
  const { ruangan, filteredBookings, loading } = useRuanganData(selectedDate);

  const stats = useMemo(() => {
    if (loading || !ruangan.length)
      return { total: 0, tersedia: 0, adaJadwal: 0, sedangDigunakan: 0 };

    const now = currentTime || new Date();
    const isToday = isSameDate(selectedDate, now);
    const [sedangDigunakan, adaJadwal] = [new Set(), new Set()];

    filteredBookings.forEach((b) => {
      if (now >= b.akhir) return; // Skip selesai
      if (isToday && now >= b.mulai && now < b.akhir)
        sedangDigunakan.add(b.ruangan_id);
      else adaJadwal.add(b.ruangan_id);
    });

    sedangDigunakan.forEach((id) => adaJadwal.delete(id));

    return {
      total: ruangan.length,
      sedangDigunakan: sedangDigunakan.size,
      adaJadwal: adaJadwal.size,
      tersedia: ruangan.length - sedangDigunakan.size,
    };
  }, [ruangan, filteredBookings, loading, selectedDate, currentTime]);

  if (loading)
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );

  const cards = [
    {
      title: 'Total Ruangan',
      value: stats.total,
      icon: '🏢',
      bg: 'bg-slate-50',
      color: 'text-slate-700',
    },
    {
      title: 'Tersedia',
      value: stats.tersedia,
      icon: '✅',
      bg: 'bg-green-50',
      color: 'text-green-600',
      sub: 'Tidak sedang digunakan',
    },
    {
      title: 'Sedang Digunakan',
      value: stats.sedangDigunakan,
      icon: '🔴',
      bg: 'bg-red-50',
      color: 'text-red-600',
    },
    {
      title: 'Ada Jadwal',
      value: stats.adaJadwal,
      icon: '📅',
      bg: 'bg-amber-50',
      color: 'text-amber-600',
      sub: 'Sudah di-booking',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`${c.bg} rounded-xl shadow-sm border border-slate-200 p-5`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{c.title}</p>
              <p className={`text-3xl font-bold ${c.color} mt-1`}>{c.value}</p>
              {c.sub && <p className="text-xs text-slate-400 mt-1">{c.sub}</p>}
            </div>
            <span className="text-3xl">{c.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============= RUANGAN LIST =============
function RuanganList({ selectedDate, currentTime }) {
  const { ruangan, filteredBookings, loading, error } =
    useRuanganData(selectedDate);
  const [filter, setFilter] = useState('all');

  const enhancedRuangan = useMemo(() => {
    if (loading || !ruangan.length) return [];

    const now = currentTime || new Date();
    const isToday = isSameDate(selectedDate, now);

    return ruangan
      .map((r) => {
        const roomBookings = filteredBookings.filter(
          (b) => String(b.ruangan_id) === String(r.id)
        );
        const currentBooking = isToday
          ? roomBookings.find((b) => now >= b.mulai && now < b.akhir)
          : null;
        const scheduledBookings = roomBookings
          .filter(
            (b) =>
              now < b.akhir && (!currentBooking || b.id !== currentBooking.id)
          )
          .sort((a, b) => a.mulai - b.mulai);

        return {
          ...r,
          status: currentBooking ? 'sedang_digunakan' : 'tersedia',
          currentBooking,
          scheduledBookings,
          totalBookings: roomBookings.length,
          hasSchedule: scheduledBookings.length > 0,
        };
      })
      .sort((a, b) => {
        const order = { sedang_digunakan: 0, tersedia: 1 };
        if (order[a.status] !== order[b.status])
          return order[a.status] - order[b.status];
        if (a.hasSchedule !== b.hasSchedule) return b.hasSchedule ? 1 : -1;

        const getNext = (r) =>
          r.currentBooking?.mulai ||
          r.scheduledBookings[0]?.mulai ||
          new Date(9999, 11, 31);
        return getNext(a) - getNext(b);
      });
  }, [ruangan, filteredBookings, loading, selectedDate, currentTime]);

  const filteredRuangan = useMemo(() => {
    if (filter === 'all') return enhancedRuangan;
    if (filter === 'ada_jadwal')
      return enhancedRuangan.filter(
        (r) => r.hasSchedule && r.status === 'tersedia'
      );
    return enhancedRuangan.filter((r) => r.status === filter);
  }, [enhancedRuangan, filter]);

  if (loading)
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      </div>
    );

  const filterBtns = [
    { key: 'all', label: 'Semua', count: enhancedRuangan.length },
    {
      key: 'tersedia',
      label: 'Tersedia',
      count: enhancedRuangan.filter((r) => r.status === 'tersedia').length,
    },
    {
      key: 'sedang_digunakan',
      label: 'Sedang Digunakan',
      count: enhancedRuangan.filter((r) => r.status === 'sedang_digunakan')
        .length,
    },
    {
      key: 'ada_jadwal',
      label: 'Ada Jadwal',
      count: enhancedRuangan.filter(
        (r) => r.hasSchedule && r.status === 'tersedia'
      ).length,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterBtns.map((b) => (
          <button
            key={b.key}
            onClick={() => setFilter(b.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === b.key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {b.label} ({b.count})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRuangan.map((r) => (
          <RuanganCard key={r.id} ruangan={r} selectedDate={selectedDate} />
        ))}
      </div>

      {!filteredRuangan.length && (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <p className="text-slate-500">
            Tidak ada ruangan dengan filter ini pada tanggal{' '}
            {formatDate(selectedDate)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============= RUANGAN CARD =============
function RuanganCard({ ruangan, selectedDate }) {
  const [expanded, setExpanded] = useState(false);
  const isToday = isSameDate(selectedDate, new Date());
  const now = new Date();
  const cfg = STATUS_CONFIG[ruangan.status];

  // Filter active bookings
  const activeBookings = ruangan.scheduledBookings.filter((b) => now < b.akhir);
  const showCurrent =
    ruangan.currentBooking && isToday && now < ruangan.currentBooking.akhir;
  const timeLeft = showCurrent
    ? Math.max(0, Math.floor((ruangan.currentBooking.akhir - now) / 60000))
    : 0;

  return (
    <div
      className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {ruangan.nama_ruangan || `Ruangan ${ruangan.id}`}
          </h3>
          <span
            className={`${cfg.badge} text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 mt-1`}
          >
            <span>{cfg.icon}</span>
            {cfg.text}
          </span>
        </div>
        {ruangan.totalBookings > 0 && (
          <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-full">
            {ruangan.totalBookings} jadwal
          </span>
        )}
      </div>

      {/* Current Booking */}
      {showCurrent && (
        <div className="bg-red-100/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-red-600">
              🔴 SEDANG BERLANGSUNG
            </span>
            <span
              className={`${SOURCE_COLORS[ruangan.currentBooking.sourceColor]} text-xs px-2 py-0.5 rounded-full`}
            >
              {ruangan.currentBooking.source}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {ruangan.currentBooking.description}
          </p>
          {ruangan.currentBooking.detail && (
            <p className="text-xs text-slate-500">
              {ruangan.currentBooking.detail}
            </p>
          )}
          <p className="text-xs text-slate-600 mt-1">
            ⏰ {formatTime(ruangan.currentBooking.mulai)} -{' '}
            {formatTime(ruangan.currentBooking.akhir)}
            {timeLeft > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({timeLeft} menit lagi)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Scheduled Bookings */}
      {activeBookings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {isToday
              ? 'Jadwal Hari Ini:'
              : `Jadwal ${formatDateShort(selectedDate)}:`}
          </p>
          {(expanded ? activeBookings : activeBookings.slice(0, 2)).map((b) => (
            <div
              key={b.id}
              className="bg-white/60 rounded-lg p-2.5 border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`${SOURCE_COLORS[b.sourceColor]} text-xs px-2 py-0.5 rounded-full`}
                >
                  {b.source}
                </span>
                <span className="text-xs text-slate-400">
                  {formatTime(b.mulai)} - {formatTime(b.akhir)}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800">
                {b.description}
              </p>
              {b.detail && <p className="text-xs text-slate-500">{b.detail}</p>}
            </div>
          ))}
          {activeBookings.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1"
            >
              {expanded
                ? '⬆️ Tutup'
                : `⬇️ Lihat ${activeBookings.length - 2} jadwal lainnya`}
            </button>
          )}
        </div>
      )}

      {/* No Schedule */}
      {ruangan.status === 'tersedia' && !activeBookings.length && (
        <p className="text-sm text-green-600 font-medium">
          ✨ Tidak ada jadwal pada tanggal ini
        </p>
      )}
    </div>
  );
}
