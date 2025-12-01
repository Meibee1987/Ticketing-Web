// src/Pages/dashboard/OverviewPage.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <DashboardContent />
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

      {/* Jadwal Perkuliahan */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <JadwalPerkuliahanTable />
        </div>

        {/* Notes */}
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
    let isMounted = true;

    const fetchJadwal = async () => {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("jadwal_perkuliahan")
          .select("*")
          .order("id", { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching jadwal:", error);
          setError("Gagal mengambil data jadwal: " + error.message);
          setJadwal([]);
        } else {
          setJadwal(data || []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Unexpected error:", err);
          setError("Terjadi kesalahan saat mengambil data jadwal.");
          setJadwal([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchJadwal();

    return () => {
      isMounted = false;
    };
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
                {Object.keys(jadwal[0]).map((key) => (
                  <th key={key} className="py-2 pr-2 capitalize">{key.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jadwal.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="py-2 pr-2 text-xs">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                    </td>
                  ))}
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
