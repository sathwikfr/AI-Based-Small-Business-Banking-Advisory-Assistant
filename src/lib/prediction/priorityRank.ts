import { Signal, Loan } from '@prisma/client';

export interface BusinessRankingContext {
  id: string;
  previousHealthScore: number;
  currentHealthScore: number;
  activeSignals: Signal[];
  lastInteractionDate: Date;
  loans: Loan[];
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

export function computePriorityScore(business: BusinessRankingContext): number {
  const healthDelta = business.previousHealthScore - business.currentHealthScore; // positive = declining
  const hasHighSeverityStress = business.activeSignals.some(s => s.type === 'stress' && s.severity === 'high');
  const daysSinceContact = daysBetween(business.lastInteractionDate, new Date());
  
  const hasUpcomingLoan = business.loans.some(loan => {
    if (loan.status !== 'active') return false;
    const daysToMaturity = daysBetween(new Date(), new Date(loan.maturityDate));
    return daysToMaturity <= 14 && new Date(loan.maturityDate).getTime() > new Date().getTime();
  });

  let score = 0;
  score += Math.max(0, healthDelta) * 3;        // declining health weighted heavily
  score += hasHighSeverityStress ? 25 : 0;       // any high-severity stress signal is urgent
  score += Math.min(daysSinceContact, 30) * 0.5; // neglected accounts drift up in priority, capped
  score += hasUpcomingLoan ? 15 : 0;

  return score;
}
