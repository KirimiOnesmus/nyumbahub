import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const currency = (value) => `KES ${Number(value ?? 0).toLocaleString('en-KE')}`;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-md">
      <p className="text-xs font-semibold text-slate-400 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-semibold flex items-center gap-2" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.name}: {currency(entry.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * `data` shape: [{ month: 'Jul 2026', billed: 180000, collected: 165000 }, ...]
 * Presentation-only — the parent (Revenue page) fetches and formats the data.
 */
const RevenueTrendChart = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#94A3B8', fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
        <Legend
          iconType="circle"
          formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
        />
        <Bar dataKey="billed" name="Billed" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line
          type="monotone"
          dataKey="collected"
          name="Collected"
          stroke="#1E5C2D"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#1E5C2D', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default RevenueTrendChart;