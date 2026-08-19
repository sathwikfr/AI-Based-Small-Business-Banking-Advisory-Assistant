// src/app/api/businesses/route.ts
// GET /api/businesses — portfolio list with signal summary for each business.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computePriorityScore } from '@/lib/prediction/priorityRank';

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        signals: {
          where:   { isActive: true },
          orderBy: { detectedAt: 'desc' },
        },
        notes: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        loans: true,
        healthScores: {
          orderBy: { computedAt: 'desc' },
          take: 2,
        },
        rm: { select: { name: true } },
      },
    });

    // Compute portfolio status per business
    const data = businesses.map((b) => {
      const signals = b.signals;
      const hasHighStress   = signals.some((s) => s.type === 'stress' && s.severity === 'high');
      const hasMediumStress = signals.some((s) => s.type === 'stress' && s.severity === 'medium');
      const hasOpportunity  = signals.some((s) => s.type === 'opportunity');
      const hasAnySignal    = signals.length > 0;

      let status: 'stress' | 'opportunity' | 'stable' = 'stable';
      if (hasHighStress || hasMediumStress) status = 'stress';
      else if (hasOpportunity) status = 'opportunity';

      const currentHealthScore = b.healthScores[0]?.score ?? 100;
      const previousHealthScore = b.healthScores[1]?.score ?? currentHealthScore;

      const priorityScore = computePriorityScore({
        id: b.id,
        previousHealthScore,
        currentHealthScore,
        activeSignals: signals,
        lastInteractionDate: b.notes[0]?.date ?? b.onboardedAt,
        loans: b.loans,
      });

      return {
        id:               b.id,
        name:             b.name,
        businessType:     b.businessType,
        monthlyRevenueAvg: Number(b.monthlyRevenueAvg),
        onboardedAt:      b.onboardedAt,
        rmName:           b.rm.name,
        status,
        healthScore:      currentHealthScore,
        previousHealthScore,
        priorityScore,
        signalCount:      signals.length,
        topSignal:        signals[0] ?? null,
        lastInteraction:  b.notes[0]?.date ?? null,
        activeSignals:    signals.map((s) => ({
          id:          s.id,
          code:        s.code,
          type:        s.type,
          severity:    s.severity,
          metricLabel: s.metricLabel,
        })),
      };
    });

    // Sort by priorityScore descending
    data.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/businesses]', error);
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 });
  }
}
