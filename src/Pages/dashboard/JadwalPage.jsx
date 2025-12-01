// src/Pages/dashboard/JadwalPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function JadwalPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Jadwal Perkuliahan
            </h1>
            <p className="text-sm text-slate-500">
              Daftar jadwal lengkap dengan nama dosen dan ruangan.
            </p>
          </div>
        </header>

        <JadwalPerkuliahanTable />
      </div>
    </div>
  );
}

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

        // Ambil jadwal + relasi dosen & ruangan
        const { data, error } = await supabase
          .from("jadwal_perkuliahan")
          .select(`
            id,
            akhir_jadwal,
            dosen (
              nama_dosen
            ),
            ruangan (
              nama_ruangan
            )
          `)
          .order("id", { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching jadwal:", error);
          setError("Gagal mengambil data jadwal: " + error.message);
          setJadwal([]);
        } else {
          setJadwal(data || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        if (isMounted) {
          setError("Terjadi kesalahan saat mengambil data jadwal.");
          setJadwal([]);
        }
      } finally {
        if (isMounted) setLoading(false);
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
        Tabel Jadwal
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
                <th className="py-2 pr-2">Dosen</th>
                <th className="py-2 pr-2">Ruangan</th>
                {/* kalau nanti kamu punya kolom awal_jadwal, bisa tambahkan kolom Mulai di sini */}
                <th className="py-2 pr-2">Akhir Jadwal</th>
              </tr>
            </thead>
            <tbody>
              {jadwal.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    {row.dosen?.nama_dosen || "-"}
                  </td>
                  <td className="py-2 pr-2">
                    {row.ruangan?.nama_ruangan || "-"}
                  </td>
                  <td className="py-2 pr-2">
                    {row.akhir_jadwal || "-"}
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
