// src/lib/signals/runDetection.ts
// Detection orchestrator — runs all detectors for one business,
// upserts Signal rows, marks stale signals isActive=false.
// Never calls the LLM. Called by the API route and the portfolio-refresh script.

import { PrismaClient } from '@prisma/client';
import { DetectorInput, DetectorResult } from './types';
import { detectReceivablesAging }    from './receivablesAging';
import { detectCashFlowVolatility }  from './cashFlowVolatility';
import { detectSeasonalDip }         from './seasonalDip';
import { detectUnderutilizedCredit } from './underutilizedCredit';
import { detectLoanMaturity }        from './loanMaturityUpcoming';
import { detectPayrollStress }       from './payrollStress';
import { detectGrowthSpurt }         from './growthSpurt';
import { computeHealthScore }        from '../prediction/healthScore';

const DETECTORS = [
  detectReceivablesAging,
  detectCashFlowVolatility,
  detectSeasonalDip,
  detectUnderutilizedCredit,
  detectLoanMaturity,
  detectPayrollStress,
  detectGrowthSpurt,
];

export async function runDetectionForBusiness(
  prisma: PrismaClient,
  businessId: string
): Promise<{ detected: number; retired: number }> {
  // Fetch all required data in one go
  const [transactions, accounts, loans, notes] = await Promise.all([
    prisma.transaction.findMany({
      where:   { businessId },
      orderBy: { date: 'asc' },
    }),
    prisma.account.findMany({ where: { businessId } }),
    prisma.loan.findMany({ where: { businessId } }),
    prisma.interactionNote.findMany({
      where:   { businessId },
      orderBy: { date: 'desc' },
      take: 1,
    }),
  ]);

  const input: DetectorInput = {
    businessId,
    transactions: transactions.map((t) => ({
      date:      t.date,
      amount:    Number(t.amount),
      direction: t.direction,
      category:  t.category,
    })),
    accounts: accounts.map((a) => ({
      accountType: a.accountType,
      balance:     Number(a.balance),
      creditLimit: a.creditLimit !== null ? Number(a.creditLimit) : null,
    })),
    loans: loans.map((l) => ({
      maturityDate: l.maturityDate,
      status:       l.status,
      productType:  l.productType,
      outstanding:  Number(l.outstanding),
    })),
    lastInteractionDate: notes[0]?.date ?? null,
  };

  // Run all detectors
  const results: DetectorResult[] = [];
  for (const detect of DETECTORS) {
    const result = detect(input);
    if (result) results.push(result);
  }

  const activeCodes = new Set(results.map((r) => r.code));

  // Mark stale signals as inactive (preserves history)
  const retired = await prisma.signal.updateMany({
    where: {
      businessId,
      isActive: true,
      code:     { notIn: [...activeCodes] },
    },
    data: { isActive: false },
  });

  // Upsert each detected signal
  let detected = 0;
  for (const result of results) {
    // Check if already exists and unchanged
    const existing = await prisma.signal.findFirst({
      where: { businessId, code: result.code, isActive: true },
    });

    if (existing) {
      // Update metric value
      await prisma.signal.update({
        where: { id: existing.id },
        data: {
          severity:    result.severity,
          metricValue: result.metricValue,
          metricLabel: result.metricLabel,
          detectedAt:  new Date(),
        },
      });
    } else {
      await prisma.signal.create({
        data: {
          businessId,
          type:        result.type,
          code:        result.code,
          severity:    result.severity,
          metricValue: result.metricValue,
          metricLabel: result.metricLabel,
          isActive:    true,
        },
      });
      detected++;
    }
  }

  // --- Compute and save Health Score ---
  const activeSignals = await prisma.signal.findMany({
    where: { businessId, isActive: true },
  });
  const { score, driverCode } = computeHealthScore(activeSignals);
  
  await prisma.healthScore.create({
    data: {
      businessId,
      score,
      driverCode,
    }
  });

  return { detected, retired: retired.count };
}

export async function runDetectionForAllBusinesses(prisma: PrismaClient): Promise<{
  businessId: string;
  name: string;
  detected: number;
  retired: number;
}[]> {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
  const results = [];
  for (const b of businesses) {
    const r = await runDetectionForBusiness(prisma, b.id);
    results.push({ businessId: b.id, name: b.name, ...r });
  }
  return results;
}
