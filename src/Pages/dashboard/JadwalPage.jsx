/**
 * ================================================================================
 * FILE: JadwalPage.jsx
 * DESKRIPSI: Halaman VIEW ONLY jadwal dengan 3 tab (Perkuliahan, Karya Akhir, Lain-lain)
 * ================================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, ClipboardList, GraduationCap } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { assertSupabaseResults } from '../../utils/supabaseResults';
import DateNavigator from '../../components/ui/DateNavigator';
import StatePanel from '../../components/ui/StatePanel';

// ================================================================================
// HELPER FUNCTIONS & CONSTANTS
// ================================================================================

const INITIAL_STATE = { jadwal: [], loading: true, error: null };
const TAB_ICONS = {
  perkuliahan: BookOpen,
  karya_akhir: GraduationCap,
  lain_lain: ClipboardList,
};

// Helper untuk format timestamp ke tampilan "DD MMM YYYY, HH:MM"
const formatTimestamp = (ts) => {
  if (!ts || ts === '-') return '-';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return (
      date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ', ' +
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

// ================================================================================
// KOMPONEN UTAMA: JadwalPage (VIEW ONLY)
// ================================================================================
export default function JadwalPage() {
  const [activeTab, setActiveTab] = useState('perkuliahan');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const tabs = [
    { id: 'perkuliahan', label: 'Jadwal Perkuliahan' },
    { id: 'karya_akhir', label: 'Jadwal Karya Akhir' },
    { id: 'lain_lain', label: 'Jadwal Lain-lain' },
  ];

  const TabComponent = {
    perkuliahan: JadwalTable,
    karya_akhir: JadwalKaryaAkhirTable,
    lain_lain: JadwalLainLainTable,
  }[activeTab];

  const handleDateChange = (e) => {
    setSelectedDate(new Date(e.target.value + 'T00:00:00'));
  };

  const goToToday = () => setSelectedDate(new Date());
  const goToPrevDay = () =>
    setSelectedDate((prev) => new Date(prev.getTime() - 86400000));
  const goToNextDay = () =>
    setSelectedDate((prev) => new Date(prev.getTime() + 86400000));

  const isToday = isSameDate(selectedDate, new Date());

  return (
    <div className="ui-page">
      {/* Date Filter */}
      <DateNavigator
        value={formatDateInput(selectedDate)}
        label={formatDate(selectedDate)}
        isToday={isToday}
        onChange={handleDateChange}
        onPrevious={goToPrevDay}
        onNext={goToNextDay}
        onToday={goToToday}
      />

      <div className="ui-card overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="overflow-x-auto" aria-label="Kategori jadwal">
            <div className="ui-tabs" role="tablist">
              {tabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id];
                const tabIsActive = activeTab === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`ui-tab ${tabIsActive ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={tabIsActive}
                    aria-controls={`jadwal-panel-${tab.id}`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        <div
          id={`jadwal-panel-${activeTab}`}
          className="p-4 sm:p-5"
          role="tabpanel"
        >
          {TabComponent && <TabComponent selectedDate={selectedDate} />}
        </div>
      </div>
    </div>
  );
}

// ================================================================================
// KOMPONEN: PageHeader
// ================================================================================
// ================================================================================
// KOMPONEN UI SHARED
// ================================================================================
const LoadingState = () => (
  <StatePanel
    type="loading"
    title="Memuat jadwal"
    description="Data jadwal sedang disiapkan."
  />
);

const ErrorState = ({ message }) => (
  <StatePanel type="error" description={message} />
);

const EmptyState = ({ text = 'Belum ada data jadwal.' }) => (
  <div className="text-center py-12">
    <svg
      className="mx-auto h-12 w-12 text-slate-400 mb-2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

// Table Wrapper (View Only - tanpa tombol tambah)
function TableWrapper({ title, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="ui-card-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// Data Table (View Only - responsive dengan card layout untuk mobile)
function ViewDataTable({ data, columns }) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="ui-table-wrap hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={col.center ? 'text-center' : 'text-left'}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((col, i) => (
                  <td key={i}>
                    {col.render ? col.render(row) : row[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {columns.map((col, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <span className="text-xs font-semibold text-slate-600">
                  {col.label}:{' '}
                </span>
                <span className="text-sm text-slate-800">
                  {col.render ? col.render(row) : row[col.key] || '-'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ================================================================================
// SECTION: JADWAL PERKULIAHAN (VIEW ONLY dengan Realtime)
// ================================================================================
function useJadwal() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data, error } = await supabase
        .from('jadwal_perkuliahan')
        .select('*, dosen(*), ruangan(*), angkatan(*), mata_kuliah(*)')
        .order('mulai_jadwal');

      if (error) throw error;

      const merged = (data || []).map((r) => ({
        ...r,
        nama_dosen: r.dosen?.nama_dosen || '-',
        nama_ruangan: r.ruangan?.nama_ruangan || '-',
        nama_angkatan: r.angkatan?.nama_angkatan || '-',
        nama_matkul:
          r.mata_kuliah?.mata_kuliah || r.mata_kuliah?.nama_matkul || '-',
        mulai_jadwal: r.mulai_jadwal || '-',
        akhir_jadwal: r.akhir_jadwal || '-',
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching jadwal:', err);
      setState({
        jadwal: [],
        loading: false,
        error: err.message || 'Gagal mengambil data',
      });
    }
  }, []);

  useEffect(() => {
    fetchJadwal();

    // Realtime subscription
    const channel = supabase
      .channel('jadwal_perkuliahan_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jadwal_perkuliahan' },
        () => {
          fetchJadwal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJadwal]);

  return state;
}

function JadwalTable({ selectedDate }) {
  const { jadwal, loading, error } = useJadwal();

  // Filter jadwal berdasarkan tanggal yang dipilih
  const filteredJadwal = jadwal.filter((j) => {
    if (!j.mulai_jadwal) return false;
    const jadwalDate = new Date(j.mulai_jadwal);
    return isSameDate(jadwalDate, selectedDate);
  });

  const columns = [
    {
      label: 'Angkatan',
      render: (r) => (
        <span className="font-semibold text-slate-800">{r.nama_angkatan}</span>
      ),
    },
    {
      label: 'Mulai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.mulai_jadwal)}
        </span>
      ),
    },
    {
      label: 'Selesai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.akhir_jadwal)}
        </span>
      ),
    },
    {
      label: 'Agenda',
      render: (r) => (
        <>
          <div className="font-semibold text-slate-900">{r.nama_matkul}</div>
          <div className="text-xs text-slate-600">{r.nama_dosen}</div>
        </>
      ),
    },
    {
      label: 'Tempat',
      render: (r) => <span className="text-slate-800">{r.nama_ruangan}</span>,
    },
    {
      label: 'Jenis',
      render: (r) => (
        <span
          className={`meeting-badge inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            r.jenis_pertemuan === 'daring'
              ? 'bg-blue-100 text-blue-700'
              : r.jenis_pertemuan === 'hybrid'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {r.jenis_pertemuan === 'daring' && 'Daring'}
          {r.jenis_pertemuan === 'luring' && 'Luring'}
          {r.jenis_pertemuan === 'hybrid' && 'Hybrid'}
          {!r.jenis_pertemuan && 'Luring'}
        </span>
      ),
    },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Perkuliahan">
      {filteredJadwal.length === 0 ? (
        <EmptyState
          text={`Tidak ada jadwal perkuliahan pada ${formatDate(selectedDate)}.`}
        />
      ) : (
        <ViewDataTable data={filteredJadwal} columns={columns} />
      )}
    </TableWrapper>
  );
}

// ================================================================================
// SECTION: JADWAL KARYA AKHIR (VIEW ONLY dengan Realtime)
// ================================================================================
function useJadwalKaryaAkhir() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const [jadwalRes, ruanganRes, agendaRes] = await Promise.all([
        supabase.from('jadwal_karya_akhir').select('*').order('mulai_jadwal'),
        supabase.from('ruangan').select('id, nama_ruangan'),
        supabase.from('agenda_karya_akhir').select('id, agenda_karya_akhir'),
      ]);

      assertSupabaseResults([
        ['Jadwal karya akhir', jadwalRes],
        ['Referensi ruangan', ruanganRes],
        ['Referensi agenda', agendaRes],
      ]);

      const ruanganMap = Object.fromEntries(
        (ruanganRes.data || []).map((r) => [r.id, r.nama_ruangan])
      );
      const agendaMap = Object.fromEntries(
        (agendaRes.data || []).map((a) => [a.id, a.agenda_karya_akhir])
      );

      const merged = (jadwalRes.data || []).map((j) => ({
        ...j,
        display_ruangan: ruanganMap[j.nama_ruangan] || '-',
        display_mahasiswa: j.nama_mahasiswa || '-',
        display_agenda: agendaMap[j.agenda_jadwal_karya_akhir] || '-',
        mulai_jadwal: j.mulai_jadwal || '-',
        akhir_jadwal: j.akhir_jadwal || '-',
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching jadwal karya akhir:', err);
      setState({
        jadwal: [],
        loading: false,
        error: err.message || 'Gagal mengambil data',
      });
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the external schedule data source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJadwal();

    // Realtime subscription
    const channel = supabase
      .channel('jadwal_karya_akhir_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jadwal_karya_akhir' },
        () => {
          fetchJadwal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJadwal]);

  return state;
}

function JadwalKaryaAkhirTable({ selectedDate }) {
  const { jadwal, loading, error } = useJadwalKaryaAkhir();

  // Filter jadwal berdasarkan tanggal yang dipilih
  const filteredJadwal = jadwal.filter((j) => {
    if (!j.mulai_jadwal) return false;
    const jadwalDate = new Date(j.mulai_jadwal);
    return isSameDate(jadwalDate, selectedDate);
  });

  const columns = [
    {
      label: 'Nama Mahasiswa',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.display_mahasiswa}
        </span>
      ),
    },
    {
      label: 'Mulai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.mulai_jadwal)}
        </span>
      ),
    },
    {
      label: 'Selesai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.akhir_jadwal)}
        </span>
      ),
    },
    {
      label: 'Agenda',
      render: (r) => (
        <div className="font-semibold text-slate-900">{r.display_agenda}</div>
      ),
    },
    {
      label: 'Ruangan',
      render: (r) => (
        <span className="text-slate-800">{r.display_ruangan}</span>
      ),
    },
    {
      label: 'Jenis',
      render: (r) => (
        <span
          className={`meeting-badge inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            r.jenis_pertemuan === 'daring'
              ? 'bg-blue-100 text-blue-700'
              : r.jenis_pertemuan === 'hybrid'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {r.jenis_pertemuan === 'daring' && 'Daring'}
          {r.jenis_pertemuan === 'luring' && 'Luring'}
          {r.jenis_pertemuan === 'hybrid' && 'Hybrid'}
          {!r.jenis_pertemuan && 'Luring'}
        </span>
      ),
    },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Karya Akhir">
      {filteredJadwal.length === 0 ? (
        <EmptyState
          text={`Tidak ada jadwal karya akhir pada ${formatDate(selectedDate)}.`}
        />
      ) : (
        <ViewDataTable data={filteredJadwal} columns={columns} />
      )}
    </TableWrapper>
  );
}

// ================================================================================
// SECTION: JADWAL LAIN-LAIN (VIEW ONLY dengan Realtime)
// ================================================================================
function useJadwalLainLain() {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchJadwal = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const [jadwalRes, ruanganRes] = await Promise.all([
        supabase.from('jadwal_lain_lain').select('*').order('mulai_jadwal'),
        supabase.from('ruangan').select('id, nama_ruangan'),
      ]);

      assertSupabaseResults([
        ['Jadwal lain-lain', jadwalRes],
        ['Referensi ruangan', ruanganRes],
      ]);

      const ruanganMap = Object.fromEntries(
        (ruanganRes.data || []).map((r) => [r.id, r.nama_ruangan])
      );

      const merged = (jadwalRes.data || []).map((j) => ({
        ...j,
        ruangan_display: ruanganMap[j.nama_ruangan] || '-',
        user_display: j.nama_user || '-',
        mulai_jadwal: j.mulai_jadwal || '-',
        akhir_jadwal: j.akhir_jadwal || '-',
      }));
      setState({ jadwal: merged, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching jadwal lain-lain:', err);
      setState({
        jadwal: [],
        loading: false,
        error: err.message || 'Gagal mengambil data',
      });
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the external schedule data source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJadwal();

    // Realtime subscription
    const channel = supabase
      .channel('jadwal_lain_lain_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jadwal_lain_lain' },
        () => {
          fetchJadwal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJadwal]);

  return state;
}

function JadwalLainLainTable({ selectedDate }) {
  const { jadwal, loading, error } = useJadwalLainLain();

  // Filter jadwal berdasarkan tanggal yang dipilih
  const filteredJadwal = jadwal.filter((j) => {
    if (!j.mulai_jadwal) return false;
    const jadwalDate = new Date(j.mulai_jadwal);
    return isSameDate(jadwalDate, selectedDate);
  });

  const columns = [
    {
      label: 'Nama User',
      render: (r) => (
        <span className="font-semibold text-slate-800">{r.user_display}</span>
      ),
    },
    {
      label: 'Mulai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.mulai_jadwal)}
        </span>
      ),
    },
    {
      label: 'Selesai',
      render: (r) => (
        <span className="font-medium text-slate-800 text-xs">
          {formatTimestamp(r.akhir_jadwal)}
        </span>
      ),
    },
    {
      label: 'Agenda',
      render: (r) => (
        <div className="font-semibold text-slate-900">{r.agenda || '-'}</div>
      ),
    },
    {
      label: 'Tempat',
      render: (r) => (
        <span className="text-slate-800">{r.ruangan_display}</span>
      ),
    },
    {
      label: 'Jenis',
      render: (r) => (
        <span
          className={`meeting-badge inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            r.jenis_pertemuan === 'daring'
              ? 'bg-blue-100 text-blue-700'
              : r.jenis_pertemuan === 'hybrid'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {r.jenis_pertemuan === 'daring' && 'Daring'}
          {r.jenis_pertemuan === 'luring' && 'Luring'}
          {r.jenis_pertemuan === 'hybrid' && 'Hybrid'}
          {!r.jenis_pertemuan && 'Luring'}
        </span>
      ),
    },
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <TableWrapper title="Jadwal Lain-lain">
      {filteredJadwal.length === 0 ? (
        <EmptyState
          text={`Tidak ada jadwal lain-lain pada ${formatDate(selectedDate)}.`}
        />
      ) : (
        <ViewDataTable data={filteredJadwal} columns={columns} />
      )}
    </TableWrapper>
  );
}
