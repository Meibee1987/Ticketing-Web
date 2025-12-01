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

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1. Ambil jadwal_perkuliahan (ambil semua kolom untuk menghindari 400 jika nama kolom berbeda)
        const { data: jadwalData, error: jadwalError } = await supabase
          .from("jadwal_perkuliahan")
          .select("*,dosen(*),ruangan(*)")
          .order("id", { ascending: true });

        if (jadwalError) throw jadwalError;

        // 2. Jika relational select mengembalikan nested objects (dosen/ruangan), gunakan itu
        //    supaya tidak perlu query tambahan. Jika tidak, ambil tabel dosen & ruangan.
        if (!isMounted) return;

        const dosenMap = {};
        const ruanganMap = {};
        const sampleRow = (jadwalData && jadwalData[0]) || null;

        if (sampleRow && (sampleRow.dosen || sampleRow.ruangan)) {
          // Bangun map dari nested objects yang sudah tersedia di setiap row
          (jadwalData || []).forEach((r) => {
            if (r.dosen && r.dosen.id != null) {
              dosenMap[r.dosen.id] = r.dosen.nama_dosen ?? r.dosen.nama ?? r.dosen.name;
            }
            if (r.ruangan && r.ruangan.id != null) {
              ruanganMap[r.ruangan.id] = r.ruangan.nama_ruangan ?? r.ruangan.nama ?? r.ruangan.name;
            }
          });
        } else {
          const [{ data: dosenData, error: dosenError }, { data: ruanganData, error: ruanganError }] =
            await Promise.all([
              supabase.from("dosen").select("id, nama_dosen"),
              supabase.from("ruangan").select("id, nama_ruangan"),
            ]);

          if (dosenError) throw dosenError;
          if (ruanganError) throw ruanganError;

          (dosenData || []).forEach((d) => {
            dosenMap[d.id] = d.nama_dosen;
          });

          (ruanganData || []).forEach((r) => {
            ruanganMap[r.id] = r.nama_ruangan;
          });
        }

        // 4. Deteksi nama kolom di jadwal (agar kompatibel dengan berbagai skema)
        const sample = (jadwalData && jadwalData[0]) || {};
        const keys = Object.keys(sample);

        const findKey = (patterns) => {
          for (const p of patterns) {
            const rx = new RegExp(p, "i");
            const k = keys.find((kk) => rx.test(kk));
            if (k) return k;
          }
          return null;
        };

        const dosenIdKey = findKey(["^dosen_id$", "dosen.*id", "id_dosen", "dosen"]) || "dosen_id";
        const ruanganIdKey = findKey(["^ruangan_id$", "ruangan.*id", "id_ruangan", "ruangan"]) || "ruangan_id";
        const startKey = findKey(["awal", "mulai", "start", "jam_mulai", "waktu_mulai"]) || "awal_jadwal";
        const endKey = findKey(["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]) || "akhir_jadwal";

        // 5. Gabungkan nama_dosen & nama_ruangan ke data jadwal menggunakan key yang terdeteksi
        let merged = (jadwalData || []).map((j) => ({
          ...j,
          nama_dosen: dosenMap[j[dosenIdKey]] || "-",
          nama_ruangan: ruanganMap[j[ruanganIdKey]] || "-",
          _startKey: startKey,
          _endKey: endKey,
        }));

        // 6. Jika ada kolom id lain yang relevan (mis. jadwal_id), coba join nama_jadwal
        const jadwalIdKeyAuto = keys.find((k) => /jadwal/i.test(k) && /id/i.test(k));
        if (jadwalIdKeyAuto) {
          const tableName = jadwalIdKeyAuto.replace(/(^id_|_id$)/i, "");
          try {
            // Ambil sample dari tabel terkait untuk mendeteksi nama kolom
            const { data: sampleTbl, error: sampleErr } = await supabase
              .from(tableName)
              .select("*")
              .limit(1)
              .maybeSingle();

            if (!sampleErr && sampleTbl) {
              const candidateNameKeys = [
                "nama_jadwal",
                "nama",
                "name",
                "title",
                "judul",
                "nama_mata_kuliah",
                "nama_matkul",
              ];

              const foundNameKey = candidateNameKeys.find((ck) => ck in sampleTbl) || Object.keys(sampleTbl).find((k) => /nama|name|title|judul/i.test(k));

              if (foundNameKey) {
                const { data: namaTblData, error: namaTblErr } = await supabase
                  .from(tableName)
                  .select("id, " + foundNameKey);

                if (!namaTblErr) {
                  const namaMap = {};
                  (namaTblData || []).forEach((r) => {
                    namaMap[r.id] = r[foundNameKey];
                  });

                  // Tambahkan properti nama_jadwal ke setiap row jadwal
                  merged = merged.map((j) => ({
                    ...j,
                    nama_jadwal: namaMap[j[jadwalIdKeyAuto]] || "-",
                  }));
                }
              }
            }
          } catch (e) {
            console.warn("Tidak dapat join nama_jadwal:", e);
          }
        }

        setJadwal(merged);
      } catch (err) {
        console.error("Error mengambil data:", err);
        if (isMounted) {
          setError("Gagal mengambil data jadwal: " + (err.message || ""));
          setJadwal([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

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
                <th className="py-2 pr-2">Dosen</th>
                <th className="py-2 pr-2">Ruangan</th>
                {jadwal[0] && jadwal[0].nama_jadwal && (
                  <th className="py-2 pr-2">Nama Jadwal</th>
                )}
                <th className="py-2 pr-2">Mulai</th>
                <th className="py-2 pr-2">Selesai</th>
              </tr>
            </thead>
            <tbody>
              {jadwal.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{row.nama_dosen}</td>
                  <td className="py-2 pr-2">{row.nama_ruangan}</td>
                  {row.nama_jadwal && <td className="py-2 pr-2">{row.nama_jadwal}</td>}
                  <td className="py-2 pr-2">{row[row._startKey] ?? "-"}</td>
                  <td className="py-2 pr-2">{row[row._endKey] ?? "-"}</td>
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
