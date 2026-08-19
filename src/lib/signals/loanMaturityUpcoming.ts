// src/lib/signals/loanMaturityUpcoming.ts
// LOAN_MATURITY_UPCOMING — active loan matures within 45 days, no renewal discussion logged.
// Severity scales with days remaining: <15d = high, <30d = medium, <45d = low.

import { DetectorInput, DetectorResult } from './types';

export function detectLoanMaturity(input: DetectorInput): DetectorResult | null {
  const now = new Date();
  const activeLoans = input.loans.filter((l) => l.status === 'active');

  for (const loan of activeLoans) {
    const daysToMaturity = Math.floor(
      (loan.maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToMaturity < 0 || daysToMaturity > 45) continue;

    // Check if there's a recent interaction note (within 30 days) — if so, skip
    // (indicates RM is already on top of renewal conversation)
    const hasRecentInteraction =
      input.lastInteractionDate !== null &&
      now.getTime() - input.lastInteractionDate.getTime() < 30 * 24 * 60 * 60 * 1000;

    // We only suppress if there's a VERY recent note — the note content isn't parsed here
    // (that would require LLM). Conservative: flag unless note is within 7 days.
    const hasVeryRecentInteraction =
      input.lastInteractionDate !== null &&
      now.getTime() - input.lastInteractionDate.getTime() < 7 * 24 * 60 * 60 * 1000;

    if (hasVeryRecentInteraction) continue;

    return {
      code:        'LOAN_MATURITY_UPCOMING',
      type:        'stress',
      severity:    daysToMaturity < 15 ? 'high' : daysToMaturity < 30 ? 'medium' : 'low',
      metricValue: daysToMaturity,
      metricLabel: `${loan.productType.replace('_', ' ')} matures in ${daysToMaturity} days`,
    };
  }

  return null;
}
