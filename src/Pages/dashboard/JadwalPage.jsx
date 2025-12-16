/**
 * ================================================================================
 * FILE: JadwalPage.jsx
 * DESKRIPSI: Halaman manajemen jadwal dengan 3 tab (Perkuliahan, Karya Akhir, Lain-lain)
 * ================================================================================
 * 
 * STRUKTUR DATABASE (semua kolom waktu bertipe TIMESTAMP):
 * 1. jadwal_perkuliahan: dosen_id, ruangan_id, id_angkatan, id_mata_kuliah, mulai_jadwal(timestamp), akhir_jadwal(timestamp)
 * 2. jadwal_karya_akhir: nama_ruangan(FK), nama_angkatan(FK), agenda_jadwal_karya_akhir(FK), mulai_jadwal(timestamp), akhir_jadwal(timestamp)
 * 3. jadwal_lain_lain: nama_ruangan(FK), nama_user(text), agenda(text), mulai_jadwal(timestamp), akhir_jadwal(timestamp)
 * ================================================================================
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";

// ================================================================================
// HELPER FUNCTIONS & CONSTANTS
// ================================================================================

const INITIAL_STATE = { jadwal: [], loading: true, error: null };

// Helper untuk format timestamp ke tampilan "DD MMM YYYY, HH:MM"
const formatTimestamp = (ts) => {
  if (!ts || ts === "-") return "-";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return "-"; }
};

// Helper untuk format timestamp singkat (untuk alert/conflict)
const formatTimestampShort = (ts) => {
  if (!ts || ts === "-") return "-";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return "-"; }
};

// Helper untuk format timestamp ke input datetime-local (YYYY-MM-DDTHH:MM)
const toDatetimeLocal = (ts) => {
  if (!ts || ts === "-") return "";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  } catch { return ""; }
};

// Helper untuk compare timestamp
const compareTimestamp = (ts1, ts2) => {
  const d1 = new Date(ts1), d2 = new Date(ts2);
  return d1.getTime() - d2.getTime();
};

const createMap = (data, key) => Object.fromEntries((data || []).map(item => [item.id, item[key]]));

// ================================================================================
// FUNGSI CEK KONFLIK RUANGAN (CROSS-TABLE)
// Cek konflik ruangan di SEMUA tabel jadwal (perkuliahan, karya_akhir, lain_lain)
// ================================================================================
const checkRuanganConflict = async ({ mulai, akhir, ruanganId, excludeId, excludeTable, ruanganMap }) => {
  if (!mulai || !akhir) return "• Waktu mulai dan selesai harus diisi";
  
  const formStart = new Date(mulai), formEnd = new Date(akhir);
  if (formStart >= formEnd) return "• Waktu mulai harus lebih awal dari waktu selesai";
  if (!ruanganId) return null; // Tidak ada ruangan yang dipilih, skip conflict check

  const conflicts = [];
  const namaRuangan = ruanganMap?.[ruanganId] || `Ruangan ${ruanganId}`;

  // Helper untuk cek overlap waktu
  const isOverlap = (start, end) => {
    if (!start || !end) return false;
    return formStart < new Date(end) && formEnd > new Date(start);
  };

  // 1. CEK DI JADWAL PERKULIAHAN
  const { data: jadwalPerkuliahan } = await supabase.from("jadwal_perkuliahan").select("id, ruangan_id, mulai_jadwal, akhir_jadwal");
  for (const j of (jadwalPerkuliahan || [])) {
    if (excludeTable === "jadwal_perkuliahan" && j.id === excludeId) continue;
    if (String(j.ruangan_id) === String(ruanganId) && isOverlap(j.mulai_jadwal, j.akhir_jadwal)) {
      conflicts.push(`• [Perkuliahan] Ruangan "${namaRuangan}" sudah dipakai ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`);
    }
  }

  // 2. CEK DI JADWAL KARYA AKHIR
  const { data: jadwalKaryaAkhir } = await supabase.from("jadwal_karya_akhir").select("id, nama_ruangan, mulai_jadwal, akhir_jadwal");
  for (const j of (jadwalKaryaAkhir || [])) {
    if (excludeTable === "jadwal_karya_akhir" && j.id === excludeId) continue;
    if (String(j.nama_ruangan) === String(ruanganId) && isOverlap(j.mulai_jadwal, j.akhir_jadwal)) {
      conflicts.push(`• [Karya Akhir] Ruangan "${namaRuangan}" sudah dipakai ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`);
    }
  }

  // 3. CEK DI JADWAL LAIN-LAIN
  const { data: jadwalLainLain } = await supabase.from("jadwal_lain_lain").select("id, nama_ruangan, mulai_jadwal, akhir_jadwal");
  for (const j of (jadwalLainLain || [])) {
    if (excludeTable === "jadwal_lain_lain" && j.id === excludeId) continue;
    if (String(j.nama_ruangan) === String(ruanganId) && isOverlap(j.mulai_jadwal, j.akhir_jadwal)) {
      conflicts.push(`• [Lain-lain] Ruangan "${namaRuangan}" sudah dipakai ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`);
    }
  }

  return conflicts.length ? conflicts.join('\n') : null;
};

// ================================================================================
// KOMPONEN UTAMA: JadwalPage
// ================================================================================
export default function JadwalPage() {
  const [activeTab, setActiveTab] = useState("perkuliahan");
  const tabs = [
    { id: "perkuliahan", label: "Jadwal Perkuliahan", icon: "📚" },
    { id: "karya_akhir", label: "Jadwal Karya Akhir", icon: "🎓" },
    { id: "lain_lain", label: "Jadwal Lain-lain", icon: "📋" },
  ];

  const tabTitles = { perkuliahan: "Jadwal Perkuliahan", karya_akhir: "Jadwal Karya Akhir", lain_lain: "Jadwal Lain-lain" };
  const TabComponent = { perkuliahan: JadwalTable, karya_akhir: JadwalKaryaAkhirTable, lain_lain: JadwalLainLainTable }[activeTab];

  return (
    <div className="space-y-6">
      <PageHeader title={tabTitles[activeTab] || "Jadwal"} />
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">{TabComponent && <TabComponent />}</div>
      </div>
    </div>
  );
}

// ================================================================================
// KOMPONEN: PageHeader (tanpa tanggal)
// ================================================================================
function PageHeader({ title }) {
  return (
    <header className="text-center">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
    </header>
  );
}

// ================================================================================
// KOMPONEN UI SHARED
// ================================================================================
const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent" />
      <p className="text-sm text-slate-500 mt-2">Memuat jadwal...</p>
    </div>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-sm text-red-600">⚠️ {message}</p>
  </div>
);

const EmptyState = ({ text = "Belum ada data jadwal." }) => (
  <div className="text-center py-12">
    <svg className="mx-auto h-12 w-12 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

// Reusable Table Wrapper
function TableWrapper({ title, onAdd, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Tambah Jadwal
        </button>
      </div>
      {children}
    </div>
  );
}

// Reusable Data Table
function GenericDataTable({ data, columns, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            {columns.map((col, i) => (
              <th key={i} className={`py-3 px-4 font-semibold ${col.center ? "text-center" : "text-left"} border border-slate-300`}>{col.label}</th>
            ))}
            <th className="py-3 px-4 font-semibold text-center border border-slate-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
              {columns.map((col, i) => (
                <td key={i} className="py-3 px-4 border border-slate-200">
                  {col.render ? col.render(row) : row[col.key] || "-"}
                </td>
              ))}
              <td className="py-3 px-4 border border-slate-200 text-center">
                <button onClick={() => onEdit(row)} className="text-indigo-600 hover:text-indigo-800 mr-3 font-medium text-xs">Edit</button>
                <button onClick={() => onDelete(row.id)} className="text-red-600 hover:text-red-800 font-medium text-xs">Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Reusable Modal Component
function Modal({ title, saving, onSave, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Form Fields
const SelectField = ({ label, value, onChange, options, displayKey, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
      <option value="">{placeholder || `-- Pilih ${label} --`}</option>
      {options.map((item) => <option key={item.id} value={item.id}>{typeof displayKey === "function" ? displayKey(item) : item[displayKey]}</option>)}
    </select>
  </div>
);

const InputField = ({ label, value, onChange, type = "text", placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
  </div>
);

const TimeFields = ({ form, onChange }) => (
  <>
    <InputField label="Waktu Mulai" type="datetime-local" value={form.mulai_jadwal} onChange={(v) => onChange("mulai_jadwal", v)} />
    <InputField label="Waktu Selesai" type="datetime-local" value={form.akhir_jadwal} onChange={(v) => onChange("akhir_jadwal", v)} />
  </>
);

// ================================================================================
// SECTION: JADWAL PERKULIAHAN
// ================================================================================
function useJadwal() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase.from("jadwal_perkuliahan").select("*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)").order("id");
      
      if (error) throw error;
      
      const merged = (data || []).map((r) => ({
        ...r,
        nama_dosen: r.dosen?.nama_dosen || "-",
        nama_ruangan: r.ruangan?.nama_ruangan || "-",
        nama_angkatan: r.angkatan?.nama_angkatan || "-",
        nama_matkul: r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || "-",
        mulai_jadwal: r.mulai_jadwal || "-",
        akhir_jadwal: r.akhir_jadwal || "-",
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error("Error fetching jadwal:", err);
      setState({ jadwal: [], loading: false, error: err.message || "Gagal mengambil data" });
    }
  }, []);

  useEffect(() => { fetchJadwal(); }, [fetchJadwal]);
  return { ...state, refetch: fetchJadwal };
}

function JadwalTable() {
  const { jadwal, loading, error, refetch } = useJadwal();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState({ id: null, dosen_id: "", ruangan_id: "", id_angkatan: "", id_mata_kuliah: "", mulai_jadwal: "", akhir_jadwal: "" });
  const [options, setOptions] = useState({ dosen: [], ruangan: [], angkatan: [], mataKuliah: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const [{ data: dosen }, { data: ruangan }, { data: angkatan }, { data: mataKuliah }] = await Promise.all([
        supabase.from("dosen").select("id, nama_dosen"),
        supabase.from("ruangan").select("id, nama_ruangan"),
        supabase.from("angkatan").select("id, nama_angkatan"),
        supabase.from("mata_kuliah").select("*")
      ]);
      setOptions({ dosen: dosen || [], ruangan: ruangan || [], angkatan: angkatan || [], mataKuliah: mataKuliah || [] });
    };
    fetchOptions();
  }, []);

  const resetForm = () => setForm({ id: null, dosen_id: "", ruangan_id: "", id_angkatan: "", id_mata_kuliah: "", mulai_jadwal: "", akhir_jadwal: "" });
  const openAdd = () => { setModalMode("add"); resetForm(); setModalOpen(true); };
  const openEdit = (row) => { setModalMode("edit"); setForm({ id: row.id, dosen_id: row.dosen_id || "", ruangan_id: row.ruangan_id || "", id_angkatan: row.id_angkatan || "", id_mata_kuliah: row.id_mata_kuliah || "", mulai_jadwal: toDatetimeLocal(row.mulai_jadwal), akhir_jadwal: toDatetimeLocal(row.akhir_jadwal) }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); resetForm(); };
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const checkConflict = async () => {
    const ruanganMap = Object.fromEntries(options.ruangan.map(r => [r.id, r.nama_ruangan]));
    
    // 1. Cek konflik RUANGAN di semua tabel jadwal
    const ruanganConflict = await checkRuanganConflict({
      mulai: form.mulai_jadwal,
      akhir: form.akhir_jadwal,
      ruanganId: form.ruangan_id,
      excludeId: form.id,
      excludeTable: "jadwal_perkuliahan",
      ruanganMap
    });
    if (ruanganConflict?.startsWith("•")) return ruanganConflict; // Error validasi waktu

    // 2. Cek konflik DOSEN (hanya di jadwal_perkuliahan)
    const dosenConflicts = [];
    if (form.dosen_id) {
      const { data: jadwalDosen } = await supabase.from("jadwal_perkuliahan").select("*").eq("dosen_id", form.dosen_id).neq("id", form.id || 0);
      const formStart = new Date(form.mulai_jadwal), formEnd = new Date(form.akhir_jadwal);
      
      for (const j of (jadwalDosen || [])) {
        if (!j.mulai_jadwal || !j.akhir_jadwal) continue;
        const isOverlap = formStart < new Date(j.akhir_jadwal) && formEnd > new Date(j.mulai_jadwal);
        if (isOverlap) {
          const d = options.dosen.find(x => String(x.id) === String(form.dosen_id));
          dosenConflicts.push(`• [Perkuliahan] Dosen "${d?.nama_dosen || form.dosen_id}" sudah mengajar ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`);
        }
      }
    }

    // Gabungkan semua konflik
    const allConflicts = [...(ruanganConflict ? [ruanganConflict] : []), ...dosenConflicts];
    return allConflicts.length ? allConflicts.join('\n') : null;
  };

  const handleSave = async () => {
    setSaving(true);
    const conflict = await checkConflict();
    if (conflict) { alert(`⚠️ Bentrok!\n\n${conflict}`); setSaving(false); return; }

    const payload = { dosen_id: form.dosen_id || null, ruangan_id: form.ruangan_id || null, id_angkatan: form.id_angkatan || null, id_mata_kuliah: form.id_mata_kuliah || null, mulai_jadwal: form.mulai_jadwal || null, akhir_jadwal: form.akhir_jadwal || null };
    const { error } = modalMode === "add" 
      ? await supabase.from("jadwal_perkuliahan").insert(payload)
      : await supabase.from("jadwal_perkuliahan").update(payload).eq("id", form.id);
    
    setSaving(false);
    if (error) { alert("Gagal menyimpan: " + error.message); return; }
    closeModal(); refetch();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("jadwal_perkuliahan").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    else refetch();
  };

  const columns = [
    { label: "Angkatan", render: (r) => <span className="font-semibold text-slate-800">{r.nama_angkatan}</span> },
    { label: "Mulai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.mulai_jadwal)}</span> },
    { label: "Selesai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.akhir_jadwal)}</span> },
    { label: "Agenda", render: (r) => <><div className="font-semibold text-slate-900">{r.nama_matkul}</div><div className="text-xs text-slate-600">{r.nama_dosen}</div></> },
    { label: "Tempat", render: (r) => <span className="text-slate-800">{r.nama_ruangan}</span> },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Perkuliahan" onAdd={openAdd}>
      {jadwal.length === 0 ? <EmptyState text="Belum ada data jadwal perkuliahan." /> : <GenericDataTable data={jadwal} columns={columns} onEdit={openEdit} onDelete={handleDelete} />}
      {modalOpen && (
        <Modal title={modalMode === "add" ? "Tambah Jadwal" : "Edit Jadwal"} saving={saving} onSave={handleSave} onClose={closeModal}>
          <SelectField label="Angkatan" value={form.id_angkatan} onChange={(v) => handleChange("id_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" />
          <SelectField label="Mata Kuliah" value={form.id_mata_kuliah} onChange={(v) => handleChange("id_mata_kuliah", v)} options={options.mataKuliah} displayKey={(m) => m.mata_kuliah || m.nama_matkul || m.nama || `MK ${m.id}`} />
          <SelectField label="Dosen" value={form.dosen_id} onChange={(v) => handleChange("dosen_id", v)} options={options.dosen} displayKey="nama_dosen" />
          <SelectField label="Ruangan" value={form.ruangan_id} onChange={(v) => handleChange("ruangan_id", v)} options={options.ruangan} displayKey="nama_ruangan" />
          <TimeFields form={form} onChange={handleChange} />
        </Modal>
      )}
    </TableWrapper>
  );
}

// ================================================================================
// SECTION: JADWAL KARYA AKHIR
// ================================================================================
function useJadwalKaryaAkhir() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data: jadwalData, error } = await supabase.from("jadwal_karya_akhir").select("*").order("id");
      if (error) throw error;

      const [{ data: ruangan }, { data: angkatan }, { data: agenda }] = await Promise.all([
        supabase.from("ruangan").select("id, nama_ruangan"),
        supabase.from("angkatan").select("id, nama_angkatan"),
        supabase.from("agenda_karya_akhir").select("id, agenda_karya_akhir")
      ]);

      const ruanganMap = createMap(ruangan, 'nama_ruangan');
      const angkatanMap = createMap(angkatan, 'nama_angkatan');
      const agendaMap = createMap(agenda, 'agenda_karya_akhir');

      const merged = (jadwalData || []).map((j) => ({
        ...j,
        display_ruangan: ruanganMap[j.nama_ruangan] || "-",
        display_angkatan: angkatanMap[j.nama_angkatan] || "-",
        display_agenda: agendaMap[j.agenda_jadwal_karya_akhir] || "-",
        mulai_jadwal: j.mulai_jadwal || "-",
        akhir_jadwal: j.akhir_jadwal || "-",
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error("Error fetching jadwal karya akhir:", err);
      setState({ jadwal: [], loading: false, error: err.message || "Gagal mengambil data" });
    }
  }, []);

  useEffect(() => { fetchJadwal(); }, [fetchJadwal]);
  return { ...state, refetch: fetchJadwal };
}

function JadwalKaryaAkhirTable() {
  const { jadwal, loading, error, refetch } = useJadwalKaryaAkhir();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState({ id: null, nama_ruangan: "", nama_angkatan: "", mulai_jadwal: "", akhir_jadwal: "", agenda_jadwal_karya_akhir: "" });
  const [options, setOptions] = useState({ ruangan: [], angkatan: [], agenda: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const [{ data: ruangan }, { data: angkatan }, { data: agenda }] = await Promise.all([
        supabase.from("ruangan").select("id, nama_ruangan"),
        supabase.from("angkatan").select("id, nama_angkatan"),
        supabase.from("agenda_karya_akhir").select("id, agenda_karya_akhir")
      ]);
      setOptions({ ruangan: ruangan || [], angkatan: angkatan || [], agenda: agenda || [] });
    };
    fetchOptions();
  }, []);

  const resetForm = () => setForm({ id: null, nama_ruangan: "", nama_angkatan: "", mulai_jadwal: "", akhir_jadwal: "", agenda_jadwal_karya_akhir: "" });
  const openAdd = () => { setModalMode("add"); resetForm(); setModalOpen(true); };
  const openEdit = (row) => { setModalMode("edit"); setForm({ id: row.id, nama_ruangan: row.nama_ruangan || "", nama_angkatan: row.nama_angkatan || "", mulai_jadwal: toDatetimeLocal(row.mulai_jadwal), akhir_jadwal: toDatetimeLocal(row.akhir_jadwal), agenda_jadwal_karya_akhir: row.agenda_jadwal_karya_akhir || "" }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); resetForm(); };
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Cek konflik RUANGAN di semua tabel jadwal (cross-table)
  const checkConflict = async () => {
    const ruanganMap = Object.fromEntries(options.ruangan.map(r => [r.id, r.nama_ruangan]));
    
    return await checkRuanganConflict({
      mulai: form.mulai_jadwal,
      akhir: form.akhir_jadwal,
      ruanganId: form.nama_ruangan,
      excludeId: form.id,
      excludeTable: "jadwal_karya_akhir",
      ruanganMap
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const conflict = await checkConflict();
    if (conflict) { alert(`⚠️ Bentrok!\n\n${conflict}`); setSaving(false); return; }

    const payload = { nama_ruangan: form.nama_ruangan || null, nama_angkatan: form.nama_angkatan || null, mulai_jadwal: form.mulai_jadwal || null, akhir_jadwal: form.akhir_jadwal || null, agenda_jadwal_karya_akhir: form.agenda_jadwal_karya_akhir || null };
    const { error } = modalMode === "add"
      ? await supabase.from("jadwal_karya_akhir").insert(payload)
      : await supabase.from("jadwal_karya_akhir").update(payload).eq("id", form.id);

    setSaving(false);
    if (error) { alert("Gagal menyimpan: " + error.message); return; }
    closeModal(); refetch();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("jadwal_karya_akhir").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    else refetch();
  };

  const columns = [
    { label: "Angkatan", render: (r) => <span className="font-semibold text-slate-800">{r.display_angkatan}</span> },
    { label: "Mulai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.mulai_jadwal)}</span> },
    { label: "Selesai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.akhir_jadwal)}</span> },
    { label: "Agenda", render: (r) => <div className="font-semibold text-slate-900">{r.display_agenda}</div> },
    { label: "Ruangan", render: (r) => <span className="text-slate-800">{r.display_ruangan}</span> },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Karya Akhir" onAdd={openAdd}>
      {jadwal.length === 0 ? <EmptyState text="Belum ada data jadwal karya akhir." /> : <GenericDataTable data={jadwal} columns={columns} onEdit={openEdit} onDelete={handleDelete} />}
      {modalOpen && (
        <Modal title={modalMode === "add" ? "Tambah Jadwal Karya Akhir" : "Edit Jadwal Karya Akhir"} saving={saving} onSave={handleSave} onClose={closeModal}>
          <SelectField label="Angkatan" value={form.nama_angkatan} onChange={(v) => handleChange("nama_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" />
          <SelectField label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={options.ruangan} displayKey="nama_ruangan" />
          <SelectField label="Agenda" value={form.agenda_jadwal_karya_akhir} onChange={(v) => handleChange("agenda_jadwal_karya_akhir", v)} options={options.agenda} displayKey="agenda_karya_akhir" />
          <TimeFields form={form} onChange={handleChange} />
        </Modal>
      )}
    </TableWrapper>
  );
}

// ================================================================================
// SECTION: JADWAL LAIN-LAIN
// ================================================================================
function useJadwalLainLain() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data: jadwalData, error } = await supabase.from("jadwal_lain_lain").select("*").order("id");
      if (error) throw error;

      const { data: ruangan } = await supabase.from("ruangan").select("id, nama_ruangan");
      const ruanganMap = createMap(ruangan, 'nama_ruangan');

      const merged = (jadwalData || []).map((j) => ({
        ...j,
        ruangan_display: ruanganMap[j.nama_ruangan] || "-",
        user_display: j.nama_user || "-",
        mulai_jadwal: j.mulai_jadwal || "-",
        akhir_jadwal: j.akhir_jadwal || "-",
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error("Error fetching jadwal lain-lain:", err);
      setState({ jadwal: [], loading: false, error: err.message || "Gagal mengambil data" });
    }
  }, []);

  useEffect(() => { fetchJadwal(); }, [fetchJadwal]);
  return { ...state, refetch: fetchJadwal };
}

function JadwalLainLainTable() {
  const { jadwal, loading, error, refetch } = useJadwalLainLain();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState({ id: null, nama_ruangan: "", nama_user: "", mulai_jadwal: "", akhir_jadwal: "", agenda: "" });
  const [ruanganOptions, setRuanganOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ruangan").select("id, nama_ruangan").then(({ data }) => setRuanganOptions(data || []));
  }, []);

  const resetForm = () => setForm({ id: null, nama_ruangan: "", nama_user: "", mulai_jadwal: "", akhir_jadwal: "", agenda: "" });
  const openAdd = () => { setModalMode("add"); resetForm(); setModalOpen(true); };
  const openEdit = (row) => { setModalMode("edit"); setForm({ id: row.id, nama_ruangan: row.nama_ruangan || "", nama_user: row.nama_user || "", mulai_jadwal: toDatetimeLocal(row.mulai_jadwal), akhir_jadwal: toDatetimeLocal(row.akhir_jadwal), agenda: row.agenda || "" }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); resetForm(); };
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Cek konflik RUANGAN di semua tabel jadwal (cross-table)
  const checkConflict = async () => {
    const ruanganMap = Object.fromEntries(ruanganOptions.map(r => [r.id, r.nama_ruangan]));
    
    return await checkRuanganConflict({
      mulai: form.mulai_jadwal,
      akhir: form.akhir_jadwal,
      ruanganId: form.nama_ruangan,
      excludeId: form.id,
      excludeTable: "jadwal_lain_lain",
      ruanganMap
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const conflict = await checkConflict();
    if (conflict) { alert(`⚠️ Bentrok!\n\n${conflict}`); setSaving(false); return; }

    const payload = { nama_ruangan: form.nama_ruangan ? parseInt(form.nama_ruangan) : null, nama_user: form.nama_user || null, mulai_jadwal: form.mulai_jadwal || null, akhir_jadwal: form.akhir_jadwal || null, agenda: form.agenda || null };
    const { error } = modalMode === "add"
      ? await supabase.from("jadwal_lain_lain").insert(payload)
      : await supabase.from("jadwal_lain_lain").update(payload).eq("id", form.id);

    setSaving(false);
    if (error) { alert("Gagal menyimpan: " + error.message); return; }
    closeModal(); refetch();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("jadwal_lain_lain").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    else refetch();
  };

  const columns = [
    { label: "Nama User", render: (r) => <span className="font-semibold text-slate-800">{r.user_display}</span> },
    { label: "Mulai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.mulai_jadwal)}</span> },
    { label: "Selesai", render: (r) => <span className="font-medium text-slate-800 text-xs">{formatTimestamp(r.akhir_jadwal)}</span> },
    { label: "Agenda", render: (r) => <div className="font-semibold text-slate-900">{r.agenda || "-"}</div> },
    { label: "Tempat", render: (r) => <span className="text-slate-800">{r.ruangan_display}</span> },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Lain-lain" onAdd={openAdd}>
      {jadwal.length === 0 ? <EmptyState text="Belum ada data jadwal lain-lain." /> : <GenericDataTable data={jadwal} columns={columns} onEdit={openEdit} onDelete={handleDelete} />}
      {modalOpen && (
        <Modal title={modalMode === "add" ? "Tambah Jadwal Lain-lain" : "Edit Jadwal Lain-lain"} saving={saving} onSave={handleSave} onClose={closeModal}>
          <InputField label="Nama User" value={form.nama_user} onChange={(v) => handleChange("nama_user", v)} placeholder="Masukkan nama user" />
          <SelectField label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={ruanganOptions} displayKey="nama_ruangan" />
          <InputField label="Agenda" value={form.agenda} onChange={(v) => handleChange("agenda", v)} placeholder="Masukkan agenda" />
          <TimeFields form={form} onChange={handleChange} />
        </Modal>
      )}
    </TableWrapper>
  );
}
