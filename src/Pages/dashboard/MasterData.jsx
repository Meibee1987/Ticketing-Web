import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  CalendarRange,
  GraduationCap,
  LibraryBig,
  Plus,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
// 🎯 Import komponen reusable
import SearchBar from '../../components/SearchBar';
import ActionButtons from '../../components/ActionButtons';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatePanel from '../../components/ui/StatePanel';

const ITEMS_PER_PAGE = 10;
const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);
const TAB_ICONS = {
  dosen: GraduationCap,
  angkatan: CalendarRange,
  matakuliah: LibraryBig,
  ruangan: Building2,
};

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
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create, edit, view
  const [selectedItem, setSelectedItem] = useState(null);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dosen': {
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
        }
        case 'angkatan': {
          const { data: angkatanData, error: angkatanError } = await supabase
            .from('angkatan')
            .select('*')
            .order('id', { ascending: true });
          if (angkatanError) throw angkatanError;
          setAngkatan(angkatanData || []);
          break;
        }
        case 'matakuliah': {
          const { data: mkData, error: mkError } = await supabase
            .from('mata_kuliah')
            .select('*')
            .order('id', { ascending: true });
          if (mkError) throw mkError;
          setMataKuliah(mkData || []);
          break;
        }
        case 'ruangan': {
          const { data: ruanganData, error: ruanganError } = await supabase
            .from('ruangan')
            .select('*')
            .order('id', { ascending: true });
          if (ruanganError) throw ruanganError;
          setRuangan(ruanganData || []);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Gagal mengambil data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (hasOwn(item, 'aktif_nonaktif')) {
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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const firstItemIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(
    firstItemIndex,
    firstItemIndex + ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const tabs = [
    { id: 'dosen', label: 'Dosen' },
    { id: 'angkatan', label: 'Angkatan' },
    { id: 'matakuliah', label: 'Mata Kuliah' },
    { id: 'ruangan', label: 'Ruangan' },
  ];

  return (
    <div className="ui-page">
      {/* Page Header */}
      <PageHeader
        title="Kelola Data Akademik"
        description="Kelola data dosen, angkatan, mata kuliah, dan ruangan dalam satu tempat."
      />

      {/* Tabs */}
      <div className="ui-card overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-0">
            <nav className="overflow-x-auto" aria-label="Kategori master data">
              <div className="ui-tabs" role="tablist">
                {tabs.map((tab) => {
                  const Icon = TAB_ICONS[tab.id];
                  const tabIsActive = activeTab === tab.id;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchInput('');
                        setSearchQuery('');
                        setStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      className={`ui-tab ${tabIsActive ? 'is-active' : ''}`}
                      role="tab"
                      aria-selected={tabIsActive}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
            {/* Tombol CRUD di kanan sejajar tab */}
            <button
              type="button"
              onClick={() => {
                setShowModal(true);
                setModalMode('create');
                setSelectedItem(null);
              }}
              className="ui-button ui-button-primary w-full sm:w-auto"
            >
              <Plus size={16} aria-hidden="true" />
              Tambah {tabs.find((t) => t.id === activeTab)?.label}
            </button>
          </div>
        </div>

        {/* 🎯 Search dengan Dropdown Filter Status */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Dropdown Filter Status */}
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="ui-field w-full bg-white sm:w-auto"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>

            {/* Search Bar */}
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={() => {
                setSearchQuery(searchInput);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchInput('');
                setSearchQuery('');
                setCurrentPage(1);
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
            <StatePanel
              type="loading"
              title="Memuat master data"
              className="m-4"
            />
          ) : filteredData.length === 0 ? (
            <StatePanel
              type={searchQuery ? 'search' : 'empty'}
              title={`Tidak ada data ${tabs.find((t) => t.id === activeTab)?.label}`}
              className="m-4"
            />
          ) : (
            <DataTable
              activeTab={activeTab}
              data={paginatedData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-600">
              Menampilkan{' '}
              {filteredData.length === 0 ? 0 : firstItemIndex + 1}–
              {Math.min(firstItemIndex + ITEMS_PER_PAGE, filteredData.length)} dari{' '}
              {filteredData.length} data
            </span>
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
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
      data.length > 0 && hasOwn(data[0], 'aktif_nonaktif');

    switch (activeTab) {
      case 'dosen':
        return [
          { key: 'id', label: 'ID' },
          { key: 'nama_dosen', label: 'Nama Dosen' },
          { key: 'id_dosen', label: 'ID Dosen' },
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
          { key: 'strata', label: 'Strata' },
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
          { key: 'kode_ruangan', label: 'Kode Ruangan' },
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
                      ? 'Aktif'
                      : item[col.key] === false
                        ? 'Non-Aktif'
                        : 'Belum diset'}
                  </span>
                ) : col.type === 'role' ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item[col.key]
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item[col.key] || 'Belum ada role'}
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
            id_dosen: '',
            email: '',
            telepon: '',
            roles_id: '',
          });
          break;
        case 'angkatan':
          setFormData({ nama_angkatan: '', strata: '', jumlah_mahasiswa: '' });
          break;
        case 'matakuliah':
          setFormData({ kode_mata_kuliah: '', mata_kuliah: '' });
          break;
        case 'ruangan':
          setFormData({
            kode_ruangan: '',
            nama_ruangan: '',
            kapasitas_ruangan: '',
            gedung: '',
          });
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
      const rawData = { ...formData };
      delete rawData.id;
      delete rawData.created_at;

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
              label="ID Dosen"
              name="id_dosen"
              value={formData.id_dosen || ''}
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
                aria-label="Role dosen"
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
            {(hasOwn(item || {}, 'aktif_nonaktif') ||
              hasOwn(formData, 'aktif_nonaktif')) && (
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
              label="Strata"
              name="strata"
              value={formData.strata || ''}
              onChange={handleChange}
              disabled={isReadOnly}
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
            {(hasOwn(item || {}, 'aktif_nonaktif') ||
              hasOwn(formData, 'aktif_nonaktif')) && (
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
            {(hasOwn(item || {}, 'aktif_nonaktif') ||
              hasOwn(formData, 'aktif_nonaktif')) && (
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
              label="Kode Ruangan"
              name="kode_ruangan"
              value={formData.kode_ruangan || ''}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="Contoh: SBA001"
            />
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
            {(hasOwn(item || {}, 'aktif_nonaktif') ||
              hasOwn(formData, 'aktif_nonaktif')) && (
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={getTitle()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="ui-section-title">{getTitle()}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup modal"
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
              className="ui-button ui-button-secondary"
            >
              {isReadOnly ? 'Tutup' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="ui-button ui-button-primary disabled:opacity-50"
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
      <label
        htmlFor={`master-field-${name}`}
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={`master-field-${name}`}
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
            : name === 'id_dosen'
              ? 'Masukan ID_Dosen'
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
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? 'Aktif' : 'Non-Aktif'}`}
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
        className={`master-status-label text-sm font-medium ${checked ? 'text-green-600' : 'text-red-600'}`}
        data-status={checked ? 'Aktif' : 'Non-Aktif'}
      >
        {checked ? 'Aktif' : 'Non-Aktif'}
      </span>
    </div>
  );
}
