/**
 * OverviewPage – Main Dashboard page matching Figma design
 *
 * Features:
 *   - KPI cards synced with RuanganPage logic (time-aware)
 *   - Donut chart with Luring / Online / Hybrid percentages
 *   - Real-time notification system from jadwal CRUD events
 *   - Date picker that filters ALL dashboard data
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  Date Picker                        │
 *   ├─────────┬─────────┬─────────┬───────┤
 *   │  KPI 1  │  KPI 2  │  KPI 3  │ KPI 4│
 *   ├─────────┴─────────┼─────────┴───────┤
 *   │  Bar Chart        │  Donut Chart    │
 *   ├───────────────────┼─────────────────┤
 *   │  Jadwal Hari Ini  │  Notifikasi     │
 *   └───────────────────┴─────────────────┘
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Building2,
  DoorOpen,
  GraduationCap,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';

// UI components
import KPICard from '../../components/ui/KPICard';
import ChartCard from '../../components/ui/ChartCard';
import BarChartWidget from '../../components/ui/BarChartWidget';
import DonutChartWidget from '../../components/ui/DonutChartWidget';
import DataTable from '../../components/ui/DataTable';
import NotificationPanel from '../../components/ui/NotificationPanel';
import DateNavigator from '../../components/ui/DateNavigator';

// Notification context
import { useNotifications } from '../../hooks/useNotifications';

// Data layer
import {
  fetchDashboardKPI,
  fetchWeeklyStats,
  fetchJenisPertemuanStats,
  fetchJadwalHariIni,
  subscribeJadwalChanges,
} from '../../data/dashboard';

// ── Helpers ──
const isSameDate = (d1, d2) => d1.toDateString() === d2.toDateString();
const formatDateInput = (d) => d.toISOString().split('T')[0];
const formatDateDisplay = (d) =>
  d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// ── Max notifications kept in state ──
const MAX_NOTIFICATIONS = 20;

export default function NewOverviewPage() {
  const navigate = useNavigate();

  // ── Date state ──
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isToday = isSameDate(selectedDate, new Date());

  // ── Global notifications from context ──
  const { notifications, dismissNotification } = useNotifications();

  // ── KPI state ──
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    totalJadwal: 0,
    ruanganUsed: 0,
    totalRuangan: 0,
    tersedia: 0,
    dosenAktif: 0,
  });
  const [prevKpi, setPrevKpi] = useState({
    totalJadwal: 0,
    ruanganUsed: 0,
    tersedia: 0,
  });

  // ── Chart state ──
  const [weeklyData, setWeeklyData] = useState([]);
  const [jenisStats, setJenisStats] = useState({
    luring: 0,
    online: 0,
    hybrid: 0,
  });
  const [chartLoading, setChartLoading] = useState(true);

  // ── Table state ──
  const [jadwalHariIni, setJadwalHariIni] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataError, setDataError] = useState('');

  // ── Auto-refresh "sedang digunakan" every 60s (same as RuanganPage) ──
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, [isToday]);

  // ── Load KPI (synced with RuanganPage) ──
  const loadKPI = useCallback(async (date) => {
    try {
      setLoading(true);
      const yesterday = new Date(date.getTime() - 86400000);

      const [todayKPI, yesterdayKPI] = await Promise.all([
        fetchDashboardKPI(date),
        fetchDashboardKPI(yesterday),
      ]);

      setKpi(todayKPI);
      setPrevKpi({
        totalJadwal: yesterdayKPI.totalJadwal,
        ruanganUsed: yesterdayKPI.ruanganUsed,
        tersedia: yesterdayKPI.tersedia,
      });
    } catch (err) {
      console.error('Error loading KPI:', err);
      setDataError(err.message || 'Gagal memuat data KPI.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load Charts ──
  const loadCharts = useCallback(async (date) => {
    try {
      setChartLoading(true);
      const [weekly, jenis] = await Promise.all([
        fetchWeeklyStats(date),
        fetchJenisPertemuanStats(date),
      ]);
      setWeeklyData(weekly);
      setJenisStats(jenis);
    } catch (err) {
      console.error('Error loading charts:', err);
      setDataError(err.message || 'Gagal memuat data grafik.');
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ── Load Table ──
  const loadTable = useCallback(async (date) => {
    try {
      const data = await fetchJadwalHariIni(date);
      setJadwalHariIni(data);
    } catch (err) {
      console.error('Error loading jadwal:', err);
      setDataError(err.message || 'Gagal memuat jadwal.');
    }
  }, []);

  // ── Load all data when selectedDate changes ──
  useEffect(() => {
    loadKPI(selectedDate);
    loadCharts(selectedDate);
    loadTable(selectedDate);
  }, [selectedDate, loadKPI, loadCharts, loadTable]);

  // ── Realtime subscription for data refresh (notifications handled by global context) ──
  useEffect(() => {
    const handleChange = () => {
      loadKPI(selectedDate);
      loadCharts(selectedDate);
      loadTable(selectedDate);
    };

    const cleanup = subscribeJadwalChanges(handleChange);
    return cleanup;
  }, [selectedDate, loadKPI, loadCharts, loadTable]);

  // ── KPI trend calculations ──
  const jadwalTrend = (() => {
    const diff = kpi.totalJadwal - prevKpi.totalJadwal;
    if (prevKpi.totalJadwal === 0) return kpi.totalJadwal > 0 ? '+100%' : null;
    const pct = Math.round((diff / prevKpi.totalJadwal) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  })();

  const ruanganUsedTrend = (() => {
    const diff = kpi.ruanganUsed - prevKpi.ruanganUsed;
    return diff >= 0 ? `+${diff}` : `${diff}`;
  })();

  const ruanganAvailDiff = kpi.tersedia - prevKpi.tersedia;
  const ruanganAvailTrend =
    ruanganAvailDiff >= 0 ? `+${ruanganAvailDiff}` : `${ruanganAvailDiff}`;

  // ── Filtered jadwal for table ──
  const filteredJadwal = searchQuery.trim()
    ? jadwalHariIni.filter((row) => {
        const q = searchQuery.toLowerCase();
        return (
          (row.nama_angkatan || '').toLowerCase().includes(q) ||
          (row.nama_matkul || row.agenda || '').toLowerCase().includes(q) ||
          (row.nama_ruangan || '').toLowerCase().includes(q) ||
          (row.nama_dosen || '').toLowerCase().includes(q)
        );
      })
    : jadwalHariIni;

  // ── Date display ──
  const dateDisplay = formatDateDisplay(selectedDate);

  // ── Dismiss notification (from context) ──
  const handleDismissNotif = dismissNotification;

  // ── Date navigation ──
  const goToPrev = () =>
    setSelectedDate((d) => new Date(d.getTime() - 86400000));
  const goToNext = () =>
    setSelectedDate((d) => new Date(d.getTime() + 86400000));
  const goToToday = () => setSelectedDate(new Date());
  const retryLoad = () => {
    setDataError('');
    loadKPI(selectedDate);
    loadCharts(selectedDate);
    loadTable(selectedDate);
  };

  return (
    <div className="ui-page">
      {dataError && (
        <section
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold">
                Sebagian data gagal dimuat
              </p>
              <p className="mt-0.5 text-xs text-danger-700">{dataError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={retryLoad}
            className="ui-button min-h-9 border border-danger-600 bg-danger-600 px-3 text-[13px] text-white hover:bg-danger-700"
          >
            Coba Lagi
          </button>
        </section>
      )}

      {/* ── Date Picker Bar ── */}
      <DateNavigator
        value={formatDateInput(selectedDate)}
        label={dateDisplay}
        isToday={isToday}
        onChange={(event) =>
          setSelectedDate(new Date(event.target.value + 'T00:00:00'))
        }
        onPrevious={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
        sticky
      />

      {/* ── 4 KPI Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        <KPICard
          title="Total Jadwal"
          value={kpi.totalJadwal}
          trend={jadwalTrend}
          trendLabel="dari kemarin"
          icon={CalendarDays}
          accent="blue"
          loading={loading}
          onClick={() => navigate('/dashboard/jadwal')}
        />
        <KPICard
          title="Ruangan Sedang Digunakan"
          value={kpi.ruanganUsed}
          trend={ruanganUsedTrend}
          trendLabel="dari kemarin"
          icon={Building2}
          accent="green"
          loading={loading}
          onClick={() => navigate('/dashboard/ruangan?filter=sedang_digunakan')}
        />
        <KPICard
          title="Ruangan Tersedia"
          value={kpi.tersedia}
          trend={ruanganAvailTrend}
          trendLabel="dari kemarin"
          icon={DoorOpen}
          accent="amber"
          loading={loading}
          onClick={() => navigate('/dashboard/ruangan?filter=tersedia')}
        />
        <KPICard
          title="Total Dosen Aktif"
          value={kpi.dosenAktif}
          trend={null}
          trendLabel=""
          icon={GraduationCap}
          accent="indigo"
          loading={loading}
        />
      </section>

      {/* ── Charts Row ── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Bar chart: 3/5 width */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Statistik Jadwal Minggu Ini"
            subtitle={`Total ${weeklyData.reduce((a, b) => a + (b.luring ?? 0) + (b.online ?? 0) + (b.hybrid ?? 0), 0)} jadwal minggu ini`}
            action={
              <button
                type="button"
                className="ui-button min-h-8 bg-primary-50 px-3 text-xs text-primary-700 hover:bg-primary-100"
              >
                Mingguan
              </button>
            }
          >
            <BarChartWidget data={weeklyData} loading={chartLoading} />
          </ChartCard>
        </div>

        {/* Donut chart: 2/5 width */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Jenis Pertemuan"
            subtitle={`Luring / Daring / Hybrid · ${dateDisplay}`}
          >
            <DonutChartWidget
              luring={jenisStats.luring}
              online={jenisStats.online}
              hybrid={jenisStats.hybrid}
              loading={chartLoading}
            />
          </ChartCard>
        </div>
      </section>

      {/* ── Table + Notifications Row ── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Jadwal table: 3/5 width */}
        <div className="lg:col-span-3">
          <div className="ui-card h-full p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="ui-card-title">
                  {isToday ? 'Jadwal Hari Ini' : `Jadwal ${dateDisplay}`}
                </h3>
                <p className="ui-description">
                  {filteredJadwal.length === jadwalHariIni.length
                    ? `${jadwalHariIni.length} sesi`
                    : `${filteredJadwal.length} dari ${jadwalHariIni.length} sesi`}
                </p>
              </div>
              <Link
                to="/dashboard/jadwal"
                className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition"
              >
                View All
                <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari angkatan, agenda, tempat, dosen..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-slate-50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Bersihkan pencarian"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Table */}
            <DataTable
              data={filteredJadwal}
              loading={loading}
              showActions={false}
            />
          </div>
        </div>

        {/* Notification panel: 2/5 width */}
        <div className="lg:col-span-2">
          <NotificationPanel
            notifications={notifications}
            onDismiss={handleDismissNotif}
          />
        </div>
      </section>
    </div>
  );
}
