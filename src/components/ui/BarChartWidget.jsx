/**
 * BarChartWidget – Weekly jadwal bar chart (Recharts)
 * Shows 3 grouped bars: Luring / Online / Hybrid per day
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const COLORS = {
  luring: '#3b82f6', // blue
  daring: '#6366f1', // indigo
  hybrid: '#f59e0b', // amber
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg space-y-1">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.fill }}
          />
          <span className="capitalize">{p.dataKey}</span>
          <span className="ml-auto font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-5 mt-2">
    {[
      ['luring', 'Luring'],
      ['daring', 'Daring'],
      ['hybrid', 'Hybrid'],
    ].map(([key, label]) => (
      <div key={key} className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm inline-block"
          style={{ background: COLORS[key] }}
        />
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
    ))}
  </div>
);

export default function BarChartWidget({ data = [], loading = false }) {
  const chartData = DAYS.map((day, i) => ({
    day,
    luring: data[i]?.luring ?? 0,
    online: data[i]?.online ?? 0,
    hybrid: data[i]?.hybrid ?? 0,
  }));

  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            dx={-4}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          />
          <Bar
            dataKey="luring"
            fill={COLORS.luring}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="online"
            fill={COLORS.daring}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="hybrid"
            fill={COLORS.hybrid}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
