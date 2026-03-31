import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function UsersPage() {
  // Get current user role
  const { userRole } = useAuth();
  // Tab state
  const [activeTab, setActiveTab] = useState('teknisi'); // 'teknisi' or 'dosen'

  const [teknisiList, setTeknisiList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [masterDosenList, setMasterDosenList] = useState([]); // Dosen dari Master Data yang belum punya role
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [form, setForm] = useState({
    nama: '',
    email: '',
    roles_id: '',
    auth_id: null,
    dosen_id: '', // untuk pilih dosen dari master data
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeknisi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Teknisi')
      .select(
        `id, email, nama_teknisi, auth_id, roles_id, roles:roles_id(id, role)`
      )
      .order('id', { ascending: true });
    if (!error && data) setTeknisiList(data);
    setLoading(false);
  };

  // Fetch dosen yang sudah punya role (dari tabel dosen dengan roles_id)
  const fetchDosen = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dosen')
      .select(
        `id, nama_dosen, nip, email, telepon, auth_id, roles_id, aktif_nonaktif, roles:roles_id(id, role)`
      )
      .not('roles_id', 'is', null) // Hanya yang sudah punya role
      .order('id', { ascending: true });
    if (!error && data) setDosenList(data);
    setLoading(false);
  };

  // Fetch dosen dari Master Data yang BELUM punya role (untuk dropdown tambah user)
  const fetchMasterDosen = async () => {
    try {
      // Pertama, ambil semua dosen tanpa filter
      const { data, error } = await supabase
        .from('dosen')
        .select('*')
        .order('nama_dosen', { ascending: true });

      console.log('=== DEBUG FETCH MASTER DOSEN ===');
      console.log('Raw data from dosen table:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Error fetching master dosen:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No dosen found in database!');
        setMasterDosenList([]);
        return;
      }

      // Cek struktur kolom yang ada
      console.log('Columns in dosen table:', Object.keys(data[0]));
      console.log('Sample dosen data:', data[0]);

      // Filter yang belum punya role (roles_id null/undefined) dan aktif
      const availableDosen = data.filter((d) => {
        const hasNoRole = d.roles_id === null || d.roles_id === undefined;
        // Cek aktif dengan berbagai kemungkinan nilai
        const isActive =
          d.aktif_nonaktif === true ||
          d.aktif_nonaktif === 'true' ||
          d.aktif_nonaktif === 'Aktif' ||
          d.aktif_nonaktif === 'aktif' ||
          d.aktif_nonaktif === 1;

        console.log(
          `Dosen: ${d.nama_dosen}, roles_id: ${d.roles_id}, aktif: ${d.aktif_nonaktif}, hasNoRole: ${hasNoRole}, isActive: ${isActive}`
        );

        return hasNoRole && isActive;
      });

      console.log('Available dosen (filtered):', availableDosen);
      setMasterDosenList(availableDosen);
    } catch (err) {
      console.error('Exception in fetchMasterDosen:', err);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, role')
      .order('id', { ascending: true });
    if (!error && data) setRoles(data);
  };

  useEffect(() => {
    fetchTeknisi();
    fetchDosen();
    fetchMasterDosen();
    fetchRoles();
  }, []);

  // === MODAL HANDLERS ===
  const openAddModal = () => {
    setModalMode('add');
    setForm({ nama: '', email: '', roles_id: '', auth_id: null, dosen_id: '' });
    setEditId(null);
    setError(null);
    setModalOpen(true);
    // Refresh master dosen list saat buka modal
    if (activeTab === 'dosen') {
      fetchMasterDosen();
    }
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    if (activeTab === 'teknisi') {
      setForm({
        nama: user.nama_teknisi || '',
        email: user.email || '',
        roles_id: user.roles_id || '',
        auth_id: user.auth_id || null,
        dosen_id: '',
      });
    } else {
      // Dosen - data sudah dari master data
      setForm({
        nama: user.nama_dosen || '',
        email: user.email || '',
        roles_id: user.roles_id || '',
        auth_id: user.auth_id || null,
        dosen_id: user.id,
      });
    }
    setEditId(user.id);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ nama: '', email: '', roles_id: '', auth_id: null, dosen_id: '' });
    setEditId(null);
    setError(null);
  };

  // Handle pilih dosen dari dropdown
  const handleSelectDosen = (dosenId) => {
    const selectedDosen = masterDosenList.find(
      (d) => d.id === parseInt(dosenId)
    );
    if (selectedDosen) {
      setForm({
        ...form,
        dosen_id: dosenId,
        nama: selectedDosen.nama_dosen,
        email: selectedDosen.email || '',
      });
    } else {
      setForm({
        ...form,
        dosen_id: '',
        nama: '',
        email: '',
      });
    }
  };

  // === CRUD HANDLERS ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (activeTab === 'teknisi') {
        // === TEKNISI LOGIC (tetap sama) ===
        const tableName = 'Teknisi';
        const nameField = 'nama_teknisi';

        if (modalMode === 'add') {
          if (!form.email || !form.email.includes('@')) {
            throw new Error('Email tidak valid');
          }

          const { data: existing } = await supabase
            .from(tableName)
            .select('id')
            .eq('email', form.email)
            .single();

          if (existing) {
            throw new Error('Email sudah terdaftar');
          }

          const insertData = {
            [nameField]: form.nama,
            email: form.email,
            roles_id: form.roles_id ? parseInt(form.roles_id) : null,
          };

          const { error: insertError } = await supabase
            .from(tableName)
            .insert([insertData]);

          if (insertError) throw insertError;
          alert('User berhasil ditambahkan! User bisa login dengan OTP.');
        } else {
          const updateData = {
            [nameField]: form.nama,
            roles_id: form.roles_id ? parseInt(form.roles_id) : null,
          };

          if (!form.auth_id) {
            if (!form.email || !form.email.includes('@')) {
              throw new Error('Email tidak valid');
            }

            const { data: existing } = await supabase
              .from(tableName)
              .select('id')
              .eq('email', form.email)
              .neq('id', editId)
              .single();

            if (existing) {
              throw new Error('Email sudah digunakan oleh user lain');
            }

            updateData.email = form.email;
          }

          const { error: updateError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', editId);

          if (updateError) throw updateError;
          alert('User berhasil diupdate!');
        }

        fetchTeknisi();
      } else {
        // === DOSEN LOGIC (terintegrasi dengan Master Data) ===
        if (modalMode === 'add') {
          // Validasi: harus pilih dosen dari dropdown
          if (!form.dosen_id) {
            throw new Error('Pilih dosen dari daftar Master Data');
          }

          // Validasi: harus pilih role
          if (!form.roles_id) {
            throw new Error('Pilih role untuk dosen');
          }

          // Update tabel dosen di Master Data dengan roles_id
          const { error: updateError } = await supabase
            .from('dosen')
            .update({ roles_id: parseInt(form.roles_id) })
            .eq('id', parseInt(form.dosen_id));

          if (updateError) throw updateError;
          alert(
            'Role berhasil di-assign ke dosen! Dosen bisa login dengan OTP.'
          );
        } else {
          // Edit: hanya update role
          if (!form.roles_id) {
            throw new Error('Pilih role untuk dosen');
          }

          const { error: updateError } = await supabase
            .from('dosen')
            .update({ roles_id: parseInt(form.roles_id) })
            .eq('id', editId);

          if (updateError) throw updateError;
          alert('Role dosen berhasil diupdate!');
        }

        fetchDosen();
        fetchMasterDosen(); // Refresh list dosen yang belum punya role
      }

      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (activeTab === 'teknisi') {
      if (!confirm('Yakin ingin menghapus user teknisi ini?')) return;

      try {
        const { data: user } = await supabase
          .from('Teknisi')
          .select('auth_id')
          .eq('id', id)
          .single();

        const { error } = await supabase.from('Teknisi').delete().eq('id', id);
        if (error) throw error;

        if (user?.auth_id) {
          try {
            const { error: authError } = await supabase.auth.admin.deleteUser(
              user.auth_id
            );
            if (authError) {
              console.warn(
                'Warning: Could not delete from Auth:',
                authError.message
              );
            }
          } catch (authErr) {
            console.warn('Warning: Could not delete from Auth:', authErr);
          }
        }

        alert('User berhasil dihapus!');
        fetchTeknisi();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    } else {
      // Dosen: hanya hapus role, tidak hapus data dari master
      if (
        !confirm(
          'Yakin ingin menghapus role dari dosen ini?\n\nNote: Data dosen di Master Data tetap tersimpan.'
        )
      )
        return;

      try {
        // Hapus auth_id dan roles_id saja, data dosen tetap di master
        const { error } = await supabase
          .from('dosen')
          .update({ roles_id: null, auth_id: null })
          .eq('id', id);

        if (error) throw error;

        alert(
          'Role dosen berhasil dihapus! Data dosen tetap tersimpan di Master Data.'
        );
        fetchDosen();
        fetchMasterDosen();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Get current user list based on active tab
  const currentUserList = activeTab === 'teknisi' ? teknisiList : dosenList;

  // Role badge color helper
  const getRoleBadge = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r === 'super admin' || r === 'super_admin')
      return 'bg-purple-100 text-purple-700';
    if (r === 'admin') return 'bg-blue-100 text-blue-700';
    if (r === 'dosen') return 'bg-indigo-100 text-indigo-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
          👥 Manajemen Users
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Kelola user Teknisi dan Dosen beserta hak akses role mereka.
        </p>
      </header>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tab + Tombol Tambah */}
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between px-4">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { key: 'teknisi', label: 'User Teknisi', icon: '🔧' },
                { key: 'dosen', label: 'User Dosen', icon: '🎓' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.key === 'teknisi'
                      ? teknisiList.length
                      : dosenList.length}
                  </span>
                </button>
              ))}
            </nav>
            <button
              onClick={openAddModal}
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
              {activeTab === 'teknisi' ? 'Tambah User' : 'Assign Role Dosen'}
            </button>
          </div>
        </div>

        {/* Info banner untuk tab dosen */}
        {activeTab === 'dosen' && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 text-sm text-indigo-700">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
              />
            </svg>
            Terintegrasi dengan Master Data Dosen — assign role ke dosen yang
            sudah terdaftar
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500">Memuat data...</p>
            </div>
          ) : currentUserList.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-3xl mb-3">
                {activeTab === 'teknisi' ? '🔧' : '🎓'}
              </p>
              <p className="text-sm text-slate-500">
                {activeTab === 'dosen'
                  ? 'Belum ada dosen yang di-assign role.'
                  : 'Belum ada data user teknisi.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nama
                  </th>
                  {activeTab === 'dosen' && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      NIP
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  {activeTab === 'dosen' && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Telepon
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentUserList.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {activeTab === 'teknisi'
                        ? user.nama_teknisi
                        : user.nama_dosen}
                    </td>
                    {activeTab === 'dosen' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.nip || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.email || '-'}
                    </td>
                    {activeTab === 'dosen' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.telepon || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.roles?.role)}`}
                      >
                        {user.roles?.role || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.auth_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          ✅ Sudah Login
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          ⏳ Belum Login
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                          {activeTab === 'dosen' ? 'Hapus Role' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {currentUserList.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Menampilkan {currentUserList.length}{' '}
              {activeTab === 'teknisi' ? 'user teknisi' : 'user dosen'}
            </span>
          </div>
        )}
      </div>

      {/* Modal Add/Edit User */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {activeTab === 'teknisi'
                    ? modalMode === 'edit'
                      ? '✏️ Edit User Teknisi'
                      : '➕ Tambah User Teknisi'
                    : modalMode === 'edit'
                      ? '✏️ Edit Role Dosen'
                      : '🎓 Assign Role ke Dosen'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'teknisi'
                    ? 'User login menggunakan OTP email'
                    : 'Data dosen dari Master Data'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
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

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'teknisi' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nama Teknisi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) =>
                        setForm({ ...form, nama: e.target.value })
                      }
                      placeholder="Masukkan nama"
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="email@example.com"
                      required
                      disabled={modalMode === 'edit' && form.auth_id}
                      className={`w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        modalMode === 'edit' && form.auth_id
                          ? 'bg-slate-100 cursor-not-allowed text-slate-500'
                          : ''
                      }`}
                    />
                    {modalMode === 'edit' && form.auth_id ? (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        ⚠️ Email tidak dapat diubah karena user sudah login
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1.5">
                        User akan login menggunakan OTP
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {modalMode === 'add' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Pilih Dosen dari Master Data{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.dosen_id}
                        onChange={(e) => handleSelectDosen(e.target.value)}
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Pilih Dosen --</option>
                        {masterDosenList.length === 0 ? (
                          <option value="" disabled>
                            Semua dosen sudah punya role
                          </option>
                        ) : (
                          masterDosenList.map((dosen) => (
                            <option key={dosen.id} value={dosen.id}>
                              {dosen.nama_dosen}
                              {dosen.nip ? ` (${dosen.nip})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      {masterDosenList.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1.5">
                          ⚠️ Semua dosen sudah di-assign role. Tambah dosen baru
                          di Master Data.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nama Dosen
                      </label>
                      <input
                        type="text"
                        value={form.nama}
                        disabled
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-100 cursor-not-allowed text-slate-500"
                      />
                      <p className="text-xs text-slate-400 mt-1.5">
                        Data dosen hanya bisa diubah di Master Data
                      </p>
                    </div>
                  )}

                  {form.dosen_id && modalMode === 'add' && (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        📋 Info Dosen Terpilih
                      </p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>
                          <strong>Nama:</strong> {form.nama}
                        </p>
                        <p>
                          <strong>Email:</strong> {form.email || '-'}
                        </p>
                        {masterDosenList.find(
                          (d) => d.id === parseInt(form.dosen_id)
                        )?.nip && (
                          <p>
                            <strong>NIP:</strong>{' '}
                            {
                              masterDosenList.find(
                                (d) => d.id === parseInt(form.dosen_id)
                              )?.nip
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        disabled
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-100 cursor-not-allowed text-slate-500"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Role dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.roles_id}
                  onChange={(e) =>
                    setForm({ ...form, roles_id: e.target.value })
                  }
                  required={activeTab === 'dosen'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Pilih Role --</option>
                  {roles
                    .filter((role) => {
                      if (userRole?.roleName === 'super_admin') return true;
                      if (userRole?.roleName === 'admin')
                        return role.role === 'user' || role.role === 'dosen';
                      return true;
                    })
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role}
                      </option>
                    ))}
                </select>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-red-500 mt-0.5">⚠️</span>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    (activeTab === 'dosen' &&
                      modalMode === 'add' &&
                      masterDosenList.length === 0)
                  }
                  className="px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? 'Menyimpan...'
                    : modalMode === 'edit'
                      ? 'Simpan Perubahan'
                      : activeTab === 'dosen'
                        ? 'Assign Role'
                        : 'Tambah User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
