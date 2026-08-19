'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface CashFlowMonth {
  month:   string;
  inflow:  number;
  outflow: number;
  net:     number;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export default function CashFlowChartComponent({ data }: { data: CashFlowMonth[] }) {
  const formatted = data.map((d) => ({
    ...d,
    month:   formatMonthLabel(d.month),
    inflow:  Math.round(d.inflow / 1000),
    outflow: Math.round(d.outflow / 1000),
    net:     Math.round(d.net / 1000),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
        borderRadius: 8, padding: '12px 16px', fontSize: 12,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              ₹{Math.abs(p.value)}K
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `₹${Math.abs(v)}K`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 12 }}
          formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
        />
        <Bar dataKey="inflow"  name="Inflow"  fill="var(--chart-inflow)" radius={[3,3,0,0]} opacity={0.85} />
        <Bar dataKey="outflow" name="Outflow" fill="var(--chart-outflow)" radius={[3,3,0,0]} opacity={0.85} />
        <Line dataKey="net" name="Net" stroke="var(--chart-net)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
