import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

// ============= UTILITIES =============
const timeToSeconds = (timeStr) => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + (seconds || 0);
};

const normalizeTime = (time) => time?.length === 5 ? time + ":00" : time;

const detectTimeKeys = (jadwal) => {
  if (!jadwal?.[0]) return { startKey: "mulai", endKey: "selesai" };
  const keys = Object.keys(jadwal[0]);
  const findKey = (patterns) => {
    for (const pattern of patterns) {
      const key = keys.find(k => new RegExp(pattern, "i").test(k));
      if (key) return key;
    }
    return patterns[0];
  };
  return {
    startKey: findKey(["mulai", "awal", "start", "jam_mulai"]),
    endKey: findKey(["selesai", "akhir", "end", "jam_selesai"])
  };
};

export default function RuanganPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(prev => prev + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">Manajemen Ruangan & Ketersediaan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Admin bisa melihat ruangan mana yang kosong sekarang, ruangan mana yang sudah terpakai, dan persentase okupansi ruangan.
        </p>
      </header>
      <div className="sticky top-0 z-30 bg-gradient-to-br from-blue-50 via-yellow-50 to-blue-100 pb-4 -mx-4 md:-mx-6 px-4 md:px-6 pt-2">
        <RuanganStats key={refreshKey} />
      </div>
      <RuanganList key={refreshKey + 1000} />
    </div>
  );
}

// ============= HOOKS =============
function useRuanganData() {
  const [state, setState] = useState({
    ruangan: [],
    jadwal: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const [ruanganRes, jadwalRes] = await Promise.all([
        supabase.from("ruangan").select("*").order("nama_ruangan"),
        supabase.from("jadwal_perkuliahan").select("*"),
      ]);

      if (ruanganRes.error) throw ruanganRes.error;
      if (jadwalRes.error) throw jadwalRes.error;

      setState({
        ruangan: ruanganRes.data || [],
        jadwal: jadwalRes.data || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        ruangan: [],
        jadwal: [],
        loading: false,
        error: err.message || "Gagal mengambil data",
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}

function useRuanganStats(ruangan, jadwal, loading) {
  return useMemo(() => {
    if (loading || !ruangan.length) {
      return { total: 0, kosong: 0, terjadwal: 0, terpakai: 0 };
    }

    const currentSeconds = timeToSeconds(new Date().toTimeString().slice(0, 8));
    const { startKey, endKey } = detectTimeKeys(jadwal);
    
    const ruanganTerpakai = new Set();
    const ruanganTerjadwal = new Set();
    
    jadwal.forEach(j => {
      if (!j[startKey] || !j[endKey]) return;
      
      const startSeconds = timeToSeconds(normalizeTime(j[startKey]));
      const endSeconds = timeToSeconds(normalizeTime(j[endKey]));
      
      if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
        ruanganTerpakai.add(j.ruangan_id);
      } else if (currentSeconds < startSeconds && !ruanganTerpakai.has(j.ruangan_id)) {
        ruanganTerjadwal.add(j.ruangan_id);
      }
    });

    return {
      total: ruangan.length,
      kosong: ruangan.length - ruanganTerpakai.size - ruanganTerjadwal.size,
      terjadwal: ruanganTerjadwal.size,
      terpakai: ruanganTerpakai.size,
    };
  }, [ruangan, jadwal, loading]);
}

function useEnhancedRuangan(ruangan, jadwal, loading) {
  return useMemo(() => {
    if (loading || !ruangan.length) return [];

    const currentSeconds = timeToSeconds(new Date().toTimeString().slice(0, 8));
    const { startKey, endKey } = detectTimeKeys(jadwal);

    return ruangan.map(r => {
      const jadwalRuangan = jadwal.filter(j => String(j.ruangan_id) === String(r.id));
      
      const jadwalAktif = jadwalRuangan.filter(j => {
        if (!j[startKey] || !j[endKey]) return false;
        const startSeconds = timeToSeconds(normalizeTime(j[startKey]));
        const endSeconds = timeToSeconds(normalizeTime(j[endKey]));
        return currentSeconds >= startSeconds && currentSeconds < endSeconds;
      });

      const jadwalTerjadwal = jadwalRuangan.filter(j => {
        if (!j[startKey] || !j[endKey]) return false;
        const startSeconds = timeToSeconds(normalizeTime(j[startKey]));
        return currentSeconds < startSeconds;
      });

      return {
        ...r,
        status: jadwalAktif.length > 0 ? "terpakai" : jadwalTerjadwal.length > 0 ? "terjadwal" : "kosong",
        jadwalAktif,
        jadwalTerjadwal,
      };
    });
  }, [ruangan, jadwal, loading]);
}

// ============= COMPONENTS =============
function RuanganStats() {
  const { ruangan, jadwal, loading } = useRuanganData();
  const stats = useRuanganStats(ruangan, jadwal, loading);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Total Ruangan", value: stats.total, icon: "📊", color: "blue" },
    { title: "Ruangan Kosong", value: stats.kosong, icon: "✓", color: "green" },
    { title: "Ruangan Terjadwal", value: stats.terjadwal, icon: "📅", color: "blue" },
    { title: "Ruangan Terpakai", value: stats.terpakai, icon: "🔒", color: "orange" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <StatCard key={idx} {...card} />
      ))}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`text-2xl ${colors[color]} w-10 h-10 rounded-lg flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function RuanganList() {
  const { ruangan, jadwal, loading, error } = useRuanganData();
  const enhancedRuangan = useEnhancedRuangan(ruangan, jadwal, loading);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded"></div>
          ))}
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Daftar Ruangan</h2>
      <div className="space-y-3">
        {enhancedRuangan.map(r => (
          <RuanganCard key={r.id} ruangan={r} />
        ))}
      </div>
    </div>
  );
}

function RuanganCard({ ruangan }) {
  const config = {
    kosong: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", icon: "✅", text: "Kosong" },
    terjadwal: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", icon: "📅", text: "Terjadwal" },
    terpakai: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", icon: "🔒", text: "Terpakai" },
  }[ruangan.status];

  const sampleJadwal = ruangan.jadwalAktif?.[0] || ruangan.jadwalTerjadwal?.[0];
  const { startKey, endKey } = detectTimeKeys(sampleJadwal ? [sampleJadwal] : []);
  const formatTime = (time) => time?.substring(0, 5) || "-";

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-base font-semibold text-slate-800">
          {ruangan.nama_ruangan || `Ruangan ${ruangan.id}`}
        </h3>
        <span className={`${config.badge} text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
          <span>{config.icon}</span>
          {config.text}
        </span>
      </div>

      {ruangan.jadwalAktif?.length > 0 && (
        <div className="text-sm text-slate-600 mb-2">
          <p className="font-medium">Sedang digunakan:</p>
          <ul className="mt-1 space-y-1">
            {ruangan.jadwalAktif.map((j, idx) => (
              <li key={idx} className="text-xs text-orange-600 font-medium">
                • {j.nama_jadwal || "Jadwal"} ({formatTime(j[startKey])} - {formatTime(j[endKey])})
              </li>
            ))}
          </ul>
        </div>
      )}

      {ruangan.jadwalTerjadwal?.length > 0 && (
        <div className="text-sm text-slate-600">
          <p className="font-medium">Dijadwalkan berikutnya:</p>
          <ul className="mt-1 space-y-1">
            {ruangan.jadwalTerjadwal.map((j, idx) => (
              <li key={idx} className="text-xs text-blue-600">
                • {j.nama_jadwal || "Jadwal"} ({formatTime(j[startKey])} - {formatTime(j[endKey])})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
