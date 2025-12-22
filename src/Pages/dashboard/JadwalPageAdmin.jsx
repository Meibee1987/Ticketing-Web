/**
 * ================================================================================
 * FILE: JadwalPageAdmin.jsx
 * DESKRIPSI: Halaman manajemen jadwal dengan tabel gabungan dan pagination
 * ================================================================================
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

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

// ================================================================================
// FUNGSI CEK KONFLIK RUANGAN (CROSS-TABLE)
// ================================================================================
const checkRuanganConflict = async ({ mulai, akhir, ruanganId, excludeId, excludeTable, ruanganMap }) => {
  if (!mulai || !akhir) return "• Waktu mulai dan selesai harus diisi";
  
  const formStart = new Date(mulai), formEnd = new Date(akhir);
  if (formStart >= formEnd) return "• Waktu mulai harus lebih awal dari waktu selesai";
  if (!ruanganId) return null;

  const namaRuangan = ruanganMap?.[ruanganId] || `Ruangan ${ruanganId}`;

  const excludeJenis = {
    "jadwal_perkuliahan": "PERKULIAHAN",
    "jadwal_karya_akhir": "KARYA_AKHIR",
    "jadwal_lain_lain": "LAIN_LAIN"
  }[excludeTable];

  const { data, error } = await supabase
    .from("view_jadwal_union")
    .select("jenis_jadwal, id_asli, ruangan_id, mulai_jadwal, akhir_jadwal")
    .eq("ruangan_id", ruanganId)
    .order("mulai_jadwal");

  if (error) {
    console.error("Error checking conflict:", error);
    return null;
  }

  const conflicts = (data || [])
    .filter(j => {
      if (j.jenis_jadwal === excludeJenis && j.id_asli === excludeId) return false;
      if (!j.mulai_jadwal || !j.akhir_jadwal) return false;
      const start = new Date(j.mulai_jadwal), end = new Date(j.akhir_jadwal);
      return formStart < end && formEnd > start;
    })
    .map(j => {
      const jenisLabel = { "PERKULIAHAN": "Perkuliahan", "KARYA_AKHIR": "Karya Akhir", "LAIN_LAIN": "Lain-lain" }[j.jenis_jadwal];
      return `• [${jenisLabel}] Ruangan "${namaRuangan}" sudah dipakai ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`;
    });

  return conflicts.length ? conflicts.join('\n') : null;
};

// ================================================================================
// KOMPONEN UTAMA: JadwalPageAdmin
// ================================================================================
export default function JadwalPageAdmin() {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Data states
  const [jadwalPerkuliahan, setJadwalPerkuliahan] = useState([]);
  const [jadwalKaryaAkhir, setJadwalKaryaAkhir] = useState([]);
  const [jadwalLainLain, setJadwalLainLain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search states
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Options for forms
  const [options, setOptions] = useState({
    dosen: [], ruangan: [], angkatan: [], mataKuliah: [], agenda: []
  });
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [modalType, setModalType] = useState("perkuliahan"); // perkuliahan | karya_akhir | lain_lain
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Download states
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadType, setDownloadType] = useState("date");
  const [downloadStartDate, setDownloadStartDate] = useState("");
  const [downloadEndDate, setDownloadEndDate] = useState("");
  const [downloadMonth, setDownloadMonth] = useState("");

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch options
      const [dosenRes, ruanganRes, angkatanRes, mataKuliahRes, agendaRes] = await Promise.all([
        supabase.from("dosen").select("id, nama_dosen"),
        supabase.from("ruangan").select("id, nama_ruangan"),
        supabase.from("angkatan").select("id, nama_angkatan"),
        supabase.from("mata_kuliah").select("*"),
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

  // Gabungkan semua jadwal, filter search, dan urutkan berdasarkan update terbaru
  const allJadwal = useMemo(() => {
    const combined = [...jadwalPerkuliahan, ...jadwalKaryaAkhir, ...jadwalLainLain];
    
    // Filter berdasarkan search query
    let filtered = combined;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = combined.filter(j => {
        const agenda = (j.agenda_display || "").toLowerCase();
        const ruangan = (j.nama_ruangan || "").toLowerCase();
        const keterangan = (j.keterangan || "").toLowerCase();
        const jenis = (j.jenis || "").toLowerCase();
        const mulaiFormatted = (j.mulai_formatted || "").toLowerCase();
        const akhirFormatted = (j.akhir_formatted || "").toLowerCase();
        
        return agenda.includes(query) || 
               ruangan.includes(query) || 
               keterangan.includes(query) ||
               jenis.includes(query) ||
               mulaiFormatted.includes(query) ||
               akhirFormatted.includes(query);
      });
    }
    
    // Sort berdasarkan terakhir diupdate/dibuat (descending)
    return filtered.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
  }, [jadwalPerkuliahan, jadwalKaryaAkhir, jadwalLainLain, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(allJadwal.length / ITEMS_PER_PAGE);
  const paginatedJadwal = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allJadwal.slice(start, start + ITEMS_PER_PAGE);
  }, [allJadwal, currentPage]);

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

  const openAddModal = (type) => {
    setModalMode("add");
    setModalType(type);
    setForm(resetForm(type));
    setModalOpen(true);
  };

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
  const checkConflict = async () => {
    const ruanganMap = Object.fromEntries(options.ruangan.map(r => [r.id, r.nama_ruangan]));
    const ruanganId = modalType === "perkuliahan" ? form.ruangan_id : form.nama_ruangan;
    const tableName = modalType === "perkuliahan" ? "jadwal_perkuliahan" : modalType === "karya_akhir" ? "jadwal_karya_akhir" : "jadwal_lain_lain";

    const ruanganConflict = await checkRuanganConflict({
      mulai: form.mulai_jadwal,
      akhir: form.akhir_jadwal,
      ruanganId,
      excludeId: form.id,
      excludeTable: tableName,
      ruanganMap
    });

    if (ruanganConflict?.startsWith("•")) return ruanganConflict;

    // Cek konflik dosen (hanya untuk perkuliahan)
    if (modalType === "perkuliahan" && form.dosen_id) {
      const { data: jadwalDosen } = await supabase
        .from("jadwal_perkuliahan")
        .select("*")
        .eq("dosen_id", form.dosen_id)
        .neq("id", form.id || 0);

      const formStart = new Date(form.mulai_jadwal), formEnd = new Date(form.akhir_jadwal);
      const dosenConflicts = [];

      for (const j of (jadwalDosen || [])) {
        if (!j.mulai_jadwal || !j.akhir_jadwal) continue;
        const isOverlap = formStart < new Date(j.akhir_jadwal) && formEnd > new Date(j.mulai_jadwal);
        if (isOverlap) {
          const d = options.dosen.find(x => String(x.id) === String(form.dosen_id));
          dosenConflicts.push(`• [Perkuliahan] Dosen "${d?.nama_dosen || form.dosen_id}" sudah mengajar ${formatTimestampShort(j.mulai_jadwal)} s/d ${formatTimestampShort(j.akhir_jadwal)}`);
        }
      }

      if (dosenConflicts.length) {
        return [ruanganConflict, ...dosenConflicts].filter(Boolean).join('\n');
      }
    }

    return ruanganConflict;
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    const conflict = await checkConflict();
    if (conflict) {
      alert(`⚠️ Bentrok!\n\n${conflict}`);
      setSaving(false);
      return;
    }

    let payload, tableName;

    if (modalType === "perkuliahan") {
      tableName = "jadwal_perkuliahan";
      payload = {
        dosen_id: form.dosen_id || null,
        ruangan_id: form.ruangan_id || null,
        id_angkatan: form.id_angkatan || null,
        id_mata_kuliah: form.id_mata_kuliah || null,
        mulai_jadwal: form.mulai_jadwal || null,
        akhir_jadwal: form.akhir_jadwal || null
      };
    } else if (modalType === "karya_akhir") {
      tableName = "jadwal_karya_akhir";
      payload = {
        nama_ruangan: form.nama_ruangan || null,
        nama_angkatan: form.nama_angkatan || null,
        agenda_jadwal_karya_akhir: form.agenda_jadwal_karya_akhir || null,
        mulai_jadwal: form.mulai_jadwal || null,
        akhir_jadwal: form.akhir_jadwal || null
      };
    } else {
      tableName = "jadwal_lain_lain";
      payload = {
        nama_ruangan: form.nama_ruangan ? parseInt(form.nama_ruangan) : null,
        nama_user: form.nama_user || null,
        agenda: form.agenda || null,
        mulai_jadwal: form.mulai_jadwal || null,
        akhir_jadwal: form.akhir_jadwal || null
      };
    }

    const { error } = modalMode === "add"
      ? await supabase.from(tableName).insert(payload)
      : await supabase.from(tableName).update(payload).eq("id", form.id);

    setSaving(false);
    if (error) {
      alert("Gagal menyimpan: " + error.message);
      return;
    }
    closeModal();
    fetchAllData();
  };

  // Delete handler
  const handleDelete = async (row) => {
    if (!confirm(`Hapus jadwal ${row.jenis === "perkuliahan" ? "perkuliahan" : row.jenis === "karya_akhir" ? "karya akhir" : "lain-lain"} ini?`)) return;
    
    const tableName = row.jenis === "perkuliahan" ? "jadwal_perkuliahan" : row.jenis === "karya_akhir" ? "jadwal_karya_akhir" : "jadwal_lain_lain";
    const { error } = await supabase.from(tableName).delete().eq("id", row.id);
    
    if (error) alert("Gagal menghapus: " + error.message);
    else fetchAllData();
  };

  // Download handler
  const handleDownload = async () => {
    try {
      let startDate, endDate;
      
      if (downloadType === "date") {
        if (!downloadStartDate || !downloadEndDate) {
          alert("Pilih tanggal mulai dan selesai");
          return;
        }
        startDate = new Date(downloadStartDate + 'T00:00:00');
        endDate = new Date(downloadEndDate + 'T23:59:59');
      } else {
        if (!downloadMonth) {
          alert("Pilih bulan");
          return;
        }
        const [year, month] = downloadMonth.split('-');
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      }

      // Fetch all data for download
      const [perkuliahanRes, karyaAkhirRes, lainLainRes] = await Promise.all([
        supabase.from("jadwal_perkuliahan")
          .select("*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)")
          .gte("mulai_jadwal", startDate.toISOString())
          .lte("mulai_jadwal", endDate.toISOString())
          .order("mulai_jadwal"),
        supabase.from("jadwal_karya_akhir")
          .select("*")
          .gte("mulai_jadwal", startDate.toISOString())
          .lte("mulai_jadwal", endDate.toISOString())
          .order("mulai_jadwal"),
        supabase.from("jadwal_lain_lain")
          .select("*")
          .gte("mulai_jadwal", startDate.toISOString())
          .lte("mulai_jadwal", endDate.toISOString())
          .order("mulai_jadwal")
      ]);

      const ruanganMap = createMap(options.ruangan, 'nama_ruangan');
      const angkatanMap = createMap(options.angkatan, 'nama_angkatan');
      const agendaMap = createMap(options.agenda, 'agenda_karya_akhir');

      const data = [
        ...(perkuliahanRes.data || []).map(r => ({
          'Jenis': 'Perkuliahan',
          'Angkatan/User': r.angkatan?.nama_angkatan || '-',
          'Agenda': r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || '-',
          'Keterangan': r.dosen?.nama_dosen || '-',
          'Ruangan': r.ruangan?.nama_ruangan || '-',
          'Waktu Mulai': formatTimestamp(r.mulai_jadwal),
          'Waktu Selesai': formatTimestamp(r.akhir_jadwal)
        })),
        ...(karyaAkhirRes.data || []).map(r => ({
          'Jenis': 'Karya Akhir',
          'Angkatan/User': angkatanMap[r.nama_angkatan] || '-',
          'Agenda': agendaMap[r.agenda_jadwal_karya_akhir] || '-',
          'Keterangan': '-',
          'Ruangan': ruanganMap[r.nama_ruangan] || '-',
          'Waktu Mulai': formatTimestamp(r.mulai_jadwal),
          'Waktu Selesai': formatTimestamp(r.akhir_jadwal)
        })),
        ...(lainLainRes.data || []).map(r => ({
          'Jenis': 'Lain-lain',
          'Angkatan/User': r.nama_user || '-',
          'Agenda': r.agenda || '-',
          'Keterangan': '-',
          'Ruangan': ruanganMap[r.nama_ruangan] || '-',
          'Waktu Mulai': formatTimestamp(r.mulai_jadwal),
          'Waktu Selesai': formatTimestamp(r.akhir_jadwal)
        }))
      ];

      // Sort by waktu mulai
      data.sort((a, b) => new Date(a['Waktu Mulai']) - new Date(b['Waktu Mulai']));

      if (data.length === 0) {
        alert("Tidak ada data untuk periode yang dipilih");
        return;
      }

      // Generate CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const dateStr = downloadType === "date" 
        ? `${downloadStartDate}_${downloadEndDate}`
        : downloadMonth;
      link.setAttribute('href', url);
      link.setAttribute('download', `jadwal_semua_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadModalOpen(false);
      alert(`Data berhasil didownload (${data.length} data)`);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Gagal mendownload data: ' + error.message);
    }
  };

  // Render form fields berdasarkan modalType
  const renderFormFields = () => {
    if (modalType === "perkuliahan") {
      return (
        <>
          <SelectField label="Angkatan" value={form.id_angkatan} onChange={(v) => handleChange("id_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" />
          <SelectField label="Mata Kuliah" value={form.id_mata_kuliah} onChange={(v) => handleChange("id_mata_kuliah", v)} options={options.mataKuliah} displayKey={(m) => m.mata_kuliah || m.nama_matkul || m.nama || `MK ${m.id}`} />
          <SelectField label="Dosen" value={form.dosen_id} onChange={(v) => handleChange("dosen_id", v)} options={options.dosen} displayKey="nama_dosen" />
          <SelectField label="Ruangan" value={form.ruangan_id} onChange={(v) => handleChange("ruangan_id", v)} options={options.ruangan} displayKey="nama_ruangan" />
        </>
      );
    } else if (modalType === "karya_akhir") {
      return (
        <>
          <SelectField label="Angkatan" value={form.nama_angkatan} onChange={(v) => handleChange("nama_angkatan", v)} options={options.angkatan} displayKey="nama_angkatan" />
          <SelectField label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={options.ruangan} displayKey="nama_ruangan" />
          <SelectField label="Agenda" value={form.agenda_jadwal_karya_akhir} onChange={(v) => handleChange("agenda_jadwal_karya_akhir", v)} options={options.agenda} displayKey="agenda_karya_akhir" />
        </>
      );
    } else {
      return (
        <>
          <InputField label="Nama User" value={form.nama_user || ""} onChange={(v) => handleChange("nama_user", v)} placeholder="Masukkan nama user" />
          <SelectField label="Ruangan" value={form.nama_ruangan} onChange={(v) => handleChange("nama_ruangan", v)} options={options.ruangan} displayKey="nama_ruangan" />
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
      
      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Add Buttons */}
            <button onClick={() => openAddModal("perkuliahan")} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <span>📚</span> + Perkuliahan
            </button>
            <button onClick={() => openAddModal("karya_akhir")} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              <span>🎓</span> + Karya Akhir
            </button>
            <button onClick={() => openAddModal("lain_lain")} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
              <span>📋</span> + Lain-lain
            </button>
          </div>
          <button 
            onClick={() => setDownloadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Combined Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Semua Jadwal <span className="text-sm font-normal text-slate-500">({allJadwal.length} data)</span>
              </h2>
              {searchQuery && (
                <p className="text-sm text-slate-600 mt-1">
                  Hasil pencarian: <span className="font-medium text-indigo-600">"{searchQuery}"</span>
                </p>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="Cari agenda, ruangan, keterangan, atau jenis... (tekan Enter)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={handleSearch}
                className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Cari
              </button>
              {searchQuery && (
                <button 
                  onClick={handleClearSearch}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : allJadwal.length === 0 ? (
            <EmptyState text="Belum ada data jadwal." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Jenis</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Waktu Mulai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Waktu Selesai</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Agenda</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Keterangan</th>
                      <th className="py-3 px-4 font-semibold text-left border border-slate-300">Ruangan</th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedJadwal.map((row) => (
                      <tr key={`${row.jenis}-${row.id}`} className="border-b border-slate-200 hover:bg-indigo-50 transition-colors">
                        <td className="py-3 px-4 border border-slate-200">
                          <JenisBadge jenis={row.jenis} />
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.mulai_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-medium text-slate-800 text-xs">{row.akhir_formatted}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-900">{row.agenda_display}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-600 text-xs">{row.keterangan}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">{row.nama_ruangan}</span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200 text-center">
                          <button onClick={() => openEditModal(row)} className="text-indigo-600 hover:text-indigo-800 mr-3 font-medium text-xs">Edit</button>
                          <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800 font-medium text-xs">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Halaman {currentPage} dari {totalPages} ({allJadwal.length} data)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <Modal 
          title={modalTitles[modalType]?.[modalMode] || "Jadwal"} 
          saving={saving} 
          onSave={handleSave} 
          onClose={closeModal}
        >
          {renderFormFields()}
          <TimeFields form={form} onChange={handleChange} />
        </Modal>
      )}

      {/* Download Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Download Semua Jadwal</h3>
              <button onClick={() => setDownloadModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Tipe Download</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" value="date" checked={downloadType === "date"} onChange={(e) => setDownloadType(e.target.value)} className="mr-2" />
                    <span className="text-sm">Range Tanggal</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" value="month" checked={downloadType === "month"} onChange={(e) => setDownloadType(e.target.value)} className="mr-2" />
                    <span className="text-sm">Per Bulan</span>
                  </label>
                </div>
              </div>

              {downloadType === "date" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                    <input type="date" value={downloadStartDate} onChange={(e) => setDownloadStartDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                    <input type="date" value={downloadEndDate} onChange={(e) => setDownloadEndDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Bulan</label>
                  <input type="month" value={downloadMonth} onChange={(e) => setDownloadMonth(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Info:</strong> Semua jenis jadwal (Perkuliahan, Karya Akhir, Lain-lain) akan didownload dalam satu file CSV.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setDownloadModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleDownload} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================================
// KOMPONEN UI SHARED
// ================================================================================

function PageHeader({ title }) {
  return (
    <header className="text-center">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
    </header>
  );
}

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
    <InputField label="Waktu Mulai" type="datetime-local" value={form.mulai_jadwal || ""} onChange={(v) => onChange("mulai_jadwal", v)} />
    <InputField label="Waktu Selesai" type="datetime-local" value={form.akhir_jadwal || ""} onChange={(v) => onChange("akhir_jadwal", v)} />
  </>
);
