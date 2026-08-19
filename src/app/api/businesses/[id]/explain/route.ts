// src/app/api/businesses/[id]/explain/route.ts
// POST /api/businesses/[id]/explain — generate NBA + explanations via Claude.
// Only passes signals + policy references to LLM, never raw transactions.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { synthesisProvider } from '@/lib/synthesis';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const business = await prisma.business.findUnique({
      where:   { id },
      include: { signals: { where: { isActive: true } } },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const signals = business.signals;

    if (signals.length === 0) {
      return NextResponse.json({ signalExplanations: [], nextBestActions: [] });
    }

    // Fetch relevant policy references based on signal types
    const productTypes: string[] = [];
    for (const sig of signals) {
      if (sig.code === 'RECEIVABLES_AGING')   productTypes.push('invoice_financing');
      if (sig.code === 'PAYROLL_STRESS')       productTypes.push('working_capital', 'overdraft');
      if (sig.code === 'LOAN_MATURITY_UPCOMING') productTypes.push('term_loan');
      if (sig.code === 'GROWTH_SPURT')         productTypes.push('working_capital');
      if (sig.code === 'SEASONAL_DIP_APPROACHING') productTypes.push('overdraft', 'working_capital');
      if (sig.code === 'UNDERUTILIZED_CREDIT') productTypes.push('overdraft');
    }
    const uniqueTypes = [...new Set(productTypes)];

    const policies = await prisma.policyReference.findMany({
      where: { productType: { in: uniqueTypes } },
    });

    const [signalExplanations, nextBestActions] = await Promise.all([
      synthesisProvider.explainSignals(signals),
      synthesisProvider.generateNBA(business, signals, policies)
    ]);

    return NextResponse.json({ signalExplanations, nextBestActions });
  } catch (error) {
    console.error(`[POST /api/businesses/${id}/explain]`, error);
    return NextResponse.json({ error: 'Explanation generation failed' }, { status: 500 });
  }
}
