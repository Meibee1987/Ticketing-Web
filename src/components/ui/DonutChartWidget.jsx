/**
 * DonutChartWidget – Luring vs Online vs Hybrid donut (Recharts)
 * Matches Figma: Penggunaan Ruangan with percentage labels
 */
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = {
  Luring: '#3b82f6',
  Online: '#6366f1',
  Hybrid: '#8b5cf6',
};

export default function DonutChartWidget({
  luring = 0,
  online = 0,
  hybrid = 0,
  loading = false,
}) {
  const total = luring + online + hybrid || 1;
  const luringPct = Math.round((luring / total) * 100);
  const onlinePct = Math.round((online / total) * 100);
  const hybridPct = 100 - luringPct - onlinePct;

  const data = [
    { name: 'Luring', value: luring || 0 },
    { name: 'Online', value: online || 0 },
    { name: 'Hybrid', value: hybrid || 0 },
  ].filter((d) => d.value > 0);

  // If all zero, show a placeholder ring
  if (data.length === 0) {
    data.push({ name: 'Kosong', value: 1 });
  }

  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine the dominant type for center label
  const dominant =
    luring >= online && luring >= hybrid
      ? { pct: luringPct, label: 'Luring' }
      : online >= hybrid
        ? { pct: onlinePct, label: 'Online' }
        : { pct: hybridPct, label: 'Hybrid' };

  return (
    <div className="flex flex-col items-center">
      {/* Donut */}
      <div className="relative w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={data.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#e2e8f0'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">
            {dominant.pct}%
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {dominant.label}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
        {luring > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: COLORS.Luring }}
            />
            <span className="text-sm text-slate-600 font-medium">Luring</span>
            <span className="text-sm font-bold text-slate-900 ml-1">
              {luringPct}%
            </span>
          </div>
        )}
        {online > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: COLORS.Online }}
            />
            <span className="text-sm text-slate-600 font-medium">Online</span>
            <span className="text-sm font-bold text-slate-900 ml-1">
              {onlinePct}%
            </span>
          </div>
        )}
        {hybrid > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: COLORS.Hybrid }}
            />
            <span className="text-sm text-slate-600 font-medium">Hybrid</span>
            <span className="text-sm font-bold text-slate-900 ml-1">
              {hybridPct}%
            </span>
          </div>
        )}
        {luring === 0 && online === 0 && hybrid === 0 && (
          <span className="text-sm text-slate-400">Tidak ada data</span>
        )}
      </div>
    </div>
  );
}
