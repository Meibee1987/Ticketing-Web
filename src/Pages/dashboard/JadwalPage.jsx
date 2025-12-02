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
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const formattedDate = `${days[currentDate.getDay()]}, ${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <header className="text-center">
      <h1 className="text-2xl font-semibold text-slate-800">Jadwal Perkuliahan</h1>
      <p className="text-sm text-slate-500 mt-1">{formattedDate}</p>
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

      // Try relational select first with all relations
      const jadwalRes = await supabase
        .from("jadwal_perkuliahan")
        .select("*, dosen(*), ruangan(*), Angkatan(*), Mata_Kuliah(*)")
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
        // Fetch mata kuliah with fallback
        let mataKuliahData = null;
        const mkRes1 = await supabase.from("Mata_Kuliah").select("*");
        if (!mkRes1.error && mkRes1.data) {
          mataKuliahData = mkRes1.data;
        } else {
          const mkRes2 = await supabase.from("mata_kuliah").select("*");
          mataKuliahData = mkRes2.data || [];
        }

        const [{ data: dosenData }, { data: ruanganData }, { data: angkatanData }] = await Promise.all([
          supabase.from("dosen").select("id, nama_dosen"),
          supabase.from("ruangan").select("id, nama_ruangan"),
          supabase.from("Angkatan").select("id, nama_angkatan"),
        ]);

        const createMap = (data, key) => Object.fromEntries((data || []).map(item => [item.id, item[key]]));
        const dosenMap = createMap(dosenData, 'nama_dosen');
        const ruanganMap = createMap(ruanganData, 'nama_ruangan');
        const angkatanMap = createMap(angkatanData, 'nama_angkatan');
        const mataKuliahMap = Object.fromEntries((mataKuliahData || []).map(m => [m.id, m.mata_kuliah || m.nama_matkul || m.nama || m.name || String(m.id)]));

        const findKey = (obj, patterns) => {
          const keys = Object.keys(obj);
          for (const p of patterns) {
            const k = keys.find(kk => new RegExp(p, "i").test(kk));
            if (k) return k;
          }
          return null;
        };

        const sample = jadwalData[0] || {};
        const startKey = findKey(sample, ["awal", "mulai", "start", "jam_mulai", "waktu_mulai"]);
        const endKey = findKey(sample, ["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]);

        const merged = jadwalData.map((j) => ({
          ...j,
          nama_dosen: dosenMap[j.dosen_id] || "-",
          nama_ruangan: ruanganMap[j.ruangan_id] || "-",
          nama_angkatan: angkatanMap[j.id_angkatan] || "-",
          nama_matkul: mataKuliahMap[j.id_mata_kuliah] || "-",
          awal_jadwal: j[startKey] || "-",
          akhir_jadwal: j[endKey] || "-",
        }));

        setState({ jadwal: merged, loading: false, error: null });
      } else {
        const rows = jadwalRes.data || [];

        const findKey = (obj, patterns) => Object.keys(obj || {}).find(k => patterns.some(p => new RegExp(p, "i").test(k))) || null;

        const merged = rows.map((r) => ({
          ...r,
          nama_dosen: r.dosen?.nama_dosen ?? r.dosen?.nama ?? r.dosen?.name ?? (r.dosen_id ? String(r.dosen_id) : "-"),
          nama_ruangan: r.ruangan?.nama_ruangan ?? r.ruangan?.nama ?? r.ruangan?.name ?? (r.ruangan_id ? String(r.ruangan_id) : "-"),
          nama_angkatan: r.Angkatan?.nama_angkatan ?? r.Angkatan?.nama ?? (r.id_angkatan ? String(r.id_angkatan) : "-"),
          nama_matkul: r.Mata_Kuliah?.mata_kuliah ?? r.Mata_Kuliah?.nama_matkul ?? r.Mata_Kuliah?.nama ?? (r.id_mata_kuliah ? String(r.id_mata_kuliah) : "-"),
          awal_jadwal: r[findKey(r, ["awal", "mulai", "start", "jam_mulai", "waktu_mulai"])] || "-",
          akhir_jadwal: r[findKey(r, ["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"])] || "-",
          nama_jadwal: r[findKey(r, ["nama_jadwal", "nama", "title", "judul"])] || "-"
        }));

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
    id_angkatan: "",
    id_mata_kuliah: "",
    mulai_jadwal: "",
    akhir_jadwal: "",
  });
  const [dosenOptions, setDosenOptions] = useState([]);
  const [ruanganOptions, setRuanganOptions] = useState([]);
  const [angkatanOptions, setAngkatanOptions] = useState([]);
  const [mataKuliahOptions, setMataKuliahOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    start: "mulai_jadwal",
    end: "akhir_jadwal",
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data: mkData1, error: mkError1 } = await supabase.from("Mata_Kuliah").select("*");
        const mataKuliahData = mkData1 || (await supabase.from("mata_kuliah").select("*")).data;

        const [{ data: dosenData }, { data: ruanganData }, { data: angkatanData }, { data: sampleJadwal }] = await Promise.all([
          supabase.from("dosen").select("id, nama_dosen"),
          supabase.from("ruangan").select("id, nama_ruangan"),
          supabase.from("Angkatan").select("id, nama_angkatan"),
          supabase.from("jadwal_perkuliahan").select("*").limit(1)
        ]);

        setDosenOptions(dosenData || []);
        setRuanganOptions(ruanganData || []);
        setAngkatanOptions(angkatanData || []);
        setMataKuliahOptions(mataKuliahData || []);

        if (sampleJadwal?.length) {
          const keys = Object.keys(sampleJadwal[0]);
          const findKey = (patterns) => keys.find(k => patterns.some(p => new RegExp(p, "i").test(k))) || patterns[0];
          setColumnMapping({
            start: findKey(["mulai", "awal", "start", "jam_mulai", "waktu_mulai"]) || "mulai_jadwal",
            end: findKey(["akhir", "selesai", "end", "jam_selesai", "waktu_selesai"]) || "akhir_jadwal"
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
      id_angkatan: "",
      id_mata_kuliah: "",
      mulai_jadwal: "",
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
      id_angkatan: row.id_angkatan || "",
      id_mata_kuliah: row.id_mata_kuliah || "",
      mulai_jadwal: row.mulai_jadwal || row.awal_jadwal || "",
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
      id_angkatan: "",
      id_mata_kuliah: "",
      mulai_jadwal: "",
      akhir_jadwal: "",
    });
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const checkConflict = async () => {
    if (!form.mulai_jadwal || !form.akhir_jadwal) return "• Waktu mulai dan selesai harus diisi";

    const toSec = (t) => t ? t.split(":").reduce((acc, val, i) => acc + (parseInt(val) || 0) * [3600, 60, 1][i], 0) : 0;
    if (toSec(form.mulai_jadwal) >= toSec(form.akhir_jadwal)) return "• Waktu mulai harus lebih awal dari waktu selesai";

    try {
      const { data: allJadwal } = await supabase.from("jadwal_perkuliahan").select("*").neq("id", form.id || 0);
      if (!allJadwal?.length) return null;

      const normalizeTime = (time) => time && time.length === 5 ? time + ":00" : time;
      const formStart = normalizeTime(form.mulai_jadwal);
      const formEnd = normalizeTime(form.akhir_jadwal);
      const conflicts = [];
      const { start: startKey, end: endKey } = columnMapping;

      for (const j of allJadwal) {
        const existingStart = normalizeTime(j[startKey]);
        const existingEnd = normalizeTime(j[endKey]);

        if (!existingStart || !existingEnd) continue;

        const isTimeOverlap = formStart < existingEnd && formEnd > existingStart;
        if (!isTimeOverlap) continue;

        if (form.ruangan_id && String(j.ruangan_id) === String(form.ruangan_id)) {
          const ruangan = ruanganOptions.find(r => String(r.id) === String(form.ruangan_id));
          conflicts.push(`• Ruangan "${ruangan?.nama_ruangan || form.ruangan_id}" sudah dipakai jam ${existingStart.slice(0,5)} - ${existingEnd.slice(0,5)}`);
        }

        if (form.dosen_id && String(j.dosen_id) === String(form.dosen_id)) {
          const dosen = dosenOptions.find(d => String(d.id) === String(form.dosen_id));
          conflicts.push(`• Dosen "${dosen?.nama_dosen || form.dosen_id}" sudah mengajar jam ${existingStart.slice(0,5)} - ${existingEnd.slice(0,5)}`);
        }
      }

      return conflicts.length ? conflicts.join('\n') : null;
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
        id_angkatan: form.id_angkatan || null,
        id_mata_kuliah: form.id_mata_kuliah || null,
        [columnMapping.start]: form.mulai_jadwal || null,
        [columnMapping.end]: form.akhir_jadwal || null
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

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === jadwal.length ? [] : jadwal.map(r => r.id));

  const handleEditSelected = () => {
    if (selectedIds.length !== 1) return alert("Pilih tepat 1 jadwal untuk diedit");
    const row = jadwal.find(r => r.id === selectedIds[0]);
    if (row) openEditModal(row);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert("Pilih minimal 1 jadwal untuk dihapus");
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
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Tambah Jadwal
        </button>
      </div>

      <TableContent
        jadwal={jadwal}
        loading={loading}
        error={error}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <JadwalModal
          mode={modalMode}
          form={form}
          dosenOptions={dosenOptions}
          ruanganOptions={ruanganOptions}
          angkatanOptions={angkatanOptions}
          mataKuliahOptions={mataKuliahOptions}
          saving={saving}
          onChange={handleChange}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      <p className="text-sm text-slate-500 mt-2">Memuat jadwal...</p>
    </div>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-sm text-red-600">⚠️ {message}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-12">
    <div className="text-slate-400 mb-2">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </div>
    <p className="text-sm text-slate-500">Belum ada data jadwal perkuliahan.</p>
  </div>
);

function TableContent({ jadwal, loading, error, onEdit, onDelete }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (jadwal.length === 0) return <EmptyState />;
  return <DataTable data={jadwal} onEdit={onEdit} onDelete={onDelete} />;
}

function DataTable({ data, onEdit, onDelete }) {
  const formatTime = (time) => !time || time === "-" ? "-" : time.length === 8 ? time.slice(0, 5) : time;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            {["Angkatan", "Waktu", "Agenda", "Tempat", "Aksi"].map((label, i) => (
              <th key={i} className={`py-3 px-4 font-semibold ${i === 4 ? "text-center" : "text-left"} border border-slate-300`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
              <td className="py-3 px-4 text-slate-800 font-semibold border border-slate-200">
                {row.nama_angkatan || "-"}
              </td>
              <td className="py-3 px-4 text-slate-800 font-medium border border-slate-200">
                {formatTime(row.awal_jadwal)} - {formatTime(row.akhir_jadwal)}
              </td>
              <td className="py-3 px-4 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1">{row.nama_matkul || "-"}</div>
                <div className="text-xs text-slate-600">{row.nama_dosen || "-"}</div>
              </td>
              <td className="py-3 px-4 text-slate-800 border border-slate-200">
                {row.nama_ruangan || "-"}
              </td>
              <td className="py-3 px-4 border border-slate-200 text-center">
                <button
                  onClick={() => onEdit(row)}
                  className="text-indigo-600 hover:text-indigo-800 mr-3 font-medium text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(row.id)}
                  className="text-red-600 hover:text-red-800 font-medium text-xs"
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
function JadwalModal({ mode, form, dosenOptions, ruanganOptions, angkatanOptions, mataKuliahOptions, saving, onChange, onSave, onClose }) {
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

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { label: "Angkatan", key: "id_angkatan", options: angkatanOptions, display: "nama_angkatan" },
            { label: "Mata Kuliah", key: "id_mata_kuliah", options: mataKuliahOptions, display: (m) => m.mata_kuliah || m.nama_matkul || m.nama || m.name || `Mata Kuliah ${m.id}` },
            { label: "Dosen", key: "dosen_id", options: dosenOptions, display: "nama_dosen" },
            { label: "Ruangan", key: "ruangan_id", options: ruanganOptions, display: "nama_ruangan" }
          ].map(({ label, key, options, display }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <select
                value={form[key]}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Pilih {label} --</option>
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {typeof display === "function" ? display(item) : item[display]}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {[
            { label: "Waktu Mulai", key: "mulai_jadwal" },
            { label: "Waktu Selesai", key: "akhir_jadwal" }
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                type="time"
                value={form[key]}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          ))}
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
