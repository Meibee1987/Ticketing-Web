/**
 * ================================================================================
 * FILE: JadwalPageAdmin.jsx
 * DESKRIPSI: Halaman manajemen jadwal dengan 3 tab terpisah dan filter tanggal
 * ================================================================================
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
// 🎯 Import komponen reusable dari folder components/
import SearchBar from '../../components/SearchBar';
import ActionButtons from '../../components/ActionButtons';
import Pagination from '../../components/Pagination';
import SearchableSelect from '../../components/SearchableSelect';
import ImportJadwal from '../../components/ImportJadwal';

// ================================================================================
// KOMPONEN MULTI-DOSEN SELECT (max 8 dosen)
// ================================================================================
function MultiDosenSelect({
  label,
  values: valuesProp = [],
  onChange,
  options = [],
  displayKey,
  maxSelections = 8,
}) {
  const values = Array.isArray(valuesProp) ? valuesProp : [];
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = React.useRef(null);

  const getDisplayText = (option) => {
    if (!option) return '';
    return typeof displayKey === 'function'
      ? displayKey(option)
      : option[displayKey];
  };

  // Get selected dosen names
  const selectedDosen = values
    .map((id) => options.find((opt) => opt.id === id))
    .filter(Boolean);

  // Filter options based on search (exclude already selected)
  const filteredOptions = options.filter((opt) => {
    const text = getDisplayText(opt).toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    const notSelected = !values.includes(opt.id);
    return matchesSearch && notSelected;
  });

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionId) => {
    if (values.length < maxSelections) {
      onChange([...values, optionId]);
    }
    setSearchQuery('');
  };

  const handleRemove = (optionId) => {
    onChange(values.filter((id) => id !== optionId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{' '}
        <span className="text-xs text-slate-500">
          (max {maxSelections} dosen)
        </span>
      </label>

      {/* Selected Dosen Tags */}
      {selectedDosen.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedDosen.map((dosen, idx) => (
            <span
              key={dosen.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full"
            >
              <span className="text-indigo-500">{idx + 1}.</span>
              {getDisplayText(dosen)}
              <button
                type="button"
                onClick={() => handleRemove(dosen.id)}
                className="ml-1 text-indigo-400 hover:text-indigo-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Display */}
      <div
        onClick={() => values.length < maxSelections && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-indigo-500 flex items-center justify-between ${
          values.length >= maxSelections ? 'bg-slate-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="text-slate-400">
          {values.length >= maxSelections
            ? `Maksimal ${maxSelections} dosen dipilih`
            : `Pilih dosen... (${values.length}/${maxSelections})`}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && values.length < maxSelections && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dosen..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Tidak ada hasil
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 text-slate-700"
                >
                  {getDisplayText(option)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================================
// HELPER FUNCTIONS & CONSTANTS
// ================================================================================

const ITEMS_PER_PAGE = 10;

// Helper untuk format timestamp ke tampilan lengkap "Hari, DD Bulan YYYY, HH:MM"
const formatTimestamp = (ts) => {
  if (!ts || ts === '-') return '-';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '-';
    const hari = date.toLocaleDateString('id-ID', { weekday: 'long' });
    const tanggal = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const waktu = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${hari}, ${tanggal}, ${waktu}`;
  } catch {
    return '-';
  }
};

const formatTime = (ts) => {
  if (!ts || ts === '-') return '-';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
};

// Helper untuk format timestamp singkat (untuk alert/conflict)
const formatTimestampShort = (ts) => {
  if (!ts || ts === '-') return '-';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return (
      date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) +
      ' ' +
      date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    );
  } catch {
    return '-';
  }
};

// Helper untuk format timestamp ke input datetime-local (YYYY-MM-DDTHH:MM)
// Gunakan local timezone agar jam yang tampil sesuai dengan jam yang disimpan
const toDatetimeLocal = (ts) => {
  if (!ts || ts === '-') return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return '';
  }
};

const createMap = (data, key) =>
  Object.fromEntries((data || []).map((item) => [item.id, item[key]]));

// Helper untuk format input date (YYYY-MM-DD)
const formatDateInput = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper untuk format tanggal display (Indonesia)
const formatDate = (date) => {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Helper untuk compare tanggal (tanpa waktu)
const isSameDate = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Badge untuk jenis jadwal
const JenisBadge = ({ jenis }) => {
  const styles = {
    perkuliahan: 'bg-blue-100 text-blue-800 border-blue-200',
    karya_akhir: 'bg-purple-100 text-purple-800 border-purple-200',
    lain_lain: 'bg-green-100 text-green-800 border-green-200',
  };
  const labels = {
    perkuliahan: '📚 Perkuliahan',
    karya_akhir: '🎓 Karya Akhir',
    lain_lain: '📋 Lain-lain',
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[jenis] || 'bg-gray-100 text-gray-800'}`}
    >
      {labels[jenis] || jenis}
    </span>
  );
};

// Cek konflik ruangan via view_jadwal_union
const JENIS_MAP = {
  jadwal_perkuliahan: 'PERKULIAHAN',
  jadwal_karya_akhir: 'KARYA_AKHIR',
  jadwal_lain_lain: 'LAIN_LAIN',
};
const JENIS_LABEL = {
  PERKULIAHAN: 'Perkuliahan',
  KARYA_AKHIR: 'Karya Akhir',
  LAIN_LAIN: 'Lain-lain',
};

const checkRuanganConflict = async ({
  mulai,
  akhir,
  ruanganId,
  excludeId,
  excludeTable,
  ruanganMap,
}) => {
  if (!mulai || !akhir) return '• Waktu mulai dan selesai harus diisi';
  const [formStart, formEnd] = [new Date(mulai), new Date(akhir)];
  if (formStart >= formEnd)
    return '• Waktu mulai harus lebih awal dari waktu selesai';
  if (!ruanganId) return null;

  const { data, error } = await supabase
    .from('view_jadwal_union')
    .select('jenis_jadwal, id_asli, mulai_jadwal, akhir_jadwal')
    .eq('ruangan_id', ruanganId);

  if (error) return (console.error('Error checking conflict:', error), null);

  const namaRuangan = ruanganMap?.[ruanganId] || `Ruangan ${ruanganId}`;
  const excludeJenis = JENIS_MAP[excludeTable];

  const conflicts = (data || [])
    .filter((j) => {
      if (j.jenis_jadwal === excludeJenis && j.id_asli === excludeId)
        return false;
      const [s, e] = [new Date(j.mulai_jadwal), new Date(j.akhir_jadwal)];
      return j.mulai_jadwal && j.akhir_jadwal && formStart < e && formEnd > s;
    })
    .map(
      (j) =>
        `• [${JENIS_LABEL[j.jenis_jadwal]}] "${namaRuangan}" dipakai ${formatTimestampShort(j.mulai_jadwal)} - ${formatTimestampShort(j.akhir_jadwal)}`
    );

  return conflicts.length ? conflicts.join('\n') : null;
};

// Fungsi untuk mengecek konflik dosen
const checkDosenConflict = async ({
  mulai,
  akhir,
  dosenId,
  dosenIds,
  excludeId,
  excludeTable,
  dosenMap,
}) => {
  if (!mulai || !akhir) return null;
  const [formStart, formEnd] = [new Date(mulai), new Date(akhir)];
  if (formStart >= formEnd) return null;

  // Collect all dosen IDs yang akan dicek
  const targetDosenIds = [];
  if (dosenId) targetDosenIds.push(parseInt(dosenId));
  if (dosenIds && Array.isArray(dosenIds)) {
    targetDosenIds.push(...dosenIds.map((id) => parseInt(id)));
  }

  if (targetDosenIds.length === 0) return null;

  const conflicts = [];
  const excludeJenis = JENIS_MAP[excludeTable];

  // Cek setiap dosen yang akan dijadwalkan
  for (const checkDosenId of targetDosenIds) {
    const namaDosen = dosenMap?.[checkDosenId] || `Dosen ${checkDosenId}`;

    // 1. Cek jadwal_perkuliahan (dosen_id)
    const { data: perkuliahanData, error: perkuliahanError } = await supabase
      .from('jadwal_perkuliahan')
      .select('id, mulai_jadwal, akhir_jadwal, dosen_id')
      .eq('dosen_id', checkDosenId);

    if (perkuliahanError) {
      console.error('Error checking perkuliahan conflict:', perkuliahanError);
    } else if (perkuliahanData) {
      perkuliahanData.forEach((j) => {
        // Skip jika ini adalah record yang sedang diedit
        if (excludeJenis === 'PERKULIAHAN' && j.id === excludeId) return;

        const [s, e] = [new Date(j.mulai_jadwal), new Date(j.akhir_jadwal)];
        if (j.mulai_jadwal && j.akhir_jadwal && formStart < e && formEnd > s) {
          conflicts.push(
            `• [Perkuliahan] Dosen "${namaDosen}" sudah dijadwalkan ${formatTimestampShort(j.mulai_jadwal)} - ${formatTimestampShort(j.akhir_jadwal)}`
          );
        }
      });
    }

    // 2. Cek jadwal_karya_akhir (dosen_ids JSON array)
    const { data: karyaAkhirData, error: karyaAkhirError } = await supabase
      .from('jadwal_karya_akhir')
      .select('id, mulai_jadwal, akhir_jadwal, dosen_ids');

    if (karyaAkhirError) {
      console.error('Error checking karya akhir conflict:', karyaAkhirError);
    } else if (karyaAkhirData) {
      karyaAkhirData.forEach((j) => {
        // Skip jika ini adalah record yang sedang diedit
        if (excludeJenis === 'KARYA_AKHIR' && j.id === excludeId) return;

        // Parse dosen_ids dari JSON
        let scheduledDosenIds = [];
        if (j.dosen_ids) {
          try {
            scheduledDosenIds =
              typeof j.dosen_ids === 'string'
                ? JSON.parse(j.dosen_ids)
                : j.dosen_ids;
          } catch (e) {
            console.error('Error parsing dosen_ids:', e);
          }
        }

        // Cek apakah dosen yang akan dijadwalkan sudah terpakai
        const isDosenConflict =
          Array.isArray(scheduledDosenIds) &&
          scheduledDosenIds.some((id) => parseInt(id) === checkDosenId);

        if (isDosenConflict) {
          const [s, e] = [new Date(j.mulai_jadwal), new Date(j.akhir_jadwal)];
          if (
            j.mulai_jadwal &&
            j.akhir_jadwal &&
            formStart < e &&
            formEnd > s
          ) {
            conflicts.push(
              `• [Karya Akhir] Dosen "${namaDosen}" sudah dijadwalkan ${formatTimestampShort(j.mulai_jadwal)} - ${formatTimestampShort(j.akhir_jadwal)}`
            );
          }
        }
      });
    }
  }

  return conflicts.length ? conflicts.join('\n') : null;
};

// ================================================================================
// KOMPONEN UTAMA: JadwalPageAdmin
// ================================================================================
export default function JadwalPageAdmin() {
  // 🔐 Auth context untuk logging
  const { userRole } = useAuth();
  const { addNotification } = useNotifications();

  // Data states
  const [jadwalPerkuliahan, setJadwalPerkuliahan] = useState([]);
  const [jadwalKaryaAkhir, setJadwalKaryaAkhir] = useState([]);
  const [jadwalLainLain, setJadwalLainLain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('perkuliahan');

  // Options for forms
  const [options, setOptions] = useState({
    dosen: [],
    ruangan: [],
    angkatan: [],
    mataKuliah: [],
    agenda: [],
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalType, setModalType] = useState('perkuliahan');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Import states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJenisTab, setImportJenisTab] = useState('perkuliahan');

  // Download states
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadJenisTab, setDownloadJenisTab] = useState(null); // untuk menyimpan jenis tab yang akan didownload
  const [downloadType, setDownloadType] = useState('all'); // Default: all (bukan date)
  const [downloadStartDate, setDownloadStartDate] = useState('');
  const [downloadEndDate, setDownloadEndDate] = useState('');
  const [downloadMonth, setDownloadMonth] = useState('');

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch options - hanya yang aktif (aktif_nonaktif = true)
      const [dosenRes, ruanganRes, angkatanRes, mataKuliahRes, agendaRes] =
        await Promise.all([
          supabase
            .from('dosen')
            .select('id, nama_dosen, id_dosen, aktif_nonaktif')
            .eq('aktif_nonaktif', true),
          supabase
            .from('ruangan')
            .select('id, nama_ruangan, aktif_nonaktif')
            .eq('aktif_nonaktif', true),
          supabase
            .from('angkatan')
            .select('id, nama_angkatan, aktif_nonaktif')
            .eq('aktif_nonaktif', true),
          supabase
            .from('mata_kuliah')
            .select('*, aktif_nonaktif')
            .eq('aktif_nonaktif', true),
          supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
        ]);

      setOptions({
        dosen: dosenRes.data || [],
        ruangan: ruanganRes.data || [],
        angkatan: angkatanRes.data || [],
        mataKuliah: mataKuliahRes.data || [],
        agenda: agendaRes.data || [],
      });

      const ruanganMap = createMap(ruanganRes.data, 'nama_ruangan');
      const angkatanMap = createMap(angkatanRes.data, 'nama_angkatan');
      const agendaMap = createMap(agendaRes.data, 'agenda_karya_akhir');

      // Fetch jadwal perkuliahan
      const { data: perkuliahanData } = await supabase
        .from('jadwal_perkuliahan')
        .select('*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)');

      const mergedPerkuliahan = (perkuliahanData || []).map((r) => ({
        ...r,
        jenis: 'perkuliahan',
        nama_dosen: r.dosen?.nama_dosen || '-',
        nama_ruangan: r.ruangan?.nama_ruangan || '-',
        nama_angkatan: r.angkatan?.nama_angkatan || '-',
        nama_matkul:
          r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || '-',
        agenda_display:
          r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || '-',
        keterangan: r.dosen?.nama_dosen || '-',
        mulai_formatted: formatTimestamp(r.mulai_jadwal),
        akhir_formatted: formatTimestamp(r.akhir_jadwal),
        last_modified: r.updated_at || r.created_at || new Date().toISOString(),
        created_by: r.created_by || '-',
        updated_by: r.updated_by || '-',
        // New fields from spreadsheet
        paralel: r.paralel || '-',
        real_perkuliahan: r.real_perkuliahan || '-',
        petugas_zoom: r.petugas_zoom || '-',
        moderator: r.moderator || '-',
        dosen_ids: (() => {
          if (!r.dosen_ids) return [];
          try {
            return typeof r.dosen_ids === 'string'
              ? JSON.parse(r.dosen_ids)
              : r.dosen_ids;
          } catch {
            return [];
          }
        })(),
        penguji_ids: (() => {
          if (!r.penguji_ids) return [];
          try {
            return typeof r.penguji_ids === 'string'
              ? JSON.parse(r.penguji_ids)
              : r.penguji_ids;
          } catch {
            return [];
          }
        })(),
        pintang_sps: r.pintang_sps || '-',
        // Map dosen_ids to names for display
        dosen_tambahan_names: (() => {
          let ids = [];
          if (r.dosen_ids) {
            try {
              ids =
                typeof r.dosen_ids === 'string'
                  ? JSON.parse(r.dosen_ids)
                  : r.dosen_ids;
            } catch {
              ids = [];
            }
          }
          return ids.map((id) => dosenMap[id]).filter(Boolean);
        })(),
        penguji_names: (() => {
          let ids = [];
          if (r.penguji_ids) {
            try {
              ids =
                typeof r.penguji_ids === 'string'
                  ? JSON.parse(r.penguji_ids)
                  : r.penguji_ids;
            } catch {
              ids = [];
            }
          }
          return ids.map((id) => dosenMap[id]).filter(Boolean);
        })(),
      }));
      setJadwalPerkuliahan(mergedPerkuliahan);

      // Fetch jadwal karya akhir
      const { data: karyaAkhirData } = await supabase
        .from('jadwal_karya_akhir')
        .select('*');

      // Create dosen map for lookup
      const dosenMap = createMap(dosenRes.data, 'nama_dosen');

      const mergedKaryaAkhir = (karyaAkhirData || []).map((j) => {
        // Parse dosen IDs (stored as JSON array or comma-separated)
        let dosenIds = [];
        if (j.dosen_ids) {
          try {
            dosenIds =
              typeof j.dosen_ids === 'string'
                ? JSON.parse(j.dosen_ids)
                : j.dosen_ids;
          } catch {
            dosenIds = [];
          }
        }
        // Map dosen IDs to names
        const dosenNames = dosenIds.map((id) => dosenMap[id]).filter(Boolean);

        return {
          ...j,
          jenis: 'karya_akhir',
          nama_ruangan: ruanganMap[j.nama_ruangan] || '-',
          nama_mahasiswa: j.nama_mahasiswa || '-',
          agenda_display: agendaMap[j.agenda_jadwal_karya_akhir] || '-',
          keterangan: j.nama_mahasiswa || '-',
          ruangan_id_raw: j.nama_ruangan,
          agenda_id_raw: j.agenda_jadwal_karya_akhir,
          dosen_ids: dosenIds,
          dosen_names: dosenNames,
          dosen_display: dosenNames.length > 0 ? dosenNames.join(', ') : '-',
          mulai_formatted: formatTimestamp(j.mulai_jadwal),
          akhir_formatted: formatTimestamp(j.akhir_jadwal),
          last_modified:
            j.updated_at || j.created_at || new Date().toISOString(),
          created_by: j.created_by || '-',
          updated_by: j.updated_by || '-',
          // New fields from spreadsheet
          petugas_zoom: j.petugas_zoom || '-',
          moderator: j.moderator || '-',
          penguji_ids: (() => {
            let ids = [];
            if (j.penguji_ids) {
              try {
                ids =
                  typeof j.penguji_ids === 'string'
                    ? JSON.parse(j.penguji_ids)
                    : j.penguji_ids;
              } catch {
                ids = [];
              }
            }
            return ids;
          })(),
          penguji_names: (() => {
            let ids = [];
            if (j.penguji_ids) {
              try {
                ids =
                  typeof j.penguji_ids === 'string'
                    ? JSON.parse(j.penguji_ids)
                    : j.penguji_ids;
              } catch {
                ids = [];
              }
            }
            return ids.map((id) => dosenMap[id]).filter(Boolean);
          })(),
          pintang_sps: j.pintang_sps || '-',
        };
      });
      setJadwalKaryaAkhir(mergedKaryaAkhir);

      // Fetch jadwal lain-lain
      const { data: lainLainData } = await supabase
        .from('jadwal_lain_lain')
        .select('*');

      const mergedLainLain = (lainLainData || []).map((j) => ({
        ...j,
        jenis: 'lain_lain',
        nama_ruangan: ruanganMap[j.nama_ruangan] || '-',
        agenda_display: j.agenda || '-',
        keterangan: j.nama_user || '-',
        ruangan_id_raw: j.nama_ruangan,
        mulai_formatted: formatTimestamp(j.mulai_jadwal),
        akhir_formatted: formatTimestamp(j.akhir_jadwal),
        last_modified: j.updated_at || j.created_at || new Date().toISOString(),
        created_by: j.created_by || '-',
        updated_by: j.updated_by || '-',
        // New fields from spreadsheet
        petugas_zoom: j.petugas_zoom || '-',
      }));
      setJadwalLainLain(mergedLainLain);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal mengambil data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Realtime subscriptions
    const channels = [
      supabase
        .channel('jadwal_perkuliahan_admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jadwal_perkuliahan' },
          fetchAllData
        ),
      supabase
        .channel('jadwal_karya_akhir_admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jadwal_karya_akhir' },
          fetchAllData
        ),
      supabase
        .channel('jadwal_lain_lain_admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jadwal_lain_lain' },
          fetchAllData
        ),
    ];

    channels.forEach((ch) => ch.subscribe());

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [fetchAllData]);

  // Modal handlers
  const resetForm = (type) => {
    if (type === 'perkuliahan') {
      return {
        id: null,
        dosen_id: '',
        ruangan_id: '',
        id_angkatan: '',
        id_mata_kuliah: '',
        mulai_jadwal: '',
        akhir_jadwal: '',
        jenis_pertemuan: 'luring',
        zoom_id: '',
        zoom_password: '',
        note: '',
        paralel: '',
        real_perkuliahan: '',
        petugas_zoom: '',
        moderator: '',
        dosen_ids: [],
        penguji_ids: [],
        pintang_sps: '',
      };
    } else if (type === 'karya_akhir') {
      return {
        id: null,
        nama_ruangan: '',
        nama_mahasiswa: '',
        mulai_jadwal: '',
        akhir_jadwal: '',
        agenda_jadwal_karya_akhir: '',
        dosen_ids: [],
        jenis_pertemuan: 'luring',
        zoom_id: '',
        zoom_password: '',
        note: '',
        petugas_zoom: '',
        moderator: '',
        penguji_ids: [],
        pintang_sps: '',
      };
    } else {
      return {
        id: null,
        nama_ruangan: '',
        nama_user: '',
        mulai_jadwal: '',
        akhir_jadwal: '',
        agenda: '',
        jenis_pertemuan: 'luring',
        zoom_id: '',
        zoom_password: '',
        note: '',
        petugas_zoom: '',
      };
    }
  };

  // Agar bisa dipanggil dari window (untuk dipakai di JadwalTab)
  const openAddModal = (type) => {
    setModalMode('add');
    setModalType(type);
    setForm(resetForm(type));
    setModalOpen(true);
  };

  // Expose handleDownload ke window agar bisa dipanggil dari JadwalTab
  useEffect(() => {
    window.handleDownloadJadwal = handleDownload;
    window.openDownloadModal = (jenis) => {
      console.log('[openDownloadModal] Jenis:', jenis, 'Type:', typeof jenis);
      setDownloadJenisTab(jenis);
      setDownloadType('all'); // default ke semua saat modal dibuka
      setDownloadStartDate('');
      setDownloadEndDate('');
      setDownloadMonth('');
      setDownloadModalOpen(true);
    };
    window.openImportModal = (jenis) => {
      setImportJenisTab(jenis);
      setImportModalOpen(true);
    };
    return () => {
      delete window.handleDownloadJadwal;
      delete window.openDownloadModal;
      delete window.openImportModal;
    };
  }, [
    jadwalPerkuliahan,
    jadwalKaryaAkhir,
    jadwalLainLain,
    downloadType,
    downloadStartDate,
    downloadEndDate,
    downloadMonth,
  ]);
  window.openAddModal = openAddModal;

  const openEditModal = (row) => {
    setModalMode('edit');
    setModalType(row.jenis);

    if (row.jenis === 'perkuliahan') {
      setForm({
        id: row.id,
        dosen_id: row.dosen_id || '',
        ruangan_id: row.ruangan_id || '',
        id_angkatan: row.id_angkatan || '',
        id_mata_kuliah: row.id_mata_kuliah || '',
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal),
        jenis_pertemuan: row.jenis_pertemuan || 'luring',
        paralel: row.paralel || '',
        real_perkuliahan: row.real_perkuliahan || '',
        petugas_zoom: row.petugas_zoom || '',
        moderator: row.moderator || '',
        dosen_ids: row.dosen_ids || [],
        penguji_ids: row.penguji_ids || [],
        pintang_sps: row.pintang_sps || '',
      });
    } else if (row.jenis === 'karya_akhir') {
      setForm({
        id: row.id,
        nama_ruangan: row.ruangan_id_raw || '',
        nama_mahasiswa: row.nama_mahasiswa || '',
        agenda_jadwal_karya_akhir: row.agenda_id_raw || '',
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal),
        dosen_ids: row.dosen_ids || [],
        jenis_pertemuan: row.jenis_pertemuan || 'luring',
        petugas_zoom: row.petugas_zoom || '',
        moderator: row.moderator || '',
        penguji_ids: row.penguji_ids || [],
        pintang_sps: row.pintang_sps || '',
      });
    } else {
      setForm({
        id: row.id,
        nama_ruangan: row.ruangan_id_raw || '',
        nama_user: row.nama_user || '',
        agenda: row.agenda || '',
        mulai_jadwal: toDatetimeLocal(row.mulai_jadwal),
        akhir_jadwal: toDatetimeLocal(row.akhir_jadwal),
        jenis_pertemuan: row.jenis_pertemuan || 'luring',
        petugas_zoom: row.petugas_zoom || '',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({});
  };

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Check conflict
  const handleCheckConflict = async () => {
    const conflicts = [];

    // Validasi waktu dasar
    if (!form.mulai_jadwal || !form.akhir_jadwal) {
      return '• Waktu mulai dan selesai harus diisi';
    }
    const [formStart, formEnd] = [
      new Date(form.mulai_jadwal),
      new Date(form.akhir_jadwal),
    ];
    if (formStart >= formEnd) {
      return '• Waktu mulai harus lebih awal dari waktu selesai';
    }

    const dosenMap = createMap(options.dosen, 'nama_dosen');
    const ruanganMap = createMap(options.ruangan, 'nama_ruangan');

    if (modalType === 'perkuliahan') {
      // Cek konflik dosen untuk perkuliahan
      const dosenConflict = await checkDosenConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        dosenId: form.dosen_id,
        dosenIds: null,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_perkuliahan' : null,
        dosenMap,
      });
      if (dosenConflict) conflicts.push(dosenConflict);

      // Cek konflik ruangan hanya untuk luring
      if (form.jenis_pertemuan !== 'daring') {
        const ruanganConflict = await checkRuanganConflict({
          mulai: form.mulai_jadwal,
          akhir: form.akhir_jadwal,
          ruanganId: form.ruangan_id,
          excludeId: form.id,
          excludeTable: modalMode === 'edit' ? 'jadwal_perkuliahan' : null,
          ruanganMap,
        });
        if (ruanganConflict) conflicts.push(ruanganConflict);
      }
    } else if (modalType === 'karya_akhir') {
      // Cek konflik dosen untuk karya akhir (multiple dosen)
      const dosenConflict = await checkDosenConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        dosenId: null,
        dosenIds: form.dosen_ids,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_karya_akhir' : null,
        dosenMap,
      });
      if (dosenConflict) conflicts.push(dosenConflict);

      // Cek konflik ruangan
      const ruanganConflict = await checkRuanganConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        ruanganId: form.nama_ruangan,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_karya_akhir' : null,
        ruanganMap,
      });
      if (ruanganConflict) conflicts.push(ruanganConflict);
    } else {
      // Untuk lain-lain, hanya cek ruangan
      const ruanganConflict = await checkRuanganConflict({
        mulai: form.mulai_jadwal,
        akhir: form.akhir_jadwal,
        ruanganId: form.nama_ruangan,
        excludeId: form.id,
        excludeTable: modalMode === 'edit' ? 'jadwal_lain_lain' : null,
        ruanganMap,
      });
      if (ruanganConflict) conflicts.push(ruanganConflict);
    }

    return conflicts.length ? conflicts.join('\n\n') : null;
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
        perkuliahan: 'jadwal_perkuliahan',
        karya_akhir: 'jadwal_karya_akhir',
        lain_lain: 'jadwal_lain_lain',
      };

      const table = tableMap[modalType];

      // 🎯 Logic insert/update disatukan (tidak ada duplikasi!)
      let result;
      // Prepare form data - convert dosen_ids array to JSON string for karya_akhir
      let formData = { ...form };

      // Convert empty string ruangan to null untuk daring
      if (modalType === 'perkuliahan') {
        if (formData.ruangan_id === '' || formData.ruangan_id === null) {
          formData.ruangan_id = null;
        }
        if (formData.dosen_id === '' || formData.dosen_id === null) {
          formData.dosen_id = null;
        }
        // Convert numeric fields
        if (formData.paralel === '') formData.paralel = null;
        else if (formData.paralel)
          formData.paralel = parseInt(formData.paralel);
        if (formData.real_perkuliahan === '') formData.real_perkuliahan = null;
        else if (formData.real_perkuliahan)
          formData.real_perkuliahan = parseInt(formData.real_perkuliahan);
        if (formData.moderator === '') formData.moderator = null;
        if (formData.petugas_zoom === '') formData.petugas_zoom = null;
        if (formData.pintang_sps === '') formData.pintang_sps = null;
        // Stringify JSONB arrays
        if (formData.dosen_ids)
          formData.dosen_ids = JSON.stringify(formData.dosen_ids);
        if (formData.penguji_ids)
          formData.penguji_ids = JSON.stringify(formData.penguji_ids);
      } else if (modalType === 'karya_akhir' || modalType === 'lain_lain') {
        if (formData.nama_ruangan === '' || formData.nama_ruangan === null) {
          formData.nama_ruangan = null;
        }
        if (formData.petugas_zoom === '') formData.petugas_zoom = null;
      }

      if (modalType === 'karya_akhir') {
        if (formData.dosen_ids)
          formData.dosen_ids = JSON.stringify(formData.dosen_ids);
        if (formData.penguji_ids)
          formData.penguji_ids = JSON.stringify(formData.penguji_ids);
        if (formData.moderator === '') formData.moderator = null;
        if (formData.pintang_sps === '') formData.pintang_sps = null;
      }

      // 🔐 Tambahkan info user yang membuat/mengedit
      const userName = userRole?.name || 'Unknown';

      if (modalMode === 'add') {
        const { id, ...dataToInsert } = formData; // Hapus id untuk insert
        dataToInsert.created_by = userName;
        dataToInsert.updated_by = userName;
        result = await supabase.from(table).insert([dataToInsert]);
      } else {
        formData.updated_by = userName;
        formData.updated_at = new Date().toISOString();
        result = await supabase
          .from(table)
          .update(formData)
          .eq('id', formData.id);
      }

      if (result.error) throw result.error;

      // 🔔 Push notification ke global context
      const tableLabels = {
        perkuliahan: 'Perkuliahan',
        karya_akhir: 'Karya Akhir',
        lain_lain: 'Lain-lain',
      };
      const verb = modalMode === 'add' ? 'ditambahkan' : 'diperbarui';
      addNotification({
        type: modalMode === 'add' ? 'tambah' : 'edit',
        tag: modalMode === 'add' ? 'BARU' : 'UPDATE',
        title:
          modalMode === 'add' ? 'Jadwal Baru Ditambahkan' : 'Jadwal Diperbarui',
        description: `${tableLabels[modalType]}: Data jadwal telah ${verb} oleh ${userName}.`,
      });

      alert(
        `Data berhasil ${modalMode === 'add' ? 'ditambahkan' : 'diupdate'}!`
      );
      closeModal();
      fetchAllData();
    } catch (err) {
      console.error('Error saving:', err);
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async (id, jenis) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;

    try {
      const tableMap = {
        perkuliahan: 'jadwal_perkuliahan',
        karya_akhir: 'jadwal_karya_akhir',
        lain_lain: 'jadwal_lain_lain',
      };

      const { error } = await supabase
        .from(tableMap[jenis])
        .delete()
        .eq('id', id);
      if (error) throw error;

      // 🔔 Push notification ke global context
      const tableLabels = {
        perkuliahan: 'Perkuliahan',
        karya_akhir: 'Karya Akhir',
        lain_lain: 'Lain-lain',
      };
      addNotification({
        type: 'hapus',
        tag: 'HAPUS',
        title: 'Jadwal Dihapus',
        description: `${tableLabels[jenis]}: Data jadwal telah dihapus.`,
      });

      alert('Data berhasil dihapus!');
      fetchAllData();
    } catch (err) {
      console.error('Error deleting:', err);
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async (ids, jenis) => {
    if (!ids.length) return;
    if (
      !confirm(
        `Yakin ingin menghapus ${ids.length} data jadwal yang dipilih? Proses ini tidak bisa dibatalkan.`
      )
    )
      return;

    try {
      const tableMap = {
        perkuliahan: 'jadwal_perkuliahan',
        karya_akhir: 'jadwal_karya_akhir',
        lain_lain: 'jadwal_lain_lain',
      };

      // Batch delete 200 IDs per request to avoid query size limits
      const BATCH_SIZE = 200;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from(tableMap[jenis])
          .delete()
          .in('id', batch);
        if (error) throw error;
      }

      const tableLabels = {
        perkuliahan: 'Perkuliahan',
        karya_akhir: 'Karya Akhir',
        lain_lain: 'Lain-lain',
      };
      addNotification({
        type: 'hapus',
        tag: 'HAPUS',
        title: 'Jadwal Dihapus (Bulk)',
        description: `${tableLabels[jenis]}: ${ids.length} data jadwal telah dihapus.`,
      });

      alert(`${ids.length} data berhasil dihapus!`);
      fetchAllData();
    } catch (err) {
      console.error('Error bulk deleting:', err);
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

        if (targetJenis === 'perkuliahan') {
          allTabData = jadwalPerkuliahan;
        } else if (targetJenis === 'karya_akhir') {
          allTabData = jadwalKaryaAkhir;
        } else if (targetJenis === 'lain_lain') {
          allTabData = jadwalLainLain;
        }

        console.log(
          `[Download] Tab: ${targetJenis}, Total data: ${allTabData.length}, Filter: ${downloadType}`
        );

        // Jika ada filter tanggal atau bulan
        if (downloadType === 'all') {
          data = allTabData;
        } else if (downloadType === 'date') {
          if (!downloadStartDate || !downloadEndDate) {
            alert('Mohon pilih tanggal mulai dan akhir');
            return;
          }
          const start = new Date(downloadStartDate);
          const end = new Date(downloadEndDate);
          end.setHours(23, 59, 59);

          data = allTabData.filter((j) => {
            if (!j.mulai_jadwal) return false;
            const mulai = new Date(j.mulai_jadwal);
            if (isNaN(mulai.getTime())) return false;
            return mulai >= start && mulai <= end;
          });
        } else if (downloadType === 'month') {
          if (!downloadMonth) {
            alert('Mohon pilih bulan');
            return;
          }
          const [year, month] = downloadMonth.split('-');

          data = allTabData.filter((j) => {
            if (!j.mulai_jadwal) return false;
            const mulai = new Date(j.mulai_jadwal);
            if (isNaN(mulai.getTime())) return false;
            return (
              mulai.getFullYear() === parseInt(year) &&
              mulai.getMonth() === parseInt(month) - 1
            );
          });
        }
      } else {
        // Untuk modal download semua data (semua/date/month)
        if (downloadType === 'all') {
          data = [...jadwalPerkuliahan, ...jadwalKaryaAkhir, ...jadwalLainLain];
        } else if (downloadType === 'date') {
          if (!downloadStartDate || !downloadEndDate) {
            alert('Mohon pilih tanggal mulai dan akhir');
            return;
          }
          const start = new Date(downloadStartDate);
          const end = new Date(downloadEndDate);
          end.setHours(23, 59, 59);

          data = [
            ...jadwalPerkuliahan,
            ...jadwalKaryaAkhir,
            ...jadwalLainLain,
          ].filter((j) => {
            const mulai = new Date(j.mulai_jadwal);
            return mulai >= start && mulai <= end;
          });
        } else if (downloadType === 'month') {
          if (!downloadMonth) {
            alert('Mohon pilih bulan');
            return;
          }
          const [year, month] = downloadMonth.split('-');

          data = [
            ...jadwalPerkuliahan,
            ...jadwalKaryaAkhir,
            ...jadwalLainLain,
          ].filter((j) => {
            const mulai = new Date(j.mulai_jadwal);
            return (
              mulai.getFullYear() === parseInt(year) &&
              mulai.getMonth() === parseInt(month) - 1
            );
          });
        }
      }

      console.log(`[Download] Hasil filter: ${data.length} data`);

      if (data.length === 0) {
        alert('Tidak ada data untuk didownload');
        return;
      }

      // Convert to CSV
      const headers = [
        'Jenis',
        'Agenda',
        'Ruangan',
        'Waktu Mulai',
        'Waktu Selesai',
        'Keterangan',
      ];
      const rows = data.map((d) => [
        d.jenis,
        d.agenda_display || '-',
        d.nama_ruangan || '-',
        d.mulai_formatted || '-',
        d.akhir_formatted || '-',
        d.keterangan || '-',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
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
      console.error('Error downloading:', err);
      alert(`Gagal download: ${err.message}`);
    }
  };

  // Render form fields berdasarkan modalType
  const renderFormFields = () => {
    if (modalType === 'perkuliahan') {
      return (
        <>
          <SearchableSelect
            label="Angkatan"
            value={form.id_angkatan}
            onChange={(v) => handleChange('id_angkatan', v)}
            options={options.angkatan}
            displayKey="nama_angkatan"
            required
          />
          <SearchableSelect
            label="Mata Kuliah"
            value={form.id_mata_kuliah}
            onChange={(v) => handleChange('id_mata_kuliah', v)}
            options={options.mataKuliah}
            displayKey={(m) =>
              m.mata_kuliah || m.nama_matkul || m.nama || `MK ${m.id}`
            }
            required
          />
          {/* <InputField
            label="Paralel"
            value={form.paralel || ''}
            onChange={(v) => handleChange('paralel', v)}
            placeholder="1, 2, 3..."
            type="number"
          /> */}
          <InputField
            label="Real Perkuliahan"
            value={form.real_perkuliahan || ''}
            onChange={(v) => handleChange('real_perkuliahan', v)}
            placeholder="Jumlah pertemuan yang sudah terlaksana"
            type="number"
          />
          <SearchableSelect
            label="Dosen Utama"
            value={form.dosen_id}
            onChange={(v) => handleChange('dosen_id', v)}
            options={options.dosen}
            displayKey="nama_dosen"
          />
          <MultiDosenSelect
            label="Dosen Tambahan (Dosen 2)"
            values={form.dosen_ids || []}
            onChange={(v) => handleChange('dosen_ids', v)}
            options={options.dosen}
            displayKey="nama_dosen"
            maxSelections={2}
          />
          {/* <InputField
            label="Moderator"
            value={form.moderator || ''}
            onChange={(v) => handleChange('moderator', v)}
            placeholder="Nama moderator"
          /> */}
          {/* <MultiDosenSelect
            label="Penguji"
            values={form.penguji_ids || []}
            onChange={(v) => handleChange('penguji_ids', v)}
            options={options.dosen}
            displayKey="nama_dosen"
            maxSelections={2}
          /> */}
          <SelectField
            label="Jenis Pertemuan"
            value={form.jenis_pertemuan || 'luring'}
            onChange={(v) => {
              handleChange('jenis_pertemuan', v);
              if (v === 'daring') {
                handleChange('ruangan_id', '');
              }
            }}
            options={[
              { id: 'daring', label: '🌐 Daring (Online)' },
              { id: 'luring', label: '🏢 Luring (Offline)' },
              { id: 'hybrid', label: '🔄 Hybrid' },
            ]}
            displayKey="label"
          />
          <SearchableSelect
            label="Ruangan"
            value={form.ruangan_id}
            onChange={(v) => handleChange('ruangan_id', v)}
            options={options.ruangan}
            displayKey="nama_ruangan"
            required={form.jenis_pertemuan !== 'daring'}
          />
          {/* <InputField
            label="Petugas Zoom"
            value={form.petugas_zoom || ''}
            onChange={(v) => handleChange('petugas_zoom', v)}
            placeholder="Nama petugas/operator Zoom"
          /> */}
          {(form.jenis_pertemuan === 'hybrid' ||
            form.jenis_pertemuan === 'daring') && (
            <>
              <InputField
                label="Zoom ID"
                value={form.zoom_id || ''}
                onChange={(v) => handleChange('zoom_id', v)}
                placeholder="Masukkan Zoom Meeting ID"
              />
              <InputField
                label="Zoom Password"
                value={form.zoom_password || ''}
                onChange={(v) => handleChange('zoom_password', v)}
                placeholder="Masukkan Zoom Password"
              />
            </>
          )}
          {/* <InputField
            label="Pintang / SPs"
            value={form.pintang_sps || ''}
            onChange={(v) => handleChange('pintang_sps', v)}
            placeholder="Info Pembimbing Tamu / SPs"
          /> */}
          <InputField
            label="Catatan / Permintaan"
            value={form.note || ''}
            onChange={(v) => handleChange('note', v)}
            placeholder="Masukkan catatan atau permintaan khusus (opsional)"
          />
        </>
      );
    } else if (modalType === 'karya_akhir') {
      return (
        <>
          <InputField
            label="Nama Mahasiswa"
            value={form.nama_mahasiswa || ''}
            onChange={(v) => handleChange('nama_mahasiswa', v)}
            placeholder="Masukkan nama mahasiswa"
            required
          />
          <SearchableSelect
            label="Agenda"
            value={form.agenda_jadwal_karya_akhir}
            onChange={(v) => handleChange('agenda_jadwal_karya_akhir', v)}
            options={options.agenda}
            displayKey="agenda_karya_akhir"
            required
          />
          <MultiDosenSelect
            label="Dosen Pembimbing"
            values={form.dosen_ids || []}
            onChange={(v) => handleChange('dosen_ids', v)}
            options={options.dosen}
            displayKey="nama_dosen"
            maxSelections={4}
          />
          <MultiDosenSelect
            label="Penguji"
            values={form.penguji_ids || []}
            onChange={(v) => handleChange('penguji_ids', v)}
            options={options.dosen}
            displayKey="nama_dosen"
            maxSelections={4}
          />
          <InputField
            label="Moderator"
            value={form.moderator || ''}
            onChange={(v) => handleChange('moderator', v)}
            placeholder="Nama moderator sidang"
          />
          <SelectField
            label="Jenis Pertemuan"
            value={form.jenis_pertemuan || 'luring'}
            onChange={(v) => {
              handleChange('jenis_pertemuan', v);
              if (v === 'daring') {
                handleChange('nama_ruangan', '');
              }
            }}
            options={[
              { id: 'daring', label: '🌐 Daring (Online)' },
              { id: 'luring', label: '🏢 Luring (Offline)' },
              { id: 'hybrid', label: '🔄 Hybrid' },
            ]}
            displayKey="label"
          />
          <SearchableSelect
            label="Ruangan"
            value={form.nama_ruangan}
            onChange={(v) => handleChange('nama_ruangan', v)}
            options={options.ruangan}
            displayKey="nama_ruangan"
            required={form.jenis_pertemuan !== 'daring'}
          />
          {/* <InputField
            label="Petugas Zoom"
            value={form.petugas_zoom || ''}
            onChange={(v) => handleChange('petugas_zoom', v)}
            placeholder="Nama petugas/operator Zoom"
          /> */}
          {(form.jenis_pertemuan === 'hybrid' ||
            form.jenis_pertemuan === 'daring') && (
            <>
              <InputField
                label="Zoom ID"
                value={form.zoom_id || ''}
                onChange={(v) => handleChange('zoom_id', v)}
                placeholder="Masukkan Zoom Meeting ID"
              />
              <InputField
                label="Zoom Password"
                value={form.zoom_password || ''}
                onChange={(v) => handleChange('zoom_password', v)}
                placeholder="Masukkan Zoom Password"
              />
            </>
          )}
          {/* <InputField
            label="Pintang / SPs"
            value={form.pintang_sps || ''}
            onChange={(v) => handleChange('pintang_sps', v)}
            placeholder="Info Pembimbing Tamu / SPs"
          /> */}
          <InputField
            label="Catatan / Permintaan"
            value={form.note || ''}
            onChange={(v) => handleChange('note', v)}
            placeholder="Masukkan catatan atau permintaan khusus (opsional)"
          />
        </>
      );
    } else {
      return (
        <>
          <InputField
            label="Nama User"
            value={form.nama_user || ''}
            onChange={(v) => handleChange('nama_user', v)}
            placeholder="Masukkan nama user"
          />
          <InputField
            label="Agenda"
            value={form.agenda || ''}
            onChange={(v) => handleChange('agenda', v)}
            placeholder="Masukkan agenda"
          />
          <SelectField
            label="Jenis Pertemuan"
            value={form.jenis_pertemuan || 'luring'}
            onChange={(v) => {
              handleChange('jenis_pertemuan', v);
              if (v === 'daring') {
                handleChange('nama_ruangan', '');
              }
            }}
            options={[
              { id: 'daring', label: '🌐 Daring (Online)' },
              { id: 'luring', label: '🏢 Luring (Offline)' },
              { id: 'hybrid', label: '🔄 Hybrid' },
            ]}
            displayKey="label"
          />
          <SearchableSelect
            label="Ruangan"
            value={form.nama_ruangan}
            onChange={(v) => handleChange('nama_ruangan', v)}
            options={options.ruangan}
            displayKey="nama_ruangan"
            required={form.jenis_pertemuan !== 'daring'}
          />
          {/* <InputField
            label="Petugas Zoom"
            value={form.petugas_zoom || ''}
            onChange={(v) => handleChange('petugas_zoom', v)}
            placeholder="Nama petugas/operator Zoom"
          /> */}
          {(form.jenis_pertemuan === 'hybrid' ||
            form.jenis_pertemuan === 'daring') && (
            <>
              <InputField
                label="Zoom ID"
                value={form.zoom_id || ''}
                onChange={(v) => handleChange('zoom_id', v)}
                placeholder="Masukkan Zoom Meeting ID"
              />
              <InputField
                label="Zoom Password"
                value={form.zoom_password || ''}
                onChange={(v) => handleChange('zoom_password', v)}
                placeholder="Masukkan Zoom Password"
              />
            </>
          )}
          <InputField
            label="Catatan / Permintaan"
            value={form.note || ''}
            onChange={(v) => handleChange('note', v)}
            placeholder="Masukkan catatan atau permintaan khusus (opsional)"
          />
        </>
      );
    }
  };

  const modalTitles = {
    perkuliahan: {
      add: 'Tambah Jadwal Perkuliahan',
      edit: 'Edit Jadwal Perkuliahan',
    },
    karya_akhir: {
      add: 'Tambah Jadwal Karya Akhir',
      edit: 'Edit Jadwal Karya Akhir',
    },
    lain_lain: {
      add: 'Tambah Jadwal Lain-lain',
      edit: 'Edit Jadwal Lain-lain',
    },
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Kelola Jadwal" />
      {/* Download Button dipindah ke baris search & CRUD (lihat JadwalTab) */}

      {/* Tabs */}
      <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-1.5 md:p-2">
            <button
              onClick={() => setActiveTab('perkuliahan')}
              className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'perkuliahan'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="hidden sm:inline">📚 Perkuliahan</span>
              <span className="sm:hidden">📚</span>
            </button>
            <button
              onClick={() => setActiveTab('karya_akhir')}
              className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'karya_akhir'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="hidden sm:inline">🎓 Karya Akhir</span>
              <span className="sm:hidden">🎓</span>
            </button>
            <button
              onClick={() => setActiveTab('lain_lain')}
              className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'lain_lain'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="hidden sm:inline">📋 Lain-lain</span>
              <span className="sm:hidden">📋</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-3 md:p-6">
          {activeTab === 'perkuliahan' && (
            <JadwalTab
              data={jadwalPerkuliahan}
              loading={loading}
              error={error}
              jenis="perkuliahan"
              onEdit={openEditModal}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
            />
          )}
          {activeTab === 'karya_akhir' && (
            <JadwalTab
              data={jadwalKaryaAkhir}
              loading={loading}
              error={error}
              jenis="karya_akhir"
              onEdit={openEditModal}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
            />
          )}
          {activeTab === 'lain_lain' && (
            <JadwalTab
              data={jadwalLainLain}
              loading={loading}
              error={error}
              jenis="lain_lain"
              onEdit={openEditModal}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
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
              onChange={(v) => handleChange('mulai_jadwal', v)}
            />
            <DateTimeField
              label="Waktu Selesai"
              value={form.akhir_jadwal}
              onChange={(v) => handleChange('akhir_jadwal', v)}
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
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Download Modal */}
      {/* Import Modal */}
      <ImportJadwal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        jenis={importJenisTab}
        options={options}
        userName={userRole?.name || 'Unknown'}
        onSuccess={fetchAllData}
      />

      {downloadModalOpen && (
        <Modal
          onClose={() => {
            setDownloadModalOpen(false);
            setDownloadJenisTab(null);
          }}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Download Jadwal{' '}
              {downloadJenisTab
                ? `- ${downloadJenisTab === 'perkuliahan' ? 'Perkuliahan' : downloadJenisTab === 'karya_akhir' ? 'Karya Akhir' : 'Lain-lain'}`
                : ''}
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={downloadType === 'all'}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  {downloadJenisTab ? 'Semua Data di Tab Ini' : 'Semua Data'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="date"
                  checked={downloadType === 'date'}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  Berdasarkan Tanggal
                </span>
              </label>
              {downloadType === 'date' && (
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
                  checked={downloadType === 'month'}
                  onChange={(e) => setDownloadType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  Berdasarkan Bulan
                </span>
              </label>
              {downloadType === 'month' && (
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
                onClick={() => {
                  setDownloadModalOpen(false);
                  setDownloadJenisTab(null);
                }}
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
function JadwalTab({
  data,
  loading,
  error,
  jenis,
  onEdit,
  onDelete,
  onBulkDelete,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter berdasarkan search saja (tanpa filter tanggal)
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) => {
        const agenda = (d.agenda_display || '').toLowerCase();
        const ruangan = (d.nama_ruangan || '').toLowerCase();
        const keterangan = (d.keterangan || '').toLowerCase();
        const mulaiFormatted = (d.mulai_formatted || '').toLowerCase();
        const akhirFormatted = (d.akhir_formatted || '').toLowerCase();
        const angkatan = (d.nama_angkatan || '').toLowerCase();
        const namaMahasiswa = (d.nama_mahasiswa || '').toLowerCase();
        const namaUser = (d.nama_user || '').toLowerCase();

        return (
          agenda.includes(query) ||
          ruangan.includes(query) ||
          keterangan.includes(query) ||
          mulaiFormatted.includes(query) ||
          akhirFormatted.includes(query) ||
          angkatan.includes(query) ||
          namaMahasiswa.includes(query) ||
          namaUser.includes(query)
        );
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.last_modified) - new Date(a.last_modified)
    );
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
    setSearchInput('');
    setSearchQuery('');
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
        {jenis === 'perkuliahan' && (
          <button
            onClick={() =>
              window.openAddModal ? window.openAddModal('perkuliahan') : null
            }
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Perkuliahan">
              📚
            </span>{' '}
            + Perkuliahan
          </button>
        )}
        {jenis === 'karya_akhir' && (
          <button
            onClick={() =>
              window.openAddModal ? window.openAddModal('karya_akhir') : null
            }
            className="px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Karya Akhir">
              🎓
            </span>{' '}
            + Karya Akhir
          </button>
        )}
        {jenis === 'lain_lain' && (
          <button
            onClick={() =>
              window.openAddModal ? window.openAddModal('lain_lain') : null
            }
            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            type="button"
          >
            <span role="img" aria-label="Lain-lain">
              📋
            </span>{' '}
            + Lain-lain
          </button>
        )}
        {/* Import CSV/Excel */}
        <button
          onClick={() =>
            window.openImportModal ? window.openImportModal(jenis) : null
          }
          className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          type="button"
        >
          <svg
            className="w-4 h-4 inline-block mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import
        </button>
        {/* Download paling kanan, setelah CRUD - download sesuai tab aktif */}
        <button
          onClick={() =>
            window.openDownloadModal ? window.openDownloadModal(jenis) : null
          }
          className="px-4 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4 inline-block mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download
        </button>
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex-wrap">
          <span className="text-sm font-medium text-red-700">
            {selectedIds.length} dari {filteredData.length} data dipilih
          </span>
          {selectedIds.length < filteredData.length && (
            <button
              onClick={() => setSelectedIds(filteredData.map((r) => r.id))}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors"
              type="button"
            >
              ✅ Pilih Semua ({filteredData.length} data)
            </button>
          )}
          <button
            onClick={() => {
              onBulkDelete(selectedIds, jenis);
              setSelectedIds([]);
            }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            type="button"
          >
            🗑️ Hapus {selectedIds.length} Data
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            type="button"
          >
            Batal Pilih
          </button>
        </div>
      )}

      {/* Info hasil search */}
      {searchQuery && (
        <div className="text-sm text-slate-600">
          Hasil pencarian:{' '}
          <span className="font-medium text-indigo-600">"{searchQuery}"</span>
        </div>
      )}

      {filteredData.length === 0 ? (
        <EmptyState
          text={
            searchQuery
              ? 'Tidak ada hasil pencarian.'
              : 'Belum ada data jadwal.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="py-3 px-2 border border-slate-300 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded cursor-pointer accent-white"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((r) => selectedIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [
                            ...new Set([
                              ...prev,
                              ...paginatedData.map((r) => r.id),
                            ]),
                          ]);
                        } else {
                          const pageIds = paginatedData.map((r) => r.id);
                          setSelectedIds((prev) =>
                            prev.filter((id) => !pageIds.includes(id))
                          );
                        }
                      }}
                    />
                  </th>
                  {jenis === 'perkuliahan' && (
                    <>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Angkatan
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Waktu
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Mata Kuliah
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Tempat
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Jenis
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Dosen
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Dibuat/Diedit
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Aksi
                      </th>
                    </>
                  )}
                  {jenis === 'karya_akhir' && (
                    <>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Nama Mahasiswa
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Waktu
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Agenda
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Dosen Pembimbing
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Penguji / Moderator
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Ruangan
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Jenis
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Dibuat/Diedit
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Aksi
                      </th>
                    </>
                  )}
                  {jenis === 'lain_lain' && (
                    <>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Nama User
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Waktu
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Agenda
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Tempat
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Jenis
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Dibuat/Diedit
                      </th>
                      <th className="py-3 px-4 font-semibold text-center border border-slate-300">
                        Aksi
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-200 transition-colors ${selectedIds.includes(row.id) ? 'bg-red-50' : 'hover:bg-blue-100'}`}
                  >
                    <td className="py-3 px-2 border border-slate-200 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, row.id]);
                          } else {
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== row.id)
                            );
                          }
                        }}
                      />
                    </td>
                    {jenis === 'perkuliahan' && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">
                            {row.nama_angkatan}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="text-xs font-medium text-slate-800">
                            {row.mulai_jadwal
                              ? formatDate(new Date(row.mulai_jadwal))
                              : '-'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatTime(row.mulai_jadwal)} -{' '}
                            {formatTime(row.akhir_jadwal)}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">
                            {row.nama_matkul || row.agenda_display}
                          </div>
                          {row.paralel && row.paralel !== '-' && (
                            <div className="text-xs text-slate-500">
                              Paralel: {row.paralel}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">
                            {row.nama_ruangan}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              row.jenis_pertemuan === 'daring'
                                ? 'bg-blue-100 text-blue-700'
                                : row.jenis_pertemuan === 'hybrid'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.jenis_pertemuan === 'daring' && '🌐 Daring'}
                            {row.jenis_pertemuan === 'luring' && '🏢 Luring'}
                            {row.jenis_pertemuan === 'hybrid' && '🔄 Hybrid'}
                            {!row.jenis_pertemuan && '🏢 Luring'}
                          </span>
                          {(row.jenis_pertemuan === 'hybrid' ||
                            row.jenis_pertemuan === 'daring') &&
                            row.zoom_id && (
                              <div className="mt-1 text-xs text-slate-600">
                                <div className="font-semibold">
                                  Zoom ID: {row.zoom_id}
                                </div>
                                {row.zoom_password && (
                                  <div>Pass: {row.zoom_password}</div>
                                )}
                              </div>
                            )}
                          {row.petugas_zoom && row.petugas_zoom !== '-' && (
                            <div className="mt-1 text-xs text-slate-500">
                              Petugas: {row.petugas_zoom}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="max-w-[200px]">
                            <div className="text-xs font-medium text-slate-800">
                              {row.nama_dosen}
                            </div>
                            {row.dosen_tambahan_names &&
                              row.dosen_tambahan_names.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {row.dosen_tambahan_names.map((name, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-full"
                                    >
                                      D{idx + 2}. {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            {row.moderator && row.moderator !== '-' && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Mod: {row.moderator}
                              </div>
                            )}
                            {row.penguji_names &&
                              row.penguji_names.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {row.penguji_names.map((name, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-600 rounded-full"
                                    >
                                      P{idx + 1}. {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </td>
                      </>
                    )}
                    {jenis === 'karya_akhir' && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">
                            {row.nama_mahasiswa}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="text-xs font-medium text-slate-800">
                            {row.mulai_jadwal
                              ? formatDate(new Date(row.mulai_jadwal))
                              : '-'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatTime(row.mulai_jadwal)} -{' '}
                            {formatTime(row.akhir_jadwal)}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">
                            {row.agenda_display}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="max-w-[200px]">
                            {row.dosen_names && row.dosen_names.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.dosen_names.map((name, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full"
                                  >
                                    {idx + 1}. {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="max-w-[180px]">
                            {row.penguji_names &&
                              row.penguji_names.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {row.penguji_names.map((name, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-600 rounded-full"
                                    >
                                      P{idx + 1}. {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            {row.moderator && row.moderator !== '-' && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Mod: {row.moderator}
                              </div>
                            )}
                            {(!row.penguji_names ||
                              row.penguji_names.length === 0) &&
                              (!row.moderator || row.moderator === '-') && (
                                <span className="text-slate-400 text-xs">
                                  -
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">
                            {row.nama_ruangan}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              row.jenis_pertemuan === 'daring'
                                ? 'bg-blue-100 text-blue-700'
                                : row.jenis_pertemuan === 'hybrid'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.jenis_pertemuan === 'daring' && '🌐 Daring'}
                            {row.jenis_pertemuan === 'luring' && '🏢 Luring'}
                            {row.jenis_pertemuan === 'hybrid' && '🔄 Hybrid'}
                            {!row.jenis_pertemuan && '🏢 Luring'}
                          </span>
                          {(row.jenis_pertemuan === 'hybrid' ||
                            row.jenis_pertemuan === 'daring') &&
                            row.zoom_id && (
                              <div className="mt-1 text-xs text-slate-600">
                                <div className="font-semibold">
                                  Zoom ID: {row.zoom_id}
                                </div>
                                {row.zoom_password && (
                                  <div>Pass: {row.zoom_password}</div>
                                )}
                              </div>
                            )}
                          {row.petugas_zoom && row.petugas_zoom !== '-' && (
                            <div className="mt-1 text-xs text-slate-500">
                              Petugas: {row.petugas_zoom}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                    {jenis === 'lain_lain' && (
                      <>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="font-semibold text-slate-800">
                            {row.nama_user || row.keterangan}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="text-xs font-medium text-slate-800">
                            {row.mulai_jadwal
                              ? formatDate(new Date(row.mulai_jadwal))
                              : '-'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatTime(row.mulai_jadwal)} -{' '}
                            {formatTime(row.akhir_jadwal)}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <div className="font-semibold text-slate-900">
                            {row.agenda || row.agenda_display}
                          </div>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span className="text-slate-800">
                            {row.nama_ruangan}
                          </span>
                        </td>
                        <td className="py-3 px-4 border border-slate-200">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              row.jenis_pertemuan === 'daring'
                                ? 'bg-blue-100 text-blue-700'
                                : row.jenis_pertemuan === 'hybrid'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.jenis_pertemuan === 'daring' && '🌐 Daring'}
                            {row.jenis_pertemuan === 'luring' && '🏢 Luring'}
                            {row.jenis_pertemuan === 'hybrid' && '🔄 Hybrid'}
                            {!row.jenis_pertemuan && '🏢 Luring'}
                          </span>
                          {row.jenis_pertemuan === 'hybrid' && row.zoom_id && (
                            <div className="mt-1 text-xs text-slate-600">
                              <div className="font-semibold">
                                Zoom ID: {row.zoom_id}
                              </div>
                              {row.zoom_password && (
                                <div>Pass: {row.zoom_password}</div>
                              )}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 border border-slate-200">
                      <div className="min-w-[150px] flex flex-col gap-1">
                        {row.created_by && row.created_by !== '-' ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-green-500 text-xs">➕</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {row.created_by}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 ml-4">
                              {new Date(
                                row.created_at || row.last_modified
                              ).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </div>
                          </div>
                        ) : null}
                        {row.updated_by &&
                        row.updated_by !== '-' &&
                        row.updated_at &&
                        row.updated_at !== row.created_at ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-blue-500 text-xs">✏️</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {row.updated_by}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 ml-4">
                              {new Date(row.updated_at).toLocaleString(
                                'id-ID',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                }
                              )}
                            </div>
                          </div>
                        ) : null}
                        {(!row.created_by || row.created_by === '-') &&
                          (!row.updated_by || row.updated_by === '-') && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-center">
                      {/* 🎯 Menggunakan komponen ActionButtons yang reusable */}
                      <ActionButtons
                        onEdit={onEdit}
                        onDelete={onDelete}
                        row={row}
                      />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, displayKey }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Pilih {label}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {typeof displayKey === 'function'
              ? displayKey(opt)
              : opt[displayKey]}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateTimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}
