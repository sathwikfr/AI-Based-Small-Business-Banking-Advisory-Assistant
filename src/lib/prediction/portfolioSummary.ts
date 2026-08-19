// src/lib/prediction/portfolioSummary.ts

export interface BusinessWithSignals {
  id: string;
  name: string;
  currentHealthScore: number;
  activeSignals: Array<{ type: string; severity: string }>;
  priorityScore: number;
  status: string;
}

export function getPortfolioSummary(businesses: BusinessWithSignals[]) {
  const needsAttention = businesses.filter(
    (b) => b.currentHealthScore < 60 || b.activeSignals.some((s) => s.type === 'stress' && s.severity === 'high')
  );
  
  const opportunities = businesses.filter(
    (b) => !needsAttention.includes(b) && b.activeSignals.some((s) => s.type === 'opportunity')
  );
  
  const stable = businesses.filter(
    (b) => !needsAttention.includes(b) && !opportunities.includes(b)
  );

  return {
    needsAttentionCount: needsAttention.length,
    opportunitiesCount: opportunities.length,
    stableCount: stable.length,
    topPriority: businesses.sort((a, b) => b.priorityScore - a.priorityScore)[0] || null,
  };
}
