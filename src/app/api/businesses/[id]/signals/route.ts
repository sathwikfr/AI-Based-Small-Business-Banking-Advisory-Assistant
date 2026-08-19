// src/app/api/businesses/[id]/signals/route.ts
// POST /api/businesses/[id]/signals — run detection for one business.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runDetectionForBusiness } from '@/lib/signals/runDetection';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await runDetectionForBusiness(prisma, id);
    const signals = await prisma.signal.findMany({
      where:   { businessId: id, isActive: true },
      orderBy: { detectedAt: 'desc' },
    });
    return NextResponse.json({
      ...result,
      signals: signals.map((s) => ({ ...s, metricValue: Number(s.metricValue) })),
    });
  } catch (error) {
    console.error(`[POST /api/businesses/${id}/signals]`, error);
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 });
  }
}
