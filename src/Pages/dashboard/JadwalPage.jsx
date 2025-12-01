import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

export default function JadwalPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <JadwalTable />
    </div>
  );
}

// Header Component
function PageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-800">Jadwal Perkuliahan</h1>
      <p className="text-sm text-slate-500 mt-1">
        Daftar jadwal lengkap dengan nama dosen dan ruangan.
      </p>
    </header>
  );
}

// Custom hook untuk fetch jadwal
function useJadwal() {
  const [state, setState] = useState({
    jadwal: [],
    loading: true,
    error: null,
  });

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Try relational select first
      const jadwalRes = await supabase
        .from("jadwal_perkuliahan")
        .select("*, dosen(*), ruangan(*)")
        .order("id", { ascending: true });

      if (jadwalRes.error) {
        // Fallback to basic select
        const basic = await supabase
          .from("jadwal_perkuliahan")
          .select("*")
          .order("id", { ascending: true });

        if (basic.error) throw basic.error;

        const jadwalData = basic.data || [];

        // Fetch related data
        const [{ data: dosenData }, { data: ruanganData }] = await Promise.all([
          supabase.from("dosen").select("id, nama_dosen"),
          supabase.from("ruangan").select("id, nama_ruangan"),
        ]);

        const dosenMap = {};
        (dosenData || []).forEach((d) => (dosenMap[d.id] = d.nama_dosen));
        const ruanganMap = {};
        (ruanganData || []).forEach((r) => (ruanganMap[r.id] = r.nama_ruangan));

        // Detect column names dynamically
        const sample = jadwalData[0] || {};
        const keys = Object.keys(sample);
        const findKey = (patterns) => {
          for (const p of patterns) {
            const rx = new RegExp(p, "i");
            const k = keys.find((kk) => rx.test(kk));
            if (k) return k;
          }
          return null;
        };

        const startKey = findKey(["awal", "mulai", "start", "jam_mulai", "waktu_mulai"]);
        const endKey = findKey(["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]);
        const nameKey = findKey(["nama_jadwal", "nama", "title", "judul"]);

        const merged = jadwalData.map((j) => ({
          ...j,
          nama_dosen: dosenMap[j.dosen_id] || "-",
          nama_ruangan: ruanganMap[j.ruangan_id] || "-",
          awal_jadwal: j[startKey] || "-",
          akhir_jadwal: j[endKey] || "-",
          nama_jadwal: j[nameKey] || "-",
        }));

        setState({ jadwal: merged, loading: false, error: null });
      } else {
        const rows = jadwalRes.data || [];

        const merged = rows.map((r) => {
          const result = { ...r };

          // Map dosen
          if (r.dosen) {
            result.nama_dosen = r.dosen.nama_dosen ?? r.dosen.nama ?? r.dosen.name ?? "-";
          } else {
            result.nama_dosen = r.dosen_id ? String(r.dosen_id) : "-";
          }

          // Map ruangan
          if (r.ruangan) {
            result.nama_ruangan = r.ruangan.nama_ruangan ?? r.ruangan.nama ?? r.ruangan.name ?? "-";
          } else {
            result.nama_ruangan = r.ruangan_id ? String(r.ruangan_id) : "-";
          }

          // Detect dynamic column names
          const kList = Object.keys(r || {});
          const findKeyLocal = (patterns) => {
            for (const p of patterns) {
              const rx = new RegExp(p, "i");
              const k = kList.find((kk) => rx.test(kk));
              if (k) return k;
            }
            return null;
          };

          const startKey = findKeyLocal(["awal", "mulai", "start", "jam_mulai", "waktu_mulai"]);
          const endKey = findKeyLocal(["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]);
          const nameKey = findKeyLocal(["nama_jadwal", "nama", "title", "judul"]);

          result.awal_jadwal = r[startKey] || "-";
          result.akhir_jadwal = r[endKey] || "-";
          result.nama_jadwal = r[nameKey] || "-";

          return result;
        });

        setState({ jadwal: merged, loading: false, error: null });
      }
    } catch (err) {
      console.error("Error fetching jadwal:", err);
      setState({
        jadwal: [],
        loading: false,
        error: err.message || "Gagal mengambil data jadwal",
      });
    }
  }, []);

  useEffect(() => {
    fetchJadwal();
  }, [fetchJadwal]);

  return { ...state, refetch: fetchJadwal };
}

// Table Component
function JadwalTable() {
  const { jadwal, loading, error, refetch } = useJadwal();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({
    id: null,
    dosen_id: "",
    ruangan_id: "",
    nama_jadwal: "",
    awal_jadwal: "",
    akhir_jadwal: "",
  });
  const [dosenOptions, setDosenOptions] = useState([]);
  const [ruanganOptions, setRuanganOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    start: "awal_jadwal",
    end: "akhir_jadwal",
    name: "nama_jadwal",
  });

  // Fetch options for dropdowns and detect column names
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [{ data: dosenData }, { data: ruanganData }, { data: sampleJadwal }] = await Promise.all([
          supabase.from("dosen").select("id, nama_dosen"),
          supabase.from("ruangan").select("id, nama_ruangan"),
          supabase.from("jadwal_perkuliahan").select("*").limit(1),
        ]);
        setDosenOptions(dosenData || []);
        setRuanganOptions(ruanganData || []);

        // Detect actual column names from database
        if (sampleJadwal && sampleJadwal.length > 0) {
          const keys = Object.keys(sampleJadwal[0]);
          const findKey = (patterns) => {
            for (const p of patterns) {
              const rx = new RegExp(p, "i");
              const k = keys.find((kk) => rx.test(kk));
              if (k) return k;
            }
            return patterns[0]; // fallback to first pattern
          };

          setColumnMapping({
            start: findKey(["awal", "mulai", "start", "jam_mulai", "waktu_mulai"]),
            end: findKey(["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]),
            name: findKey(["nama_jadwal", "nama", "title", "judul"]),
          });
        }
      } catch (err) {
        console.error("Error fetching options:", err);
      }
    };
    fetchOptions();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setForm({
      id: null,
      dosen_id: "",
      ruangan_id: "",
      nama_jadwal: "",
      awal_jadwal: "",
      akhir_jadwal: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setModalMode("edit");
    setForm({
      id: row.id,
      dosen_id: row.dosen_id || "",
      ruangan_id: row.ruangan_id || "",
      nama_jadwal: row.nama_jadwal || "",
      awal_jadwal: row.awal_jadwal || "",
      akhir_jadwal: row.akhir_jadwal || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({
      id: null,
      dosen_id: "",
      ruangan_id: "",
      nama_jadwal: "",
      awal_jadwal: "",
      akhir_jadwal: "",
    });
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const checkConflict = async () => {
    if (!form.awal_jadwal || !form.akhir_jadwal) {
      return null; // Skip jika waktu belum diisi
    }

    // Validasi waktu
    if (form.awal_jadwal >= form.akhir_jadwal) {
      return "• Waktu mulai harus lebih awal dari waktu selesai";
    }

    try {
      // Ambil semua jadwal kecuali yang sedang diedit
      const { data: allJadwal } = await supabase
        .from("jadwal_perkuliahan")
        .select("*")
        .neq("id", form.id || 0);

      if (!allJadwal || allJadwal.length === 0) return null;

      const conflicts = [];
      const startKey = columnMapping.start;
      const endKey = columnMapping.end;

      // Normalisasi waktu form ke format HH:mm:ss
      const normalizeTime = (time) => {
        if (!time) return null;
        // Jika format HH:mm, tambahkan :00
        if (time.length === 5) return time + ":00";
        return time;
      };

      const formStart = normalizeTime(form.awal_jadwal);
      const formEnd = normalizeTime(form.akhir_jadwal);

      for (const j of allJadwal) {
        const existingStart = normalizeTime(j[startKey]);
        const existingEnd = normalizeTime(j[endKey]);

        if (!existingStart || !existingEnd) continue;

        // Cek apakah waktu bertabrakan (overlap detection)
        const isTimeOverlap = 
          (formStart < existingEnd && formEnd > existingStart);

        if (isTimeOverlap) {
          // Cek ruangan bentrok
          if (form.ruangan_id && String(j.ruangan_id) === String(form.ruangan_id)) {
            const ruangan = ruanganOptions.find(r => String(r.id) === String(form.ruangan_id));
            conflicts.push(`• Ruangan "${ruangan?.nama_ruangan || form.ruangan_id}" sudah dipakai jam ${existingStart.substring(0,5)} - ${existingEnd.substring(0,5)}`);
          }

          // Cek dosen bentrok
          if (form.dosen_id && String(j.dosen_id) === String(form.dosen_id)) {
            const dosen = dosenOptions.find(d => String(d.id) === String(form.dosen_id));
            conflicts.push(`• Dosen "${dosen?.nama_dosen || form.dosen_id}" sudah mengajar jam ${existingStart.substring(0,5)} - ${existingEnd.substring(0,5)}`);
          }
        }
      }

      return conflicts.length > 0 ? conflicts.join('\n') : null;
    } catch (err) {
      console.error("Error checking conflict:", err);
      return null;
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validasi bentrok sebelum save
      const conflict = await checkConflict();
      if (conflict) {
        alert(`⚠️ Bentrok terdeteksi!\n\n${conflict}`);
        setSaving(false);
        return;
      }
      
      // Use detected column names from database
      const payload = {
        dosen_id: form.dosen_id || null,
        ruangan_id: form.ruangan_id || null,
        [columnMapping.name]: form.nama_jadwal || null,
        [columnMapping.start]: form.awal_jadwal || null,
        [columnMapping.end]: form.akhir_jadwal || null,
      };

      if (modalMode === "add") {
        const { error } = await supabase.from("jadwal_perkuliahan").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jadwal_perkuliahan").update(payload).eq("id", form.id);
        if (error) throw error;
      }

      closeModal();
      refetch();
    } catch (err) {
      console.error("Error saving:", err);
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      const { error } = await supabase.from("jadwal_perkuliahan").delete().eq("id", id);
      if (error) throw error;
      refetch();
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Gagal menghapus: " + err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === jadwal.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(jadwal.map((r) => r.id));
    }
  };

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) {
      alert("Pilih tepat 1 jadwal untuk diedit");
      return;
    }
    const row = jadwal.find((r) => r.id === selectedIds[0]);
    if (row) openEditModal(row);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Pilih minimal 1 jadwal untuk dihapus");
      return;
    }
    if (!confirm(`Hapus ${selectedIds.length} jadwal terpilih?`)) return;
    try {
      const { error } = await supabase.from("jadwal_perkuliahan").delete().in("id", selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      refetch();
    } catch (err) {
      console.error("Error deleting selected:", err);
      alert("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Jadwal Perkuliahan</h2>
        <div className="flex gap-2">
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Tambah Jadwal
          </button>
          <button
            onClick={handleEditSelected}
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Edit Terpilih
          </button>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Hapus Terpilih
          </button>
        </div>
      </div>

      <TableContent
        jadwal={jadwal}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        toggleSelectAll={toggleSelectAll}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <JadwalModal
          mode={modalMode}
          form={form}
          dosenOptions={dosenOptions}
          ruanganOptions={ruanganOptions}
          saving={saving}
          onChange={handleChange}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// Table Content with states
function TableContent({ jadwal, loading, error, selectedIds, toggleSelect, toggleSelectAll, onEdit, onDelete }) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (jadwal.length === 0) {
    return <EmptyState />;
  }

  return (
    <DataTable
      data={jadwal}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      onToggleSelectAll={toggleSelectAll}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="text-sm text-slate-500 mt-2">Memuat jadwal...</p>
      </div>
    </div>
  );
}

// Error State
function ErrorState({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-600">⚠️ {message}</p>
    </div>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-slate-400 mb-2">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm text-slate-500">Belum ada data jadwal perkuliahan.</p>
    </div>
  );
}

// Data Table
function DataTable({ data, selectedIds, onToggleSelect, onToggleSelectAll, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-700 border-b border-slate-300">
            <th className="py-3 px-4 w-12">
              <input
                type="checkbox"
                checked={selectedIds.length === data.length && data.length > 0}
                onChange={onToggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4 font-semibold">Dosen</th>
            <th className="py-3 px-4 font-semibold">Ruangan</th>
            <th className="py-3 px-4 font-semibold">Nama Jadwal</th>
            <th className="py-3 px-4 font-semibold">Mulai</th>
            <th className="py-3 px-4 font-semibold">Selesai</th>
            <th className="py-3 px-4 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                  className="w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="py-3 px-4 text-slate-800">{row.nama_dosen}</td>
              <td className="py-3 px-4 text-slate-800">{row.nama_ruangan}</td>
              <td className="py-3 px-4 text-slate-800">{row.nama_jadwal}</td>
              <td className="py-3 px-4 text-slate-800">{row.awal_jadwal}</td>
              <td className="py-3 px-4 text-slate-800">{row.akhir_jadwal}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => onEdit(row)}
                  className="text-indigo-600 hover:text-indigo-800 mr-3 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(row.id)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Modal Component
function JadwalModal({ mode, form, dosenOptions, ruanganOptions, saving, onChange, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {mode === "add" ? "Tambah Jadwal" : "Edit Jadwal"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dosen
            </label>
            <select
              value={form.dosen_id}
              onChange={(e) => onChange("dosen_id", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Pilih Dosen --</option>
              {dosenOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama_dosen}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ruangan
            </label>
            <select
              value={form.ruangan_id}
              onChange={(e) => onChange("ruangan_id", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Pilih Ruangan --</option>
              {ruanganOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama_ruangan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Jadwal
            </label>
            <input
              type="text"
              value={form.nama_jadwal}
              onChange={(e) => onChange("nama_jadwal", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. Kelas Malam"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Waktu Mulai
            </label>
            <input
              type="time"
              value={form.awal_jadwal}
              onChange={(e) => onChange("awal_jadwal", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Waktu Selesai
            </label>
            <input
              type="time"
              value={form.akhir_jadwal}
              onChange={(e) => onChange("akhir_jadwal", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : mode === "add" ? "Tambah" : "Perbarui"}
          </button>
        </div>
      </div>
    </div>
  );
}
