// src/lib/signals/receivablesAging.ts
// RECEIVABLES_AGING — rolling average days-to-collect increasing over 3 months.
// Proxy: we can't calculate exact invoice-to-payment days from the transaction log alone,
// so we use "avg day-of-month on which receivables land" as DSO proxy.
// If the average collection day is getting later each month, receivables are aging.

import { DetectorInput, DetectorResult } from './types';
import { groupByMonth, trailingMonths } from './utils';

export function detectReceivablesAging(input: DetectorInput): DetectorResult | null {
  const receivables = input.transactions.filter(
    (t) => t.direction === 'inflow' && t.category === 'receivable'
  );

  if (receivables.length < 6) return null;

  const byMonth = groupByMonth(receivables);
  const months  = [...byMonth.entries()];

  if (months.length < 4) return null;

  // Compute avg collection day per month
  const avgDays = months.map(([, txs]) => {
    const days = txs.map((t) => t.date.getDate());
    return days.reduce((a, b) => a + b, 0) / days.length;
  });

  // Compare last 3 months avg vs prior 3 months avg
  const recent = avgDays.slice(-3);
  const prior  = avgDays.slice(-6, -3);

  if (prior.length < 3) return null;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const priorAvg  = prior.reduce((a, b) => a + b, 0) / prior.length;

  const changePct = (recentAvg - priorAvg) / priorAvg;

  if (changePct < 0.10) return null; // < 10% change — not significant

  return {
    code:        'RECEIVABLES_AGING',
    type:        'stress',
    severity:    changePct >= 0.30 ? 'high' : changePct >= 0.18 ? 'medium' : 'low',
    metricValue: recentAvg,
    metricLabel: `Avg collection day ${recentAvg.toFixed(1)} (was ${priorAvg.toFixed(1)}, +${(changePct * 100).toFixed(0)}%)`,
  };
}
