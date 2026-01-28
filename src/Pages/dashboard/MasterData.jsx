import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
// 🎯 Import komponen reusable
import SearchBar from '../../components/SearchBar';
import ActionButtons from '../../components/ActionButtons';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('dosen');

  // State untuk masing-masing tabel
  const [dosen, setDosen] = useState([]);
  const [angkatan, setAngkatan] = useState([]);
  const [mataKuliah, setMataKuliah] = useState([]);
  const [ruangan, setRuangan] = useState([]);
  const [roles, setRoles] = useState([]); // Untuk dropdown role dosen

  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, aktif, nonaktif

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create, edit, view
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch data saat component mount atau tab berubah
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Fetch roles untuk dropdown (hanya sekali saat mount)
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        // Filter hanya role dosen dan user untuk Master Data
        const filteredRoles = data.filter(
          (role) => role.role === 'dosen' || role.role === 'user'
        );
        setRoles(filteredRoles);
      }
    };
    fetchRoles();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dosen':
          // Join dengan tabel roles untuk mendapatkan nama role
          const { data: dosenData, error: dosenError } = await supabase
            .from('dosen')
            .select('*, roles(role)')
            .order('id', { ascending: true });
          if (dosenError) throw dosenError;
          // Map data untuk menambahkan role_name dari join
          const dosenWithRole = (dosenData || []).map((d) => ({
            ...d,
            role_name: d.roles?.role || null,
          }));
          setDosen(dosenWithRole);
          break;
        case 'angkatan':
          const { data: angkatanData, error: angkatanError } = await supabase
            .from('angkatan')
            .select('*')
            .order('id', { ascending: true });
          if (angkatanError) throw angkatanError;
          setAngkatan(angkatanData || []);
          break;
        case 'matakuliah':
          const { data: mkData, error: mkError } = await supabase
            .from('mata_kuliah')
            .select('*')
            .order('id', { ascending: true });
          if (mkError) throw mkError;
          setMataKuliah(mkData || []);
          break;
        case 'ruangan':
          const { data: ruanganData, error: ruanganError } = await supabase
            .from('ruangan')
            .select('*')
            .order('id', { ascending: true });
          if (ruanganError) throw ruanganError;
          setRuangan(ruanganData || []);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Gagal mengambil data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const tableName = activeTab === 'matakuliah' ? 'mata_kuliah' : activeTab;
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      alert('Data berhasil dihapus!');
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Gagal menghapus: ' + error.message);
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
      case 'dosen':
        return dosen;
      case 'angkatan':
        return angkatan;
      case 'matakuliah':
        return mataKuliah;
      case 'ruangan':
        return ruangan;
      default:
        return [];
    }
  };

  // Filter data based on search and status
  const filteredData = getCurrentData().filter((item) => {
    // Filter by status (skip if column doesn't exist)
    if (item.hasOwnProperty('aktif_nonaktif')) {
      if (statusFilter === 'aktif' && item.aktif_nonaktif !== true)
        return false;
      if (statusFilter === 'nonaktif' && item.aktif_nonaktif !== false)
        return false;
    }

    // Filter by search
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(item).some(
      (val) => val && val.toString().toLowerCase().includes(searchLower)
    );
  });

  const tabs = [
    { id: 'dosen', label: 'Dosen', icon: '👨‍🏫' },
    { id: 'angkatan', label: 'Angkatan', icon: '📅' },
    { id: 'matakuliah', label: 'Mata Kuliah', icon: '📚' },
    { id: 'ruangan', label: 'Ruangan', icon: '🏢' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
        <p className="text-slate-600">
          Kelola data master: Dosen, Angkatan, Mata Kuliah, dan Ruangan
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between px-4">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchInput('');
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            {/* Tombol CRUD di kanan sejajar tab */}
            <button
              onClick={() => {
                setShowModal(true);
                setModalMode('create');
                setSelectedItem(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah {tabs.find((t) => t.id === activeTab)?.label}
            </button>
          </div>
        </div>

        {/* 🎯 Search dengan Dropdown Filter Status */}
        <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {/* Dropdown Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">✅ Aktif</option>
              <option value="nonaktif">❌ Non-Aktif</option>
            </select>

            {/* Search Bar */}
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={() => setSearchQuery(searchInput)}
              onClear={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              placeholder={
                activeTab === 'ruangan'
                  ? 'Cari nama ruangan...'
                  : activeTab === 'dosen'
                    ? 'Cari nama dosen...'
                    : activeTab === 'angkatan'
                      ? 'Cari nama angkatan...'
                      : `Cari ${tabs.find((t) => t.id === activeTab)?.label}...`
              }
              showClear={!!searchInput}
            />
          </div>
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
              <p className="text-slate-600">
                Tidak ada data {tabs.find((t) => t.id === activeTab)?.label}
              </p>
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
            Menampilkan {filteredData.length} dari {getCurrentData().length}{' '}
            data
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
          roles={roles}
        />
      )}
    </div>
  );
}

// Data Table Component
function DataTable({ activeTab, data, onEdit, onDelete }) {
  const getColumns = () => {
    // Check if any data has aktif_nonaktif column
    const hasStatusColumn =
      data.length > 0 && data[0].hasOwnProperty('aktif_nonaktif');

    switch (activeTab) {
      case 'dosen':
        return [
          { key: 'id', label: 'ID' },
          { key: 'nama_dosen', label: 'Nama Dosen' },
          { key: 'nip', label: 'NIP' },
          { key: 'email', label: 'Email' },
          { key: 'telepon', label: 'Telepon' },
          { key: 'role_name', label: 'Role', type: 'role' },
          ...(hasStatusColumn
            ? [{ key: 'aktif_nonaktif', label: 'Status', type: 'status' }]
            : []),
        ];
      case 'angkatan':
        return [
          { key: 'id', label: 'ID' },
          { key: 'nama_angkatan', label: 'Nama Angkatan' },
          { key: 'jumlah_mahasiswa', label: 'Jumlah Mahasiswa' },
          ...(hasStatusColumn
            ? [{ key: 'aktif_nonaktif', label: 'Status', type: 'status' }]
            : []),
        ];
      case 'matakuliah':
        return [
          { key: 'id', label: 'ID' },
          { key: 'kode_mata_kuliah', label: 'Kode Mata Kuliah' },
          { key: 'mata_kuliah', label: 'Mata Kuliah' },
          ...(hasStatusColumn
            ? [{ key: 'aktif_nonaktif', label: 'Status', type: 'status' }]
            : []),
        ];
      case 'ruangan':
        return [
          { key: 'id', label: 'ID' },
          { key: 'nama_ruangan', label: 'Nama Ruangan' },
          { key: 'kapasitas_ruangan', label: 'Kapasitas' },
          { key: 'gedung', label: 'Gedung' },
          ...(hasStatusColumn
            ? [{ key: 'aktif_nonaktif', label: 'Status', type: 'status' }]
            : []),
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
            <th
              key={col.key}
              className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase"
            >
              {col.label}
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
            Aksi
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {data.map((item) => (
          <tr key={item.id} className="hover:bg-slate-50">
            {columns.map((col) => (
              <td key={col.key} className="px-6 py-4 text-sm text-slate-700">
                {col.type === 'status' ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item[col.key] === true
                        ? 'bg-green-100 text-green-800'
                        : item[col.key] === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item[col.key] === true
                      ? '✅ Aktif'
                      : item[col.key] === false
                        ? '❌ Non-Aktif'
                        : '⚪ Belum diset'}
                  </span>
                ) : col.type === 'role' ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item[col.key]
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item[col.key] || '⚪ Belum ada role'}
                  </span>
                ) : (
                  item[col.key] || '-'
                )}
              </td>
            ))}
            <td className="px-6 py-4">
              {/* 🎯 Menggunakan komponen ActionButtons yang reusable */}
              <ActionButtons onEdit={onEdit} onDelete={onDelete} row={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Modal Component
function DataModal({ activeTab, mode, item, onClose, onSuccess, roles = [] }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Default form data based on active tab (aktif_nonaktif only if supported)
      switch (activeTab) {
        case 'dosen':
          setFormData({
            nama_dosen: '',
            nip: '',
            email: '',
            telepon: '',
            roles_id: '',
          });
          break;
        case 'angkatan':
          setFormData({ nama_angkatan: '', jumlah_mahasiswa: '' });
          break;
        case 'matakuliah':
          setFormData({ kode_mata_kuliah: '', mata_kuliah: '' });
          break;
        case 'ruangan':
          setFormData({ nama_ruangan: '', kapasitas_ruangan: '', gedung: '' });
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
    if (mode === 'view') return;

    try {
      setSubmitting(true);
      const tableName = activeTab === 'matakuliah' ? 'mata_kuliah' : activeTab;

      // Remove id, created_at, and empty string values from formData
      const { id, created_at, ...rawData } = formData;

      // Filter out empty strings and ensure id is completely removed
      const cleanData = Object.entries(rawData).filter(([key, value]) => {
        // Exclude id field explicitly
        if (key === 'id') return false;
        // Exclude empty values
        return value !== '' && value !== null && value !== undefined;
      });

      // Convert to object and handle type conversions
      const insertData = Object.fromEntries(
        cleanData.map(([key, value]) => {
          // Convert number fields
          if (key === 'kapasitas_ruangan' || key === 'jumlah_mahasiswa') {
            const numValue = parseInt(value, 10);
            // Validate to ensure it's a valid number
            if (isNaN(numValue)) {
              throw new Error(
                `${key === 'kapasitas_ruangan' ? 'Kapasitas' : 'Jumlah Mahasiswa'} harus berupa angka yang valid`
              );
            }
            return [key, numValue];
          }
          // Convert roles_id to integer or null
          if (key === 'roles_id') {
            return [key, value ? parseInt(value, 10) : null];
          }
          // Convert boolean fields (handle if column doesn't exist yet)
          if (key === 'aktif_nonaktif') {
            return [key, value === true || value === 'true'];
          }
          return [key, value];
        })
      );

      // Hapus field 'roles' (hasil join) jika ada, karena bukan kolom asli
      delete insertData.roles;
      delete insertData.role_name;

      if (mode === 'create') {
        const { error } = await supabase.from(tableName).insert([insertData]);
        if (error) throw error;
      } else if (mode === 'edit') {
        const { error } = await supabase
          .from(tableName)
          .update(insertData)
          .eq('id', item.id);
        if (error) throw error;
      }

      // Close modal and refresh data
      onSuccess();
      alert(`Data berhasil ${mode === 'create' ? 'ditambahkan' : 'diupdate'}!`);
    } catch (error) {
      console.error('Save error:', error);
      alert('Gagal menyimpan: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = false;

  const getTitle = () => {
    const tabLabel = {
      dosen: 'Dosen',
      angkatan: 'Angkatan',
      matakuliah: 'Mata Kuliah',
      ruangan: 'Ruangan',
    }[activeTab];
    if (mode === 'create') return `Tambah ${tabLabel}`;
    if (mode === 'edit') return `Edit ${tabLabel}`;
    return '';
  };

  const renderFields = () => {
    switch (activeTab) {
      case 'dosen':
        return (
          <>
            <FormField
              label="Nama Dosen"
              name="nama_dosen"
              value={formData.nama_dosen || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            <FormField
              label="NIP"
              name="nip"
              value={formData.nip || ''}
              onChange={handleChange}
              disabled={isReadOnly}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              disabled={isReadOnly}
            />
            <FormField
              label="Telepon"
              name="telepon"
              value={formData.telepon || ''}
              onChange={handleChange}
              disabled={isReadOnly}
            />
            {/* Dropdown Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role (Akses Login)
              </label>
              <select
                name="roles_id"
                value={formData.roles_id || ''}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">
                  -- Tidak ada role (tidak bisa login) --
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Pilih role "dosen" agar dosen ini bisa login ke sistem
              </p>
            </div>
            {(item?.hasOwnProperty('aktif_nonaktif') ||
              formData.hasOwnProperty('aktif_nonaktif')) && (
              <StatusToggle
                label="Status"
                checked={formData.aktif_nonaktif ?? true}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, aktif_nonaktif: val }))
                }
                disabled={isReadOnly}
              />
            )}
          </>
        );
      case 'angkatan':
        return (
          <>
            <FormField
              label="Nama Angkatan"
              name="nama_angkatan"
              value={formData.nama_angkatan || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            <FormField
              label="Jumlah Mahasiswa"
              name="jumlah_mahasiswa"
              type="number"
              value={formData.jumlah_mahasiswa || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            {(item?.hasOwnProperty('aktif_nonaktif') ||
              formData.hasOwnProperty('aktif_nonaktif')) && (
              <StatusToggle
                label="Status"
                checked={formData.aktif_nonaktif ?? true}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, aktif_nonaktif: val }))
                }
                disabled={isReadOnly}
              />
            )}
          </>
        );
      case 'matakuliah':
        return (
          <>
            <FormField
              label="Kode Mata Kuliah"
              name="kode_mata_kuliah"
              value={formData.kode_mata_kuliah || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            <FormField
              label="Mata Kuliah"
              name="mata_kuliah"
              value={formData.mata_kuliah || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            {(item?.hasOwnProperty('aktif_nonaktif') ||
              formData.hasOwnProperty('aktif_nonaktif')) && (
              <StatusToggle
                label="Status"
                checked={formData.aktif_nonaktif ?? true}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, aktif_nonaktif: val }))
                }
                disabled={isReadOnly}
              />
            )}
          </>
        );
      case 'ruangan':
        return (
          <>
            <FormField
              label="Nama Ruangan"
              name="nama_ruangan"
              value={formData.nama_ruangan || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            <FormField
              label="Kapasitas"
              name="kapasitas_ruangan"
              type="number"
              value={formData.kapasitas_ruangan || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            <FormField
              label="Gedung"
              name="gedung"
              value={formData.gedung || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required
            />
            {(item?.hasOwnProperty('aktif_nonaktif') ||
              formData.hasOwnProperty('aktif_nonaktif')) && (
              <StatusToggle
                label="Status"
                checked={formData.aktif_nonaktif ?? true}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, aktif_nonaktif: val }))
                }
                disabled={isReadOnly}
              />
            )}
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
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFields()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {isReadOnly ? 'Tutup' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {submitting
                  ? 'Menyimpan...'
                  : mode === 'create'
                    ? 'Tambah'
                    : 'Update'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Form Field Component
function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  disabled,
  required,
}) {
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
          name === 'nama_dosen'
            ? 'Masukan Nama Dosen'
            : name === 'nip'
              ? 'Masukan NIP'
              : name === 'email'
                ? 'Masukan Email'
                : name === 'telepon'
                  ? 'Masukan Telepon'
                  : `Masukkan ${label.toLowerCase()}`
        }
      />
    </div>
  );
}

// Status Toggle Component
function StatusToggle({ label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${checked ? 'text-green-600' : 'text-red-600'}`}
      >
        {checked ? '✅ Aktif' : '❌ Non-Aktif'}
      </span>
    </div>
  );
}
