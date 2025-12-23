/**
 * ================================================================================
 * FILE: JadwalPageAdmin.jsx
 * DESKRIPSI: Halaman manajemen jadwal dengan 3 tab terpisah dan filter tanggal
 * ================================================================================
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
// 🎯 Import komponen reusable dari folder components/
import SearchBar from "../../components/SearchBar";
import ActionButtons from "../../components/ActionButtons";
import Pagination from "../../components/Pagination";
import SearchableSelect from "../../components/SearchableSelect";

// ================================================================================
// HELPER FUNCTIONS & CONSTANTS
// ================================================================================

const ITEMS_PER_PAGE = 10;

// Helper untuk format timestamp ke tampilan lengkap "Hari, DD Bulan YYYY, HH:MM"
const formatTimestamp = (ts) => {
  if (!ts || ts === "-") return "-";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "-";
    const hari = date.toLocaleDateString('id-ID', { weekday: 'long' });
    const tanggal = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const waktu = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${hari}, ${tanggal}, ${waktu}`;
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

const createMap = (data, key) => Object.fromEntries((data || []).map(item => [item.id, item[key]]));

// Helper untuk format input date (YYYY-MM-DD)
const formatDateInput = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper untuk format tanggal display (Indonesia)
const formatDate = (date) => {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

// Helper untuk compare tanggal (tanpa waktu)
const isSameDate = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// Badge untuk jenis jadwal
const JenisBadge = ({ jenis }) => {
  const styles = {
    perkuliahan: "bg-blue-100 text-blue-800 border-blue-200",
    karya_akhir: "bg-purple-100 text-purple-800 border-purple-200",
    lain_lain: "bg-green-100 text-green-800 border-green-200",
  };
  const labels = {
    perkuliahan: "📚 Perkuliahan",
    karya_akhir: "🎓 Karya Akhir",
    lain_lain: "📋 Lain-lain",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[jenis] || "bg-gray-100 text-gray-800"}`}>
      {labels[jenis] || jenis}
    </span>
  );
};

// Cek konflik ruangan via view_jadwal_union
const JENIS_MAP = { jadwal_perkuliahan: "PERKULIAHAN", jadwal_karya_akhir: "KARYA_AKHIR", jadwal_lain_lain: "LAIN_LAIN" };
const JENIS_LABEL = { PERKULIAHAN: "Perkuliahan", KARYA_AKHIR: "Karya Akhir", LAIN_LAIN: "Lain-lain" };

const checkRuanganConflict = async ({ mulai, akhir, ruanganId, excludeId, excludeTable, ruanganMap }) => {
  if (!mulai || !akhir) return "• Waktu mulai dan selesai harus diisi";
  const [formStart, formEnd] = [new Date(mulai), new Date(akhir)];
  if (formStart >= formEnd) return "• Waktu mulai harus lebih awal dari waktu selesai";
  if (!ruanganId) return null;

  const { data, error } = await supabase
    .from("view_jadwal_union")
    .select("jenis_jadwal, id_asli, mulai_jadwal, akhir_jadwal")
    .eq("ruangan_id", ruanganId);

  if (error) return console.error("Error checking conflict:", error), null;

  const namaRuangan = ruanganMap?.[ruanganId] || `Ruangan ${ruanganId}`;
  const excludeJenis = JENIS_MAP[excludeTable];

  const conflicts = (data || []).filter(j => {
    if (j.jenis_jadwal === excludeJenis && j.id_asli === excludeId) return false;
    const [s, e] = [new Date(j.mulai_jadwal), new Date(j.akhir_jadwal)];
    return j.mulai_jadwal && j.akhir_jadwal && formStart < e && formEnd > s;
  }).map(j => `• [${JENIS_LABEL[j.jenis_jadwal]}] "${namaRuangan}" dipakai ${formatTimestampShort(j.mulai_jadwal)} - ${formatTimestampShort(j.akhir_jadwal)}`);

  return conflicts.length ? conflicts.join('\n') : null;
};

// ================================================================================
// KOMPONEN UTAMA: JadwalPageAdmin
// ================================================================================
export default function JadwalPageAdmin() {
  // Data states
  const [jadwalPerkuliahan, setJadwalPerkuliahan] = useState([]);
  const [jadwalKaryaAkhir, setJadwalKaryaAkhir] = useState([]);
  const [jadwalLainLain, setJadwalLainLain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("perkuliahan");
  
  // Options for forms
  const [options, setOptions] = useState({
    dosen: [], ruangan: [], angkatan: [], mataKuliah: [], agenda: []
  });
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [modalType, setModalType] = useState("perkuliahan");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Download states
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadJenisTab, setDownloadJenisTab] = useState(null); // untuk menyimpan jenis tab yang akan didownload
  const [downloadType, setDownloadType] = useState("all"); // Default: all (bukan date)
  const [downloadStartDate, setDownloadStartDate] = useState("");
  const [downloadEndDate, setDownloadEndDate] = useState("");
  const [downloadMonth, setDownloadMonth] = useState("");

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch options - hanya yang aktif (aktif_nonaktif = true)
      const [dosenRes, ruanganRes, angkatanRes, mataKuliahRes, agendaRes] = await Promise.all([
        supabase.from("dosen").select("id, nama_dosen, aktif_nonaktif").eq("aktif_nonaktif", true),
        supabase.from("ruangan").select("id, nama_ruangan, aktif_nonaktif").eq("aktif_nonaktif", true),
        supabase.from("angkatan").select("id, nama_angkatan, aktif_nonaktif").eq("aktif_nonaktif", true),
        supabase.from("mata_kuliah").select("*, aktif_nonaktif").eq("aktif_nonaktif", true),
        supabase.from("agenda_karya_akhir").select("id, agenda_karya_akhir")
      ]);

      setOptions({
        dosen: dosenRes.data || [],
        ruangan: ruanganRes.data || [],
        angkatan: angkatanRes.data || [],
        mataKuliah: mataKuliahRes.data || [],
        agenda: agendaRes.data || []
      });

      const ruanganMap = createMap(ruanganRes.data, 'nama_ruangan');
      const angkatanMap = createMap(angkatanRes.data, 'nama_angkatan');
      const agendaMap = createMap(agendaRes.data, 'agenda_karya_akhir');

      // Fetch jadwal perkuliahan
      const { data: perkuliahanData } = await supabase
        .from("jadwal_perkuliahan")
        .select("*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)");

      const mergedPerkuliahan = (perkuliahanData || []).map(r => ({
        ...r,
        jenis: "perkuliahan",
        nama_dosen: r.dosen?.nama_dosen || "-",
        nama_ruangan: r.ruangan?.nama_ruangan || "-",
        nama_angkatan: r.angkatan?.nama_angkatan || "-",
        nama_matkul: r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || "-",
        agenda_display: r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || "-",
        keterangan: r.dosen?.nama_dosen || "-",
        mulai_formatted: formatTimestamp(r.mulai_jadwal),
        akhir_formatted: formatTimestamp(r.akhir_jadwal),
        last_modified: r.updated_at || r.created_at || new Date().toISOString(),
      }));
      setJadwalPerkuliahan(mergedPerkuliahan);

      // Fetch jadwal karya akhir
      const { data: karyaAkhirData } = await supabase
        .from("jadwal_karya_akhir")
        .select("*");

      const mergedKaryaAkhir = (karyaAkhirData || []).map(j => ({
        ...j,
        jenis: "karya_akhir",
        nama_ruangan: ruanganMap[j.nama_ruangan] || "-",
        nama_angkatan: angkatanMap[j.nama_angkatan] || "-",
        agenda_display: agendaMap[j.agenda_jadwal_karya_akhir] || "-",
        keterangan: angkatanMap[j.nama_angkatan] || "-",
        ruangan_id_raw: j.nama_ruangan,
        angkatan_id_raw: j.nama_angkatan,
        agenda_id_raw: j.agenda_jadwal_karya_akhir,
        mulai_formatted: formatTimestamp(j.mulai_jadwal),
        akhir_formatted: formatTimestamp(j.akhir_jadwal),
        last_modified: j.updated_at || j.created_at || new Date().toISOString(),
      }));
      setJadwalKaryaAkhir(mergedKaryaAkhir);

      // Fetch jadwal lain-lain
      const { data: lainLainData } = await supabase
        .from("jadwal_lain_lain")
        .select("*");

      const mergedLainLain = (lainLainData || []).map(j => ({
        ...j,
        jenis: "lain_lain",
        nama_ruangan: ruanganMap[j.nama_ruangan] || "-",
        agenda_display: j.agenda || "-",
        keterangan: j.nama_user || "-",
        ruangan_id_raw: j.nama_ruangan,
        mulai_formatted: formatTimestamp(j.mulai_jadwal),
        akhir_formatted: formatTimestamp(j.akhir_jadwal),
        last_modified: j.updated_at || j.created_at || new Date().toISOString(),
      }));
      setJadwalLainLain(mergedLainLain);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "Gagal mengambil data");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Realtime subscriptions
    const channels = [
      supabase.channel('jadwal_perkuliahan_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_perkuliahan' }, fetchAllData),
      supabase.channel('jadwal_karya_akhir_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_karya_akhir' }, fetchAllData),
      supabase.channel('jadwal_lain_lain_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_lain_lain' }, fetchAllData),
    ];

    channels.forEach(ch => ch.subscribe());

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [fetchAllData]);

  // Modal handlers
  const resetForm = (type) => {
    if (type === "perkuliahan") {
      return { id: null, dosen_id: "", ruangan_id: "", id_angkatan: "", id_mata_kuliah: "", mulai_jadwal: "", akhir_jadwal: "" };
    } else if (type === "karya_akhir") {
      return { id: null, nama_ruangan: "", nama_angkatan: "", mulai_jadwal: "", akhir_jadwal: "", agenda_jadwal_karya_akhir: "" };
    } else {
      return { id: null, nama_ruangan: "", nama_user: "", mulai_jadwal: "", akhir_jadwal: "", agenda: "" };
    }
  };

  // Agar bisa dipanggil dari window (untuk dipakai di JadwalTab)
  const openAddModal = (type) => {
    setModalMode("add");
    setModalType(type);
    setForm(resetForm(type));
    setModalOpen(true);
  };

  // Expose handleDownload ke window agar bisa dipanggil dari JadwalTab
  useEffect(() => {
    window.handleDownloadJadwal = handleDownload;
    window.openDownloadModal = (jenis) => {
      console.log("[openDownloadModal] Jenis:", jenis, "Type:", typeof jenis);
      setDownloadJenisTab(jenis);
      setDownloadType("all"); // default ke semua saat modal dibuka
      setDownloadStartDate("");
      setDownloadEndDate("");
      setDownloadMonth("");
      setDownloadModalOpen(true);
    };
    return () => {
      delete window.handleDownloadJadwal;
      delete window.openDownloadModal;
    };
  }, [jadwalPerkuliahan, jadwalKaryaAkhir, jadwalLainLain, downloadType, downloadStartDate, downloadEndDate, downloadMonth]);
  window.openAddModal = openAddModal;

  const openEditModal = (row) => {
    setModalMode("edit");
    setModalType(row.jenis);
    
    if (row.jenis === "perkuliahan") {
      setForm({
        id: row.id,
        dosen_id: row.dosen_id || "",
        ruangan_id: row.ruangan_id || "",
        id_angkatan: row.id_angkatan || "",
        id_mata_kuliah: row.id_mata_kuliah || "",
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal)
      });
    } else if (row.jenis === "karya_akhir") {
      setForm({
        id: row.id,
        nama_ruangan: row.ruangan_id_raw || "",
        nama_angkatan: row.angkatan_id_raw || "",
        agenda_jadwal_karya_akhir: row.agenda_id_raw || "",
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal)
      });
    } else {
      setForm({
        id: row.id,
        nama_ruangan: row.ruangan_id_raw || "",
        nama_user: row.nama_user || "",
        agenda: row.agenda || "",
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal)
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({});
  };

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Check conflict
  const handleCheckConflict = async () => {
    if (modalType === "perkuliahan") {
      return await checkRuanganConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        ruanganId: form.ruangan_id,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_perkuliahan' : null,
        ruanganMap: createMap(options.ruangan, 'nama_ruangan')
      });
    } else if (modalType === "karya_akhir") {
      return await checkRuanganConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        ruanganId: form.nama_ruangan,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_karya_akhir' : null,
        ruanganMap: createMap(options.ruangan, 'nama_ruangan')
      });
    } else {
      return await checkRuanganConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        ruanganId: form.nama_ruangan,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_lain_lain' : null,
        ruanganMap: createMap(options.ruangan, 'nama_ruangan')
      });
    }
  };

  // Submit handler - REFACTORED (lebih simple!)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const conflictMsg = await handleCheckConflict();
      if (conflictMsg) {
        alert(conflictMsg);
        setSaving(false);
        return;
      }

      // 🎯 Object mapping: modalType → table name
      const tableMap = {
        perkuliahan: "jadwal_perkuliahan",
        karya_akhir: "jadwal_karya_akhir",
        lain_lain: "jadwal_lain_lain"
      };

      const table = tableMap[modalType];

      // 🎯 Logic insert/update disatukan (tidak ada duplikasi!)
      let result;
      if (modalMode === "add") {
        const { id, ...dataToInsert } = form; // Hapus id untuk insert
        result = await supabase.from(table).insert([dataToInsert]);
      } else {
        result = await supabase.from(table).update(form).eq("id", form.id);
      }

      if (result.error) throw result.error;
      alert(`Data berhasil ${modalMode === "add" ? "ditambahkan" : "diupdate"}!`);
      closeModal();
      fetchAllData();
    } catch (err) {
      console.error("Error saving:", err);
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async (id, jenis) => {
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return;

    try {
      const tableMap = {
        perkuliahan: "jadwal_perkuliahan",
        karya_akhir: "jadwal_karya_akhir",
        lain_lain: "jadwal_lain_lain"
      };

      const { error } = await supabase.from(tableMap[jenis]).delete().eq("id", id);
      if (error) throw error;

      alert("Data berhasil dihapus!");
      fetchAllData();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  // Download handler - dengan parameter jenis untuk download per tab
  const handleDownload = async (jenisTab = null) => {
    try {
      let data = [];
      
      // Jika dipanggil dari tab tertentu, download data tab tersebut dengan filter
      if (jenisTab || downloadJenisTab) {
        const targetJenis = jenisTab || downloadJenisTab;
        let allTabData = [];
        
        if (targetJenis === "perkuliahan") {
          allTabData = jadwalPerkuliahan;
        } else if (targetJenis === "karya_akhir") {
          allTabData = jadwalKaryaAkhir;
        } else if (targetJenis === "lain_lain") {
          allTabData = jadwalLainLain;
        }
        
        console.log(`[Download] Tab: ${targetJenis}, Total data: ${allTabData.length}, Filter: ${downloadType}`);
        
        // Jika ada filter tanggal atau bulan
        if (downloadType === "all") {
          data = allTabData;
        } else if (downloadType === "date") {
          if (!downloadStartDate || !downloadEndDate) {
            alert("Mohon pilih tanggal mulai dan akhir");
            return;
          }
          const start = new Date(downloadStartDate);
          const end = new Date(downloadEndDate);
          end.setHours(23, 59, 59);
          
          data = allTabData.filter(j => {
            if (!j.mulai_jadwal) return false;
            const mulai = new Date(j.mulai_jadwal);
            if (isNaN(mulai.getTime())) return false;
            return mulai >= start && mulai <= end;
          });
        } else if (downloadType === "month") {
          if (!downloadMonth) {
            alert("Mohon pilih bulan");
            return;
          }
          const [year, month] = downloadMonth.split('-');
          
          data = allTabData.filter(j => {
            if (!j.mulai_jadwal) return false;
            const mulai = new Date(j.mulai_jadwal);
            if (isNaN(mulai.getTime())) return false;
            return mulai.getFullYear() === parseInt(year) && mulai.getMonth() === parseInt(month) - 1;
          });
        }
      } else {
        // Untuk modal download semua data (semua/date/month)
        if (downloadType === "all") {
          data = [...jadwalPerkuliahan, ...jadwalKaryaAkhir, ...jadwalLainLain];
        } else if (downloadType === "date") {
          if (!downloadStartDate || !downloadEndDate) {
            alert("Mohon pilih tanggal mulai dan akhir");
            return;
          }
          const start = new Date(downloadStartDate);
          const end = new Date(downloadEndDate);
          end.setHours(23, 59, 59);
          
          data = [...jadwalPerkuliahan, ...jadwalKaryaAkhir, ...jadwalLainLain].filter(j => {
            const mulai = new Date(j.mulai_jadwal);
            return mulai >= start && mulai <= end;
          });
        } else if (downloadType === "month") {
          if (!downloadMonth) {
            alert("Mohon pilih bulan");
            return;
          }
          const [year, month] = downloadMonth.split('-');
          
          data = [...jadwalPerkuliahan, ...jadwalKaryaAkhir, ...jadwalLainLain].filter(j => {
            const mulai = new Date(j.mulai_jadwal);
            return mulai.getFullYear() === parseInt(year) && mulai.getMonth() === parseInt(month) - 1;
          });
        }
      }

      console.log(`[Download] Hasil filter: ${data.length} data`);

      if (data.length === 0) {
        alert("Tidak ada data untuk didownload");
        return;
      }

      // Convert to CSV
      const headers = ["Jenis", "Agenda", "Ruangan", "Waktu Mulai", "Waktu Selesai", "Keterangan"];
      const rows = data.map(d => [
        d.jenis,
        d.agenda_display || "-",
        d.nama_ruangan || "-",
        d.mulai_formatted || "-",
        d.akhir_formatted || "-",
        d.keterangan || "-"
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const targetJenis = jenisTab || downloadJenisTab || downloadType;
      const filename = `jadwal_${targetJenis}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      alert(`Data berhasil didownload (${data.length} data)`);
      setDownloadModalOpen(false);
      setDownloadJenisTab(null); // reset
    } catch (err) {
      console.error("Error downloading:", err);
      alert(`Gagal download: ${err.message}`);
    }
  };

  // Render form fields berdasarkan modalType
  const renderFormFields = () => {
    if (modalType === "perkuliahan") {
      return (
        <>
          <SearchableSelect label="Angkatan" value={form.id_angkatan} onChange={(v) => handleChange("id_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" required />
          <SearchableSelect label="Mata Kuliah" value={form.id_mata_kuliah} onChange={(v) => handleChange("id_mata_kuliah", v)} options={options.mataKuliah} displayKey={(m) => m.mata_kuliah || m.nama_matkul || m.nama || `MK ${m.id}`} required />
          <SearchableSelect label="Dosen" value={form.dosen_id} onChange={(v) => handleChange("dosen_id", v)} options={options.dosen} displayKey="nama_dosen" required />
          <SearchableSelect label="Ruangan" value={form.ruangan_id} onChange={(v) => handleChange("ruangan_id", v)} options={options.ruangan} displayKey="nama_ruangan" required />
        </>
      );
    } else if (modalType === "karya_akhir") {
      return (
        <>
          <SearchableSelect label="Angkatan" value={form.nama_angkatan} onChange={(v) => handleChange("nama_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" required />
          <SearchableSelect label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={options.ruangan} displayKey="nama_ruangan" required />
          <SearchableSelect label="Agenda" value={form.agenda_jadwal_karya_akhir} onChange={(v) => handleChange("agenda_jadwal_karya_akhir", v)} options={options.agenda} displayKey="agenda_karya_akhir" required />
        </>
      );
    } else {
      return (
        <>
          <InputField label="Nama User" value={form.nama_user || ""} onChange={(v) => handleChange("nama_user", v)} placeholder="Masukkan nama user" />
          <SearchableSelect label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={options.ruangan} displayKey="nama_ruangan" required />
          <InputField label="Agenda" value={form.agenda || ""} onChange={(v) => handleChange("agenda", v)} placeholder="Masukkan agenda" />
        </>
      );
    }
  };

  const modalTitles = {
    perkuliahan: { add: "Tambah Jadwal Perkuliahan", edit: "Edit Jadwal Perkuliahan" },
    karya_akhir: { add: "Tambah Jadwal Karya Akhir", edit: "Edit Jadwal Karya Akhir" },
    lain_lain: { add: "Tambah Jadwal Lain-lain", edit: "Edit Jadwal Lain-lain" }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Kelola Jadwal" />
      {/* Download Button dipindah ke baris search & CRUD (lihat JadwalTab) */}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab("perkuliahan")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "perkuliahan"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📚 Perkuliahan
            </button>
            <button
              onClick={() => setActiveTab("karya_akhir")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "karya_akhir"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              🎓 Karya Akhir
            </button>
            <button
              onClick={() => setActiveTab("lain_lain")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "lain_lain"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📋 Lain-lain
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "perkuliahan" && (
            <JadwalTab
              data={jadwalPerkuliahan}
              loading={loading}
              error={error}
              jenis="perkuliahan"
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
          {activeTab === "karya_akhir" && (
            <JadwalTab
              data={jadwalKaryaAkhir}
              loading={loading}
              error={error}
              jenis="karya_akhir"
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
          {activeTab === "lain_lain" && (
            <JadwalTab
              data={jadwalLainLain}
              loading={loading}
              error={error}
              jenis="lain_lain"
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <Modal onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {modalTitles[modalType][modalMode]}
            </h3>
            
            {renderFormFields()}
            
            <DateTimeField
              label="Waktu Mulai"
              value={form.mulai_jadwal}
              onChange={(v) => handleChange("mulai_jadwal", v)}
            />
            <DateTimeField
              label="Waktu Selesai"
              value={form.akhir_jadwal}
              onChange={(v) => handleChange("akhir_jadwal", v)}
            />

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Download Modal */}
      {downloadModalOpen && (
        <Modal onClose={() => { setDownloadModalOpen(false); setDownloadJenisTab(null); }}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Download Jadwal {downloadJenisTab ? `- ${downloadJenisTab === "perkuliahan" ? "Perkuliahan" : downloadJenisTab === "karya_akhir" ? "Karya Akhir" : "Lain-lain"}` : ""}
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={downloadType === "all"}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">{downloadJenisTab ? "Semua Data di Tab Ini" : "Semua Data"}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="date"
                  checked={downloadType === "date"}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Berdasarkan Tanggal</span>
              </label>
              {downloadType === "date" && (
                <div className="ml-6 space-y-2">
                  <input
                    type="date"
                    value={downloadStartDate}
                    onChange={(e) => setDownloadStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="Tanggal Mulai"
                  />
                  <input
                    type="date"
                    value={downloadEndDate}
                    onChange={(e) => setDownloadEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    placeholder="Tanggal Akhir"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="month"
                  checked={downloadType === "month"}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Berdasarkan Bulan</span>
              </label>
              {downloadType === "month" && (
                <div className="ml-6">
                  <input
                    type="month"
                    value={downloadMonth}
                    onChange={(e) => setDownloadMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => { setDownloadModalOpen(false); setDownloadJenisTab(null); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDownload()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Download
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ================================================================================
// TAB COMPONENT
// ================================================================================
function JadwalTab({ data, loading, error, jenis, onEdit, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter berdasarkan search saja (tanpa filter tanggal)
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => {
        const agenda = (d.agenda_display || "").toLowerCase();
        const ruangan = (d.nama_ruangan || "").toLowerCase();
        const keterangan = (d.keterangan || "").toLowerCase();
        const mulaiFormatted = (d.mulai_formatted || "").toLowerCase();
        const akhirFormatted = (d.akhir_formatted || "").toLowerCase();
        const angkatan = (d.nama_angkatan || "").toLowerCase();
        const namaUser = (d.nama_user || "").toLowerCase();
        
        return agenda.includes(query) || 
               ruangan.includes(query) || 
               keterangan.includes(query) ||
               mulaiFormatted.includes(query) ||
               akhirFormatted.includes(query) ||
               angkatan.includes(query) ||
               namaUser.includes(query);
      });
    }

    return filtered.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
  }, [data, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Reset ke halaman 1 saat search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Search handlers
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Search Box & CRUD Add Button */}
      <div className="flex items-center gap-2 w-full">
        {/* 🎯 Menggunakan komponen SearchBar yang reusable */}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          placeholder="Cari berdasarkan tanggal, agenda, ruangan, angkatan... (tekan Enter)"
          showClear={!!searchQuery}
        />
        {/* CRUD Add Button sesuai tab */}
        {jenis === "perkuliahan" && (
          <button
            onClick={() => window.openAddModal ? window.openAddModal("perkuliahan") : null}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Perkuliahan">📚</span> + Perkuliahan
          </button>
        )}
        {jenis === "karya_akhir" && (
          <button
            onClick={() => window.openAddModal ? window.openAddModal("karya_akhir") : null}
            className="px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Karya Akhir">🎓</span> + Karya Akhir
          </button>
        )}
        {jenis === "lain_lain" && (
          <button
            onClick={() => window.openAddModal ? window.openAddModal("lain_lain") : null}
            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Lain-lain">📋</span> + Lain-lain
          </button>
        )}
        {/* Download paling kanan, setelah CRUD - download sesuai tab aktif */}
        <button
          onClick={() => window.openDownloadModal ? window.openDownloadModal(jenis) : null}
          className="px-4 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg--700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </button>
      </div>

      {/* Info hasil search */}
      {searchQuery && (
        <div className="text-sm text-slate-600">
          Hasil pencarian: <span className="font-medium text-indigo-600">"{searchQuery}"</span>
        </div>
      )}

      {filteredData.length === 0 ? (
        <EmptyState text={searchQuery ? "Tidak ada hasil pencarian." : "Belum ada data jadwal."} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  {jenis === "perkuliahan" && (
                    <>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Angkatan</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Mulai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Selesai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Agenda</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Tempat</th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">Aksi</th>
                    </>
                  )}
                  {jenis === "karya_akhir" && (
                    <>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Angkatan</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Mulai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Selesai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Agenda</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Ruangan</th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">Aksi</th>
                    </>
                  )}
                  {jenis === "lain_lain" && (
                    <>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Nama User</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Mulai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Selesai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Agenda</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Tempat</th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-blue-100 transition-colors">
                    {jenis === "perkuliahan" && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">{row.nama_angkatan}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.mulai_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.akhir_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">{row.nama_matkul || row.agenda_display}</div>
                          <div className="text-xs text-slate-600">{row.nama_dosen || row.keterangan}</div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">{row.nama_ruangan}</span>
                        </td>
                      </>
                    )}
                    {jenis === "karya_akhir" && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">{row.nama_angkatan}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.mulai_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.akhir_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">{row.agenda_display}</div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">{row.nama_ruangan}</span>
                        </td>
                      </>
                    )}
                    {jenis === "lain_lain" && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">{row.nama_user || row.keterangan}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.mulai_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.akhir_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">{row.agenda || row.agenda_display}</div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">{row.nama_ruangan}</span>
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 border border-slate-200 text-center">
                      {/* 🎯 Menggunakan komponen ActionButtons yang reusable */}
                      <ActionButtons onEdit={onEdit} onDelete={onDelete} row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🎯 Menggunakan komponen Pagination yang reusable */}
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </>
      )}
    </div>
  );
}

// ================================================================================
// UI COMPONENTS
// ================================================================================
function PageHeader({ title }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span className="ml-3 text-sm text-slate-600">Memuat data...</span>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-600">⚠️ {message}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-slate-50 rounded-xl p-8 text-center">
      <p className="text-slate-500">{text}</p>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, displayKey }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Pilih {label}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {typeof displayKey === 'function' ? displayKey(opt) : opt[displayKey]}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateTimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}
