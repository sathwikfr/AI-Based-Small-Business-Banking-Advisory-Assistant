// src/lib/signals/payrollStress.ts
// PAYROLL_STRESS — payroll outflow exceeds available buffer in a given month.
// Buffer = total inflow - non-payroll outflows. If payroll > buffer, flag.

import { DetectorInput, DetectorResult } from './types';
import { groupByMonth, sum } from './utils';

export function detectPayrollStress(input: DetectorInput): DetectorResult | null {
  const byMonth = groupByMonth(input.transactions);
  const months  = [...byMonth.entries()];

  if (months.length < 3) return null;

  // Check last 3 months — flag if any month shows stress
  const recentMonths = months.slice(-3);
  let worstRatio     = 0;
  let worstLabel     = '';

  for (const [monthKey, txs] of recentMonths) {
    const totalInflow   = sum(txs.filter((t) => t.direction === 'inflow'));
    const payrollOut    = sum(txs.filter((t) => t.direction === 'outflow' && t.category === 'payroll'));
    const otherOut      = sum(txs.filter((t) => t.direction === 'outflow' && t.category !== 'payroll'));

    if (payrollOut === 0) continue;

    const buffer = totalInflow - otherOut;
    const ratio  = buffer > 0 ? payrollOut / buffer : 999;

    if (ratio > worstRatio) {
      worstRatio = ratio;
      worstLabel = `${monthKey}: payroll ₹${(payrollOut / 1000).toFixed(0)}K vs ₹${(buffer / 1000).toFixed(0)}K buffer`;
    }
  }

  if (worstRatio < 0.85) return null; // payroll is fine as long as it's < 85% of buffer

  return {
    code:        'PAYROLL_STRESS',
    type:        'stress',
    severity:    worstRatio >= 1.1 ? 'high' : worstRatio >= 0.95 ? 'medium' : 'low',
    metricValue: worstRatio,
    metricLabel: worstLabel,
  };
}
