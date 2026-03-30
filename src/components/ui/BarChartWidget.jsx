/**
 * BarChartWidget – Weekly jadwal bar chart (Recharts)
 * Matches Figma: Statistik Jadwal 7 Hari Terakhir
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const BAR_COLOR = '#3b82f6';
const BAR_HOVER = '#2563eb';

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
      {payload[0].value} jadwal
    </div>
  );
};

export default function BarChartWidget({ data = [], loading = false }) {
  // Transform data to have day labels
  const chartData = DAYS.map((day, i) => ({
    day,
    count: data[i] ?? 0,
  }));

  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barCategoryGap="25%">
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
          cursor={{ fill: 'rgba(59,130,246,0.05)' }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
