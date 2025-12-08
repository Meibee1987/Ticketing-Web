import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function MasterData() {
  const [activeTab, setActiveTab] = useState("dosen");
  
  // State untuk masing-masing tabel
  const [dosen, setDosen] = useState([]);
  const [angkatan, setAngkatan] = useState([]);
  const [mataKuliah, setMataKuliah] = useState([]);
  const [ruangan, setRuangan] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create, edit, view
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch data saat component mount atau tab berubah
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "dosen":
          const { data: dosenData, error: dosenError } = await supabase.from("dosen").select("*").order("id", { ascending: true });
          if (dosenError) throw dosenError;
          console.log("✅ Dosen loaded:", dosenData);
          setDosen(dosenData || []);
          break;
        case "angkatan":
          const { data: angkatanData, error: angkatanError } = await supabase.from("angkatan").select("*").order("id", { ascending: true });
          if (angkatanError) throw angkatanError;
          console.log("✅ Angkatan loaded:", angkatanData);
          setAngkatan(angkatanData || []);
          break;
        case "matakuliah":
          const { data: mkData, error: mkError } = await supabase.from("mata_kuliah").select("*").order("id", { ascending: true });
          if (mkError) throw mkError;
          console.log("✅ Mata Kuliah loaded:", mkData);
          setMataKuliah(mkData || []);
          break;
        case "ruangan":
          const { data: ruanganData, error: ruanganError } = await supabase.from("ruangan").select("*").order("id", { ascending: true });
          if (ruanganError) throw ruanganError;
          console.log("✅ Ruangan loaded:", ruanganData);
          setRuangan(ruanganData || []);
          break;
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      alert("Gagal mengambil data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalMode("edit");
    setSelectedItem(item);
    setShowModal(true);
  };



  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const tableName = activeTab === "matakuliah" ? "mata_kuliah" : activeTab;
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      alert("Data berhasil dihapus!");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Gagal menghapus: " + error.message);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedItem(null);
    fetchData();
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "dosen": return dosen;
      case "angkatan": return angkatan;
      case "matakuliah": return mataKuliah;
      case "ruangan": return ruangan;
      default: return [];
    }
  };

  // Filter data based on search
  const filteredData = getCurrentData().filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return Object.values(item).some((val) => 
      val && val.toString().toLowerCase().includes(searchLower)
    );
  });

  const tabs = [
    { id: "dosen", label: "Dosen", icon: "👨‍🏫" },
    { id: "angkatan", label: "Angkatan", icon: "📅" },
    { id: "matakuliah", label: "Mata Kuliah", icon: "📚" },
    { id: "ruangan", label: "Ruangan", icon: "🏢" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
          <p className="text-slate-600">Kelola data master: Dosen, Angkatan, Mata Kuliah, dan Ruangan</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah {tabs.find(t => t.id === activeTab)?.label}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchInput(""); setSearchQuery(""); }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); }} className="relative max-w-md">
            <input
              type="text"
              placeholder={
                activeTab === "ruangan" ? "Masukan kata kunci Nama Ruangan" :
                activeTab === "dosen" ? "Masukan kata kunci Nama Dosen" :
                activeTab === "angkatan" ? "Masukan kata kunci Nama Angkatan":
                   `Masukan kata kunci ${tabs.find(t => t.id === activeTab)?.label}`
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-20 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                className="absolute right-2 top-2 px-2 py-1 text-xs text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-600">Tidak ada data {tabs.find(t => t.id === activeTab)?.label}</p>
            </div>
          ) : (
            <DataTable 
              activeTab={activeTab} 
              data={filteredData} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-sm text-slate-600">
            Menampilkan {filteredData.length} dari {getCurrentData().length} data
          </span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <DataModal
          activeTab={activeTab}
          mode={modalMode}
          item={selectedItem}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

// Data Table Component
function DataTable({ activeTab, data, onEdit, onDelete }) {
  const getColumns = () => {
    switch (activeTab) {
      case "dosen":
        return [
          { key: "id", label: "ID" },
          { key: "nama_dosen", label: "Nama Dosen" },
          { key: "nip", label: "NIP" },
          { key: "email", label: "Email" },
          { key: "telepon", label: "Telepon" },
        ];
      case "angkatan":
        return [
          { key: "id", label: "ID" },
          { key: "nama_angkatan", label: "Nama Angkatan" },
          { key: "jumlah_mahasiswa", label: "Jumlah Mahasiswa" },
        ];
      case "matakuliah":
        return [
          { key: "id", label: "ID" },
          { key: "kode_mata_kuliah", label: "Kode Mata Kuliah" },
          { key: "mata_kuliah", label: "Mata Kuliah" },
        ];
      case "ruangan":
        return [
          { key: "id", label: "ID" },
          { key: "nama_ruangan", label: "Nama Ruangan" },
          { key: "kapasitas_ruangan", label: "Kapasitas" },
          { key: "gedung", label: "Gedung" },
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  return (
    <table className="w-full">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
              {col.label}
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {data.map((item) => (
          <tr key={item.id} className="hover:bg-slate-50">
            {columns.map((col) => (
              <td key={col.key} className="px-6 py-4 text-sm text-slate-700">
                {item[col.key] || "-"}
              </td>
            ))}
            <td className="px-6 py-4">
              <div className="flex gap-2">

                <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Modal Component
function DataModal({ activeTab, mode, item, onClose, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Default form data based on active tab
      switch (activeTab) {
        case "dosen":
          setFormData({ nama_dosen: "", nip: "", email: "", telepon: "" });
          break;
        case "angkatan":
          setFormData({ nama_angkatan: "", jumlah_mahasiswa: "" });
          break;
        case "matakuliah":
          setFormData({ kode_mata_kuliah: "", mata_kuliah: "" });
          break;
        case "ruangan":
          setFormData({ nama_ruangan: "", kapasitas_ruangan: "", gedung: "" });
          break;
      }
    }
  }, [item, activeTab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "view") return;

    try {
      setSubmitting(true);
      const tableName = activeTab === "matakuliah" ? "mata_kuliah" : activeTab;
      
      // Remove id, created_at, and empty string values from formData
      const { id, created_at, ...rawData } = formData;
      
      // Filter out empty strings and ensure id is completely removed
      const cleanData = Object.entries(rawData).filter(([key, value]) => {
        // Exclude id field explicitly
        if (key === "id") return false;
        // Exclude empty values
        return value !== "" && value !== null && value !== undefined;
      });
      
      const insertData = Object.fromEntries(cleanData);
      
      // Debug log untuk memastikan id tidak ada
      console.log(`📝 ${mode.toUpperCase()} ${tableName}:`, insertData);

      if (mode === "create") {
        const { data, error } = await supabase.from(tableName).insert([insertData]).select();
        if (error) {
          console.error("❌ Insert error:", error);
          throw error;
        }
        console.log("✅ Insert success:", data);
        alert("Data berhasil ditambahkan!");
      } else if (mode === "edit") {
        const { error } = await supabase.from(tableName).update(insertData).eq("id", item.id);
        if (error) {
          console.error("❌ Update error:", error);
          throw error;
        }
        alert("Data berhasil diupdate!");
      }
      onSuccess();
    } catch (error) {
      console.error("💥 Save error:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = false;

  const getTitle = () => {
    const tabLabel = {
      dosen: "Dosen",
      angkatan: "Angkatan",
      matakuliah: "Mata Kuliah",
      ruangan: "Ruangan"
    }[activeTab];
    if (mode === "create") return `Tambah ${tabLabel}`;
    if (mode === "edit") return `Edit ${tabLabel}`;
    return "";
  };

  const renderFields = () => {
    switch (activeTab) {
      case "dosen":
        return (
          <>
            <FormField label="Nama Dosen" name="nama_dosen" value={formData.nama_dosen || ""} onChange={handleChange} disabled={isReadOnly} required />
            <FormField label="NIP" name="nip" value={formData.nip || ""} onChange={handleChange} disabled={isReadOnly} />
            <FormField label="Email" name="email" type="email" value={formData.email || ""} onChange={handleChange} disabled={isReadOnly} />
            <FormField label="Telepon" name="telepon" value={formData.telepon || ""} onChange={handleChange} disabled={isReadOnly} />
          </>
        );
      case "angkatan":
        return (
          <>
            <FormField label="Nama Angkatan" name="nama_angkatan" value={formData.nama_angkatan || ""} onChange={handleChange} disabled={isReadOnly} required />
            <FormField label="Jumlah Mahasiswa" name="jumlah_mahasiswa" type="number" value={formData.jumlah_mahasiswa || ""} onChange={handleChange} disabled={isReadOnly} required />
          </>
        );
      case "matakuliah":
        return (
          <>
            <FormField label="Kode Mata Kuliah" name="kode_mata_kuliah" value={formData.kode_mata_kuliah || ""} onChange={handleChange} disabled={isReadOnly} required />
            <FormField label="Mata Kuliah" name="mata_kuliah" value={formData.mata_kuliah || ""} onChange={handleChange} disabled={isReadOnly} required />
          </>
        );
      case "ruangan":
        return (
          <>
            <FormField label="Nama Ruangan" name="nama_ruangan" value={formData.nama_ruangan || ""} onChange={handleChange} disabled={isReadOnly} required />
            <FormField label="Kapasitas" name="kapasitas_ruangan" type="number" value={formData.kapasitas_ruangan || ""} onChange={handleChange} disabled={isReadOnly} required />
            <FormField label="Gedung" name="gedung" value={formData.gedung || ""} onChange={handleChange} disabled={isReadOnly} required />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFields()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              {isReadOnly ? "Tutup" : "Batal"}
            </button>
            {!isReadOnly && (
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                {submitting ? "Menyimpan..." : mode === "create" ? "Tambah" : "Update"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Form Field Component
function FormField({ label, name, type = "text", value, onChange, disabled, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
        placeholder={
          name === "nama_dosen" ? "Masukan Nama Dosen":
          name === "nip" ? "Masukan NIP" : 
          name === "email" ? "Masukan Email" :
          name === "telepon" ? "Masukan Telepon" : 
          `Masukkan ${label.toLowerCase()}`}
      />
    </div>
  );
}
