// src/app/api/businesses/[id]/summary/route.ts
// POST /api/businesses/[id]/summary — generate customer-ready summary.
// Stores result in CustomerSummary table with signalIds audit trail.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { synthesisProvider } from '@/lib/synthesis';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    // Accept pre-computed actions from the explain call if available
    const actions: Array<{ title: string; rationale: string }> = body.actions ?? [];

    const business = await prisma.business.findUnique({
      where:   { id },
      include: { signals: { where: { isActive: true } } },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const signals = business.signals;
    const signalIds = signals.map((s) => s.id);

    const summaryText = await synthesisProvider.generateCustomerSummary(
      business,
      signals,
      actions as any // For hackathon mock, we cast this or we could fetch policies again if we wanted real generation
    );

    // Store with audit trail
    const saved = await prisma.customerSummary.create({
      data: { businessId: id, content: summaryText, signalIds: JSON.stringify(signalIds) },
    });

    return NextResponse.json({ id: saved.id, content: summaryText, generatedAt: saved.generatedAt });
  } catch (error) {
    console.error(`[POST /api/businesses/${id}/summary]`, error);
    return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 });
  }
}
