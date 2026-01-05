import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function UsersPage() {
  const [teknisiList, setTeknisiList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [form, setForm] = useState({
    nama_teknisi: '',
    email: '',
    password: '',
    roles_id: '',
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeknisi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Teknisi')
      .select(`*, roles:roles_id(id, role)`)
      .order('id', { ascending: true });
    if (!error && data) setTeknisiList(data);
    setLoading(false);
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
    fetchRoles();
  }, []);

  // === MODAL HANDLERS ===
  const openAddModal = () => {
    setModalMode('add');
    setForm({ nama_teknisi: '', email: '', password: '', roles_id: '' });
    setEditId(null);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (teknisi) => {
    setModalMode('edit');
    setForm({
      nama_teknisi: teknisi.nama_teknisi || '',
      email: '',
      password: '',
      roles_id: teknisi.roles_id || '',
    });
    setEditId(teknisi.id);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ nama_teknisi: '', email: '', password: '', roles_id: '' });
    setEditId(null);
    setError(null);
  };

  // === CRUD HANDLERS ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (modalMode === 'add') {
        // Step 1: Create user dengan auth.signUp (auto confirm, no email verification)
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: form.email,
            password: form.password,
            options: {
              emailRedirectTo: undefined,
              data: {
                email_confirmed: true,
              },
            },
          }
        );

        if (authError) throw authError;

        // Step 2: Insert ke tabel Teknisi
        const authId = authData.user?.id;
        const { error: insertError } = await supabase.from('Teknisi').insert([
          {
            nama_teknisi: form.nama_teknisi,
            auth_id: authId,
            roles_id: form.roles_id ? parseInt(form.roles_id) : null,
          },
        ]);

        if (insertError) throw insertError;
        alert('User berhasil ditambahkan!');
      } else {
        // Update teknisi (tanpa update auth)
        const { error: updateError } = await supabase
          .from('Teknisi')
          .update({
            nama_teknisi: form.nama_teknisi,
            roles_id: form.roles_id ? parseInt(form.roles_id) : null,
          })
          .eq('id', editId);

        if (updateError) throw updateError;
        alert('User berhasil diupdate!');
      }

      closeModal();
      fetchTeknisi();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    try {
      const { error } = await supabase.from('Teknisi').delete().eq('id', id);
      if (error) throw error;
      alert('User berhasil dihapus!');
      fetchTeknisi();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800">
          Manajemen User Teknisi
        </h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Tambah User
        </button>
      </div>

      {/* Tabel User Teknisi */}
      <div className="bg-white rounded shadow">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Auth ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {teknisiList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-4 text-center text-sm text-slate-500"
                    >
                      Belum ada data user
                    </td>
                  </tr>
                ) : (
                  teknisiList.map((teknisi) => (
                    <tr key={teknisi.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {teknisi.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {teknisi.nama_teknisi}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {teknisi.roles?.role || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {teknisi.auth_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => openEditModal(teknisi)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(teknisi.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
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
                {modalMode === 'edit' ? 'Edit User' : 'Tambah User Baru'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Teknisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nama_teknisi}
                  onChange={(e) =>
                    setForm({ ...form, nama_teknisi: e.target.value })
                  }
                  placeholder="Masukkan nama"
                  required
                  className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalMode === 'add' && (
                <>
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
                      className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="border border-slate-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={form.roles_id}
                  onChange={(e) =>
                    setForm({ ...form, roles_id: e.target.value })
                  }
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
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                >
                  {saving
                    ? 'Menyimpan...'
                    : modalMode === 'edit'
                      ? 'Update'
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
