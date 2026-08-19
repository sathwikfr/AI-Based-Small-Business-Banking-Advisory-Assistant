// src/app/api/businesses/[id]/route.ts
// GET /api/businesses/[id] — full business detail.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const business = await prisma.business.findUnique({
      where:   { id },
      include: {
        rm:           { select: { name: true, email: true } },
        accounts:     true,
        loans:        true,
        signals:      { where: { isActive: true }, orderBy: { detectedAt: 'desc' } },
        healthScores: { orderBy: { computedAt: 'asc' } },
        notes:        { orderBy: { date: 'desc' } },
        summaries:    { orderBy: { generatedAt: 'desc' }, take: 1 },
        transactions: {
          orderBy: { date: 'asc' },
          // Last 13 months (one extra for YoY comparison)
          where: {
            date: {
              gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() - 1, 1)),
            },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Aggregate monthly cash flow for charting
    const monthlyData: Record<string, { month: string; inflow: number; outflow: number; net: number }> = {};

    for (const tx of business.transactions) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, inflow: 0, outflow: 0, net: 0 };
      }
      const amount = Number(tx.amount);
      if (tx.direction === 'inflow')  monthlyData[key].inflow  += amount;
      if (tx.direction === 'outflow') monthlyData[key].outflow += amount;
      monthlyData[key].net = monthlyData[key].inflow - monthlyData[key].outflow;
    }

    const cashFlow = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // last 12 months

    // Last 90 days flows for the Decision Simulator
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentFlows = business.transactions
      .filter(tx => tx.date >= ninetyDaysAgo)
      .map(tx => ({
        date: tx.date.toISOString(),
        netCashFlow: tx.direction === 'inflow' ? Number(tx.amount) : -Number(tx.amount)
      }));

    return NextResponse.json({
      id:               business.id,
      name:             business.name,
      businessType:     business.businessType,
      monthlyRevenueAvg: Number(business.monthlyRevenueAvg),
      onboardedAt:      business.onboardedAt,
      rm:               business.rm,
      accounts:         business.accounts.map((a) => ({
        ...a,
        balance:     Number(a.balance),
        creditLimit: a.creditLimit !== null ? Number(a.creditLimit) : null,
      })),
      loans: business.loans.map((l) => ({
        ...l,
        principal:   Number(l.principal),
        outstanding: Number(l.outstanding),
      })),
      signals: business.signals.map((s) => ({
        ...s,
        metricValue: Number(s.metricValue),
      })),
      healthScores:  business.healthScores,
      notes:         business.notes,
      latestSummary: business.summaries[0] ?? null,
      cashFlow,
      recentFlows,
    });
  } catch (error) {
    console.error(`[GET /api/businesses/${id}]`, error);
    return NextResponse.json({ error: 'Failed to load business' }, { status: 500 });
  }
}
