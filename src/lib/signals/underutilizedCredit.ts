// src/lib/signals/underutilizedCredit.ts
// UNDERUTILIZED_CREDIT — credit line utilization < 15% (opportunity signal).
// Indicates the business may not know about, or isn't using, available credit capacity.

import { DetectorInput, DetectorResult } from './types';

export function detectUnderutilizedCredit(input: DetectorInput): DetectorResult | null {
  const creditAccounts = input.accounts.filter(
    (a) => (a.accountType === 'credit_line' || a.accountType === 'overdraft') &&
            a.creditLimit !== null &&
            a.creditLimit > 0
  );

  if (creditAccounts.length === 0) return null;

  let totalLimit     = 0;
  let totalBalance   = 0;

  for (const acct of creditAccounts) {
    totalLimit   += acct.creditLimit!;
    totalBalance += acct.balance;
  }

  const utilization = totalBalance / totalLimit;

  if (utilization >= 0.15) return null;

  return {
    code:        'UNDERUTILIZED_CREDIT',
    type:        'opportunity',
    severity:    utilization < 0.05 ? 'high' : utilization < 0.10 ? 'medium' : 'low',
    metricValue: utilization * 100,
    metricLabel: `Credit utilization ${(utilization * 100).toFixed(1)}% of ₹${(totalLimit / 100000).toFixed(1)}L limit`,
  };
}
