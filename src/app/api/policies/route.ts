import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const policies = await prisma.policyReference.findMany();
    return NextResponse.json(policies);
  } catch (error) {
    console.error('[GET /api/policies]', error);
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 });
  }
}
