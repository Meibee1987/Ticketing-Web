import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function UsersPage() {
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
  const currentUserTitle =
    activeTab === 'teknisi' ? 'Manajemen User Teknisi' : 'Manajemen User Dosen';

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            {currentUserTitle}
          </h2>
          {activeTab === 'dosen' && (
            <p className="text-sm text-slate-500 mt-1">
              Terintegrasi dengan Master Data Dosen - assign role ke dosen yang
              sudah terdaftar
            </p>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {activeTab === 'teknisi' ? '+ Tambah User' : '+ Assign Role Dosen'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded shadow">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('teknisi')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'teknisi'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              User Teknisi
            </button>
            <button
              onClick={() => setActiveTab('dosen')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dosen'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              User Dosen
            </button>
          </nav>
        </div>

        {/* Tabel User */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading...</div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Nama
                  </th>
                  {activeTab === 'dosen' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      NIP
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Email
                  </th>
                  {activeTab === 'dosen' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Telepon
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {currentUserList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'dosen' ? 8 : 6}
                      className="px-6 py-4 text-center text-sm text-slate-500"
                    >
                      {activeTab === 'dosen'
                        ? 'Belum ada dosen yang di-assign role. Klik "Assign Role Dosen" untuk memulai.'
                        : 'Belum ada data user'}
                    </td>
                  </tr>
                ) : (
                  currentUserList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {activeTab === 'teknisi'
                          ? user.nama_teknisi
                          : user.nama_dosen}
                      </td>
                      {activeTab === 'dosen' && (
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {user.nip || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {user.email || '-'}
                      </td>
                      {activeTab === 'dosen' && (
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {user.telepon || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {user.roles?.role || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.auth_id ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            ✅ Sudah Login
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                            ⏳ Belum Login
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          {activeTab === 'dosen' ? 'Hapus Role' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Add/Edit User */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {activeTab === 'teknisi'
                  ? modalMode === 'edit'
                    ? 'Edit User Teknisi'
                    : 'Tambah User Teknisi'
                  : modalMode === 'edit'
                    ? 'Edit Role Dosen'
                    : 'Assign Role ke Dosen'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'teknisi' ? (
                // === FORM TEKNISI ===
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                      className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                      className={`border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        modalMode === 'edit' && form.auth_id
                          ? 'bg-slate-100 cursor-not-allowed'
                          : ''
                      }`}
                    />
                    {modalMode === 'edit' && form.auth_id ? (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Email tidak dapat diubah karena user sudah login
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">
                        User akan login menggunakan OTP
                      </p>
                    )}
                  </div>
                </>
              ) : (
                // === FORM DOSEN (Terintegrasi Master Data) ===
                <>
                  {modalMode === 'add' ? (
                    // Dropdown pilih dosen dari Master Data
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pilih Dosen dari Master Data{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.dosen_id}
                        onChange={(e) => handleSelectDosen(e.target.value)}
                        required
                        className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Pilih Dosen --</option>
                        {masterDosenList.length === 0 ? (
                          <option value="" disabled>
                            Semua dosen sudah punya role
                          </option>
                        ) : (
                          masterDosenList.map((dosen) => (
                            <option key={dosen.id} value={dosen.id}>
                              {dosen.nama_dosen}{' '}
                              {dosen.nip ? `(${dosen.nip})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      {masterDosenList.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Semua dosen sudah di-assign role. Tambah dosen baru
                          di Master Data.
                        </p>
                      )}
                    </div>
                  ) : (
                    // Edit mode: tampilkan info dosen (readonly)
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nama Dosen
                      </label>
                      <input
                        type="text"
                        value={form.nama}
                        disabled
                        className="border border-slate-300 px-3 py-2 w-full rounded bg-slate-100 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Data dosen hanya bisa diubah di Master Data
                      </p>
                    </div>
                  )}

                  {/* Preview info dosen yang dipilih */}
                  {form.dosen_id && modalMode === 'add' && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        📋 Info Dosen Terpilih:
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
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

                  {/* Info email untuk edit mode */}
                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        disabled
                        className="border border-slate-300 px-3 py-2 w-full rounded bg-slate-100 cursor-not-allowed"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Role dropdown (untuk semua) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.roles_id}
                  onChange={(e) =>
                    setForm({ ...form, roles_id: e.target.value })
                  }
                  required={activeTab === 'dosen'}
                  className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Role --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                >
                  {saving
                    ? 'Menyimpan...'
                    : modalMode === 'edit'
                      ? 'Update'
                      : activeTab === 'dosen'
                        ? 'Assign Role'
                        : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
