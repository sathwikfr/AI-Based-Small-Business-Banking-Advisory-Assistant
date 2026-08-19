'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function HealthTimelineChartComponent({ data }: { data: { score: number; computedAt: string }[] }) {
  if (data.length < 2) return null;
  const formatted = data.map((d) => ({
    date: new Date(d.computedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    score: d.score,
  }));
  return (
    <div style={{ marginTop: 12 }}>
      {(() => {
        const earliest = data[0].score;
        const latest = data[data.length - 1].score;
        const diff = latest - earliest;
        const diffAbs = Math.abs(diff);
        let copy = `Health has remained stable over the last 30 days.`;
        if (diff > 0) copy = `Health has improved by ${diffAbs} point${diffAbs === 1 ? '' : 's'} over the last 30 days.`;
        else if (diff < 0) copy = `Health has declined by ${diffAbs} point${diffAbs === 1 ? '' : 's'} over the last 30 days.`;
        return (
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
            {copy}
          </div>
        );
      })()}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Health Trend</div>
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip 
            contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-panel-alt)', border: '1px solid var(--border-hair)' }}
            labelStyle={{ display: 'none' }}
          />
          <Line type="monotone" dataKey="score" stroke="var(--chart-line)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
