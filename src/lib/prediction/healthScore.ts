import { Signal } from '@prisma/client';

export function computeHealthScore(activeSignals: Signal[]): { score: number; driverCode: string | null } {
  let score = 100;
  
  const weights: Record<string, number> = {
    high:   -15,
    medium: -8,
    low:    -3,
  };
  
  const opportunityBonus: Record<string, number> = {
    high: 5, 
    medium: 3, 
    low: 1,
  };

  let worstImpact = 0;
  let driverCode: string | null = null;

  for (const signal of activeSignals) {
    const impact = signal.type === 'stress'
      ? (weights[signal.severity] || -3)
      : (opportunityBonus[signal.severity] || 1);
      
    score += impact;
    
    // Track the biggest mover (mostly stress, but opportunity if no stress exists)
    if (Math.abs(impact) > Math.abs(worstImpact)) {
      worstImpact = impact;
      driverCode = signal.code;
    }
  }

  return { 
    score: Math.max(0, Math.min(100, Math.round(score))), 
    driverCode 
  };
}

export function getHealthLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Stable, monitor';
  if (score >= 40) return 'Needs attention';
  return 'At risk';
}
