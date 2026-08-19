// src/app/api/portfolio/refresh/route.ts
// POST /api/portfolio/refresh — run detection across ALL businesses.
// Simulates what would be a nightly batch job in production.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runDetectionForAllBusinesses } from '@/lib/signals/runDetection';

export async function POST() {
  try {
    const results = await runDetectionForAllBusinesses(prisma);
    const totalDetected = results.reduce((acc, r) => acc + r.detected, 0);
    const totalRetired  = results.reduce((acc, r) => acc + r.retired, 0);
    return NextResponse.json({
      message: `Refresh complete: ${totalDetected} new signals detected, ${totalRetired} retired`,
      totalDetected,
      totalRetired,
      businesses: results,
    });
  } catch (error) {
    console.error('[POST /api/portfolio/refresh]', error);
    return NextResponse.json({ error: 'Portfolio refresh failed' }, { status: 500 });
  }
}
