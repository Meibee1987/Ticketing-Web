// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { supabase, TOKEN_KEY } from "../../supabaseClient";

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } bg-slate-900 text-slate-100 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <span className="text-xl font-bold tracking-tight">
            {isSidebarOpen ? "MyDashboard" : "MD"}
          </span>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4 space-y-1">
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 rounded-r-full">
            📊 <span className="ml-2">{isSidebarOpen && "Overview"}</span>
          </button>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 rounded-r-full">
            👥 <span className="ml-2">{isSidebarOpen && "Users"}</span>
          </button>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 rounded-r-full">
            ⚙️ <span className="ml-2">{isSidebarOpen && "Settings"}</span>
          </button>
        </nav>

        {/* Logout di bawah */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-red-400"
          >
            🚪 {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md border border-slate-200"
            >
              ☰
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-800">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-slate-500">
              Hi, Azka 👋
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-300" />
          </div>
        </header>

        {/* Content (Overview page) */}
        <main className="flex-1 p-4 md:p-6">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}

/* ================== OVERVIEW CONTENT ================== */

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Users"
          value="1,245"
          description="+12% from last month"
        />
        <StatCard
          title="Revenue"
          value="$8,540"
          description="+8.3% from last month"
        />
        <StatCard
          title="Active Sessions"
          value="312"
          description="Currently online"
        />
      </section>

      {/* Tabel jadwal perkuliahan dari Supabase */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <JadwalPerkuliahanTable />
        </div>

        {/* Kartu samping (notes) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-800 mb-2">
            Quick Notes
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Tempat untuk menaruh informasi singkat, pengumuman, atau todo list.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
            <li>Review jadwal minggu ini</li>
            <li>Cek ketersediaan ruangan</li>
            <li>Koordinasi dengan dosen pengampu</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

/* ================== KOMPONEN TABEL JADWAL ================== */

function JadwalPerkuliahanTable() {
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJadwal = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("jadwal_perkuliahan")
        .select("*")
        // OPTIONAL: urutkan, sesuaikan dengan nama kolommu
        .order("hari", { ascending: true });

      if (error) {
        console.error(error);
        setError("Gagal mengambil data jadwal.");
      } else {
        setJadwal(data || []);
      }

      setLoading(false);
    };

    fetchJadwal();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h2 className="text-base font-semibold text-slate-800 mb-4">
        Jadwal Perkuliahan
      </h2>

      {loading && (
        <p className="text-sm text-slate-500">Memuat jadwal...</p>
      )}

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {!loading && !error && jadwal.length === 0 && (
        <p className="text-sm text-slate-500">
          Belum ada data jadwal perkuliahan.
        </p>
      )}

      {!loading && !error && jadwal.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-2">Hari</th>
                <th className="py-2 pr-2">Mata Kuliah</th>
                <th className="py-2 pr-2">Dosen</th>
                <th className="py-2 pr-2">Ruangan</th>
                <th className="py-2 pr-2">Jam</th>
              </tr>
            </thead>
            <tbody>
              {jadwal.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {/* GANTI nama kolom di bawah sesuai dengan tabel kamu */}
                  <td className="py-2 pr-2">{row.hari}</td>
                  <td className="py-2 pr-2">{row.mata_kuliah}</td>
                  <td className="py-2 pr-2">{row.dosen}</td>
                  <td className="py-2 pr-2">{row.ruangan}</td>
                  <td className="py-2 pr-2">
                    {row.jam_mulai} - {row.jam_selesai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================== STAT CARD ================== */

function StatCard({ title, value, description }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
