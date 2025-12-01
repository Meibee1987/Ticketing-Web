import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";

export default function RuanganPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader />
      <RuanganStats key={refreshKey} />
      <RuanganList key={refreshKey + 1000} />
    </div>
  );
}

// Header Component
function PageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-800">Manajemen Ruangan & Ketersediaan</h1>
      <p className="text-sm text-slate-500 mt-1">
        Admin bisa melihat ruangan mana yang kosong sekarang, ruangan mana yang sudah terpakai, dan persentase okupansi ruangan.
      </p>
    </header>
  );
}

// Custom hook untuk fetch data
function useRuanganData() {
  const [state, setState] = useState({
    ruangan: [],
    jadwal: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Fetch ruangan dan jadwal
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
      console.error("Error fetching data:", err);
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

  return { ...state, refetch: fetchData };
}

// Stats Component
function RuanganStats() {
  const { ruangan, jadwal, loading } = useRuanganData();
  const [stats, setStats] = useState({
    total: 0,
    kosong: 0,
    terpakai: 0,
  });

  useEffect(() => {
    if (loading || !ruangan.length) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    console.log("=== STATS CALCULATION ===");
    console.log("Current time:", currentTime);
    console.log("Total ruangan:", ruangan.length);
    console.log("Total jadwal:", jadwal.length);

    // Deteksi kolom waktu dari jadwal
    const sampleJadwal = jadwal[0];
    let startKey = "mulai";
    let endKey = "selesai";

    if (sampleJadwal) {
      const keys = Object.keys(sampleJadwal);
      console.log("Sample jadwal keys:", keys);
      const findKey = (patterns) => {
        for (const p of patterns) {
          const rx = new RegExp(p, "i");
          const k = keys.find((kk) => rx.test(kk));
          if (k) return k;
        }
        return patterns[0];
      };
      startKey = findKey(["mulai", "awal", "start", "jam_mulai"]);
      endKey = findKey(["selesai", "akhir", "end", "jam_selesai"]);
    }

    console.log("Using keys:", { startKey, endKey });

    // Helper function untuk konversi waktu ke detik
    const timeToSeconds = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 3600 + minutes * 60 + (seconds || 0);
    };

    const currentSeconds = timeToSeconds(currentTime);
    console.log(`Current time in seconds: ${currentSeconds} (${currentTime})`);

    // Hitung ruangan yang sedang terpakai
    const ruanganTerpakai = new Set();
    jadwal.forEach((j) => {
      const start = j[startKey];
      const end = j[endKey];
      
      console.log(`Jadwal for ruangan_id ${j.ruangan_id}:`, { start, end });
      
      if (start && end) {
        const normalizedStart = start.length === 5 ? start + ":00" : start;
        const normalizedEnd = end.length === 5 ? end + ":00" : end;
        
        const startSeconds = timeToSeconds(normalizedStart);
        const endSeconds = timeToSeconds(normalizedEnd);
        
        const isActive = currentSeconds >= startSeconds && currentSeconds < endSeconds;
        
        console.log(`  Checking: ${normalizedStart} (${startSeconds}s) - ${normalizedEnd} (${endSeconds}s), isActive: ${isActive}`);
        
        if (isActive) {
          ruanganTerpakai.add(j.ruangan_id);
          console.log(`  ✓ Ruangan ${j.ruangan_id} TERPAKAI`);
        }
      }
    });

    const terpakai = ruanganTerpakai.size;
    const total = ruangan.length;
    const kosong = total - terpakai;

    console.log("Final stats:", { total, kosong, terpakai });
    console.log("========================");

    setStats({ total, kosong, terpakai });
  }, [ruangan, jadwal, loading]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Total Ruangan"
        value={stats.total}
        icon="📊"
        color="blue"
      />
      <StatCard
        title="Ruangan Kosong"
        value={stats.kosong}
        icon="✅"
        color="green"
      />
      <StatCard
        title="Ruangan Terpakai"
        value={stats.terpakai}
        icon="🔒"
        color="orange"
      />
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`text-2xl ${colorClasses[color]} w-10 h-10 rounded-lg flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

// List Component
function RuanganList() {
  const { ruangan, jadwal, loading, error } = useRuanganData();
  const [ruanganWithStatus, setRuanganWithStatus] = useState([]);

  useEffect(() => {
    if (loading || !ruangan.length) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8);

    console.log("Current time:", currentTime);
    console.log("Total jadwal:", jadwal.length);

    // Deteksi kolom waktu
    const sampleJadwal = jadwal[0];
    let startKey = "mulai";
    let endKey = "selesai";

    if (sampleJadwal) {
      const keys = Object.keys(sampleJadwal);
      const findKey = (patterns) => {
        for (const p of patterns) {
          const rx = new RegExp(p, "i");
          const k = keys.find((kk) => rx.test(kk));
          if (k) return k;
        }
        return patterns[0];
      };
      startKey = findKey(["mulai", "awal", "start", "jam_mulai"]);
      endKey = findKey(["selesai", "akhir", "end", "jam_selesai"]);
    }

    console.log("Detected keys:", { startKey, endKey });

    // Helper function untuk konversi waktu ke detik
    const timeToSeconds = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 3600 + minutes * 60 + (seconds || 0);
    };

    const currentSeconds = timeToSeconds(currentTime);

    // Tambahkan status ke setiap ruangan
    const enhanced = ruangan.map((r) => {
      // Cari semua jadwal untuk ruangan ini
      const jadwalRuangan = jadwal.filter((j) => {
        const match = String(j.ruangan_id) === String(r.id);
        if (match) {
          console.log(`Found jadwal for ruangan ${r.nama_ruangan}:`, {
            jadwal_id: j.id,
            start: j[startKey],
            end: j[endKey],
            ruangan_id: j.ruangan_id,
            currentTime
          });
        }
        return match;
      });
      
      // Filter jadwal yang sedang berlangsung
      const jadwalAktif = jadwalRuangan.filter((j) => {
        const start = j[startKey];
        const end = j[endKey];
        
        if (!start || !end) return false;
        
        const normalizedStart = start.length === 5 ? start + ":00" : start;
        const normalizedEnd = end.length === 5 ? end + ":00" : end;
        
        const startSeconds = timeToSeconds(normalizedStart);
        const endSeconds = timeToSeconds(normalizedEnd);
        
        const isActive = currentSeconds >= startSeconds && currentSeconds < endSeconds;
        
        console.log(`Checking jadwal for ${r.nama_ruangan}:`, {
          start: normalizedStart,
          end: normalizedEnd,
          current: currentTime,
          startSeconds,
          endSeconds,
          currentSeconds,
          isActive
        });
        
        return isActive;
      });

      console.log(`Ruangan ${r.nama_ruangan}: ${jadwalAktif.length} jadwal aktif`);

      return {
        ...r,
        status: jadwalAktif.length > 0 ? "terpakai" : "kosong",
        jadwalAktif,
      };
    });

    setRuanganWithStatus(enhanced);
  }, [ruangan, jadwal, loading]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded"></div>
            ))}
          </div>
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
        {ruanganWithStatus.map((r) => (
          <RuanganCard key={r.id} ruangan={r} />
        ))}
      </div>
    </div>
  );
}

function RuanganCard({ ruangan }) {
  const statusConfig = {
    kosong: {
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      icon: "✅",
      text: "Kosong",
    },
    terpakai: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-100 text-orange-700",
      icon: "🔒",
      text: "Terpakai",
    },
  };

  const config = statusConfig[ruangan.status];

  // Deteksi key dari jadwal aktif
  const sampleJadwal = ruangan.jadwalAktif?.[0];
  const keys = sampleJadwal ? Object.keys(sampleJadwal) : [];
  const findKey = (patterns) => {
    for (const p of patterns) {
      const rx = new RegExp(p, "i");
      const k = keys.find((kk) => rx.test(kk));
      if (k) return k;
    }
    return patterns[0];
  };
  const startKey = findKey(["awal", "mulai", "start", "jam_mulai"]);
  const endKey = findKey(["akhir", "selesai", "end", "jam_selesai"]);

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-semibold text-slate-800">
              {ruangan.nama_ruangan || `Ruangan ${ruangan.id}`}
            </h3>
            <span className={`${config.badge} text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
              <span>{config.icon}</span>
              {config.text}
            </span>
          </div>

          {ruangan.status === "terpakai" && ruangan.jadwalAktif.length > 0 && (
            <div className="text-sm text-slate-600">
              <p>Sedang digunakan untuk jadwal:</p>
              <ul className="mt-1 space-y-1">
                {ruangan.jadwalAktif.map((j, idx) => (
                  <li key={idx} className="text-xs text-slate-500">
                    • {j.nama_jadwal || "Jadwal"} ({j[startKey]?.substring(0,5) || "-"} - {j[endKey]?.substring(0,5) || "-"})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
