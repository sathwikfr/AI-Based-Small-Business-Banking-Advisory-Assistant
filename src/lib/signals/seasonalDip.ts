// src/lib/signals/seasonalDip.ts
// SEASONAL_DIP_APPROACHING — compare current month + next 2 months to same window last year.
// Flag if YoY inflow delta < -20%.

import { DetectorInput, DetectorResult } from './types';
import { groupByMonth, sum } from './utils';

export function detectSeasonalDip(input: DetectorInput): DetectorResult | null {
  const inflows = input.transactions.filter((t) => t.direction === 'inflow');
  if (inflows.length < 12) return null;

  const byMonth = groupByMonth(inflows);

  const now      = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  // Look at this month + next 2 months vs same window last year
  let thisYearTotal = 0;
  let lastYearTotal = 0;
  let monthsFound   = 0;

  for (let offset = 0; offset < 3; offset++) {
    const m = ((thisMonth - 1 + offset) % 12) + 1;
    const y = thisMonth + offset > 12 ? thisYear + 1 : thisYear;

    const thisKey = `${y}-${String(m).padStart(2, '0')}`;
    const lastKey = `${y - 1}-${String(m).padStart(2, '0')}`;

    const thisTxs = byMonth.get(thisKey);
    const lastTxs = byMonth.get(lastKey);

    if (thisTxs) { thisYearTotal += sum(thisTxs); monthsFound++; }
    if (lastTxs)  lastYearTotal += sum(lastTxs);
  }

  if (monthsFound === 0 || lastYearTotal === 0) return null;

  // Need at least some last-year data for comparison
  const lastYearMonthsKey = `${thisYear - 1}-${String(thisMonth).padStart(2, '0')}`;
  if (!byMonth.has(lastYearMonthsKey)) return null;

  const changePct = (thisYearTotal - lastYearTotal) / lastYearTotal;

  if (changePct > -0.15) return null; // only flag meaningful dips

  return {
    code:        'SEASONAL_DIP_APPROACHING',
    type:        'stress',
    severity:    changePct <= -0.35 ? 'high' : changePct <= -0.22 ? 'medium' : 'low',
    metricValue: changePct * 100,
    metricLabel: `YoY inflow ${(changePct * 100).toFixed(1)}% vs same period last year`,
  };
}
