// src/lib/signals/cashFlowVolatility.ts
// CASH_FLOW_VOLATILITY — std deviation of net monthly cash flow rising sharply.
// Compare σ of last 3 months net flow vs prior 3 months.

import { DetectorInput, DetectorResult } from './types';
import { groupByMonth, sum, stddev } from './utils';

export function detectCashFlowVolatility(input: DetectorInput): DetectorResult | null {
  const byMonth = groupByMonth(input.transactions);
  const months  = [...byMonth.values()];

  if (months.length < 6) return null;

  const netFlows = months.map((txs) => {
    const inflow  = sum(txs.filter((t) => t.direction === 'inflow'));
    const outflow = sum(txs.filter((t) => t.direction === 'outflow'));
    return inflow - outflow;
  });

  const recent = netFlows.slice(-3);
  const prior  = netFlows.slice(-6, -3);

  const recentSd = stddev(recent);
  const priorSd  = stddev(prior);

  if (priorSd === 0) return null;

  const changePct = (recentSd - priorSd) / Math.abs(priorSd);

  if (changePct < 0.35) return null; // < 35% increase in volatility

  return {
    code:        'CASH_FLOW_VOLATILITY',
    type:        'stress',
    severity:    changePct >= 0.80 ? 'high' : changePct >= 0.50 ? 'medium' : 'low',
    metricValue: recentSd,
    metricLabel: `Net cash flow std dev ₹${(recentSd / 1000).toFixed(1)}K (was ₹${(priorSd / 1000).toFixed(1)}K, +${(changePct * 100).toFixed(0)}%)`,
  };
}
