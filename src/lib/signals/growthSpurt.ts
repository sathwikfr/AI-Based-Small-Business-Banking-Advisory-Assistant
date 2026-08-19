// src/lib/signals/growthSpurt.ts
// GROWTH_SPURT — revenue up 20%+ over rolling 3 months vs prior 3 months.
// Opportunity signal: business may need working capital to sustain expansion.

import { DetectorInput, DetectorResult } from './types';
import { groupByMonth, sum } from './utils';

export function detectGrowthSpurt(input: DetectorInput): DetectorResult | null {
  const inflows = input.transactions.filter((t) => t.direction === 'inflow');
  const byMonth = groupByMonth(inflows);
  const months  = [...byMonth.values()];

  if (months.length < 6) return null;

  const recent = months.slice(-3).map((txs) => sum(txs));
  const prior  = months.slice(-6, -3).map((txs) => sum(txs));

  const recentTotal = recent.reduce((a, b) => a + b, 0);
  const priorTotal  = prior.reduce((a, b) => a + b, 0);

  if (priorTotal === 0) return null;

  const growthPct = (recentTotal - priorTotal) / priorTotal;

  if (growthPct < 0.18) return null;

  return {
    code:        'GROWTH_SPURT',
    type:        'opportunity',
    severity:    growthPct >= 0.40 ? 'high' : growthPct >= 0.28 ? 'medium' : 'low',
    metricValue: growthPct * 100,
    metricLabel: `Revenue up ${(growthPct * 100).toFixed(0)}% over rolling 3 months`,
  };
}
