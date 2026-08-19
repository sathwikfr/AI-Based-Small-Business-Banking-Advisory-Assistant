/**
 * prisma/seed.ts
 * Synthetic data seed for Vantage.
 * 12 businesses across 6 signal scenarios × 2 businesses each.
 * 12 months of transactions per business with realistic noise.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma  = new PrismaClient({ adapter });

// ─── Noise helpers ────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitter(base: number, pct = 0.18): number {
  return base * (1 + rand(-pct, pct));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Random date within a given month */
function dateInMonth(year: number, month: number, day?: number): Date {
  const d = day ?? Math.floor(rand(1, 28));
  return new Date(year, month - 1, d);
}

// Build last 12 months array: [{year, month}] ordered oldest→newest
function last12Months(): { year: number; month: number }[] {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

const MONTHS = last12Months();

// ─── Transaction builders ─────────────────────────────────────────────────────

type TxInput = {
  date: Date;
  amount: number;
  direction: 'inflow' | 'outflow';
  category: string;
  counterparty?: string;
};

function buildTx(businessId: string, t: TxInput) {
  return {
    businessId,
    date: t.date,
    amount: round(t.amount),
    direction: t.direction,
    category: t.category,
    counterparty: t.counterparty ?? null,
  };
}

// ─── Business builders ────────────────────────────────────────────────────────

interface BusinessSpec {
  name: string;
  businessType: string;
  monthlyRevenueAvg: number;
  scenario: string;
}

// Returns array of transaction data for this business
function generateTransactions(
  businessId: string,
  spec: BusinessSpec
): ReturnType<typeof buildTx>[] {
  const txs: ReturnType<typeof buildTx>[] = [];

  const { scenario } = spec;
  const base = spec.monthlyRevenueAvg;

  for (const { year, month } of MONTHS) {
    const monthIndex = MONTHS.findIndex((m) => m.year === year && m.month === month);

    // ── SCENARIO: receivables_aging ──────────────────────────────────────────
    if (scenario === 'receivables_aging') {
      // Inflows (receivables) arrive progressively later each month
      const numReceivables = Math.floor(rand(3, 7));
      const baseDelay = 5 + monthIndex * 2.1; // delay grows over time
      const monthInflow = jitter(base, 0.12);
      for (let i = 0; i < numReceivables; i++) {
        const delay = Math.floor(baseDelay + rand(0, 8));
        const day = Math.min(Math.floor(rand(15, 28)) + delay, 28);
        txs.push(buildTx(businessId, {
          date: dateInMonth(year, month, day),
          amount: monthInflow / numReceivables,
          direction: 'inflow',
          category: 'receivable',
          counterparty: `Client ${String.fromCharCode(65 + (i % 8))}`,
        }));
      }
      // Outflows normal
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 5), amount: jitter(base * 0.35, 0.08), direction: 'outflow', category: 'payable', counterparty: 'Supplier Ltd' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.18, 0.05), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 15), amount: jitter(base * 0.04, 0.02), direction: 'outflow', category: 'rent' }));
    }

    // ── SCENARIO: seasonal_dip ───────────────────────────────────────────────
    else if (scenario === 'seasonal_dip') {
      // Retail: strong Oct-Dec, very weak Jan-Mar
      const seasonFactor = [0.55, 0.52, 0.60, 0.78, 0.85, 0.90, 0.88, 0.92, 0.95, 1.15, 1.30, 1.40][month - 1];
      const monthInflow = jitter(base * seasonFactor, 0.1);
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 10), amount: monthInflow * 0.6, direction: 'inflow', category: 'receivable', counterparty: 'Point of Sale' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 25), amount: monthInflow * 0.4, direction: 'inflow', category: 'receivable', counterparty: 'Online Sales' }));
      // Fixed costs stay constant — this is the stress: costs don't drop with revenue
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.22, 0.04), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 1), amount: jitter(base * 0.08, 0.02), direction: 'outflow', category: 'rent' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 10), amount: jitter(base * 0.25, 0.10), direction: 'outflow', category: 'payable', counterparty: 'Inventory Supplier' }));
    }

    // ── SCENARIO: growing ────────────────────────────────────────────────────
    else if (scenario === 'growing') {
      // Revenue trending up ~25% over last 3 months vs prior 3
      const growthFactor = 1 + (monthIndex / 11) * 0.32 + rand(0, 0.05);
      const monthInflow = jitter(base * growthFactor, 0.09);
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 12), amount: monthInflow * 0.55, direction: 'inflow', category: 'receivable', counterparty: 'Enterprise Client' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 22), amount: monthInflow * 0.45, direction: 'inflow', category: 'receivable', counterparty: 'Retail Customers' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.20, 0.06), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 5), amount: jitter(base * 0.28, 0.10), direction: 'outflow', category: 'payable' }));
      if (month % 3 === 0) {
        txs.push(buildTx(businessId, { date: dateInMonth(year, month, 15), amount: jitter(base * 0.06), direction: 'outflow', category: 'tax' }));
      }
    }

    // ── SCENARIO: loan_maturity ──────────────────────────────────────────────
    else if (scenario === 'loan_maturity') {
      // Normal business, loan repayment is a burden
      const monthInflow = jitter(base, 0.13);
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 8), amount: monthInflow * 0.65, direction: 'inflow', category: 'receivable' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 20), amount: monthInflow * 0.35, direction: 'inflow', category: 'receivable' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.20, 0.05), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 5), amount: jitter(base * 0.30, 0.08), direction: 'outflow', category: 'payable' }));
      // Monthly loan EMI
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 1), amount: jitter(base * 0.12, 0.01), direction: 'outflow', category: 'loan_emi', counterparty: 'Bank EMI' }));
    }

    // ── SCENARIO: stable ────────────────────────────────────────────────────
    else if (scenario === 'stable') {
      // Control group: healthy, predictable, no signals
      const monthInflow = jitter(base, 0.09);
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 10), amount: monthInflow * 0.7, direction: 'inflow', category: 'receivable', counterparty: 'Regular Client A' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 25), amount: monthInflow * 0.3, direction: 'inflow', category: 'receivable', counterparty: 'Regular Client B' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.22, 0.04), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 5), amount: jitter(base * 0.28, 0.06), direction: 'outflow', category: 'payable' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 1), amount: jitter(base * 0.06, 0.01), direction: 'outflow', category: 'rent' }));
      if (month % 3 === 0) {
        txs.push(buildTx(businessId, { date: dateInMonth(year, month, 15), amount: jitter(base * 0.05), direction: 'outflow', category: 'tax' }));
      }
    }

    // ── SCENARIO: payroll_stress ─────────────────────────────────────────────
    else if (scenario === 'payroll_stress') {
      // Inflows are irregular; payroll is large relative to buffer
      const volatilityFactor = monthIndex % 3 === 0 ? 0.55 : monthIndex % 3 === 1 ? 1.25 : 0.80;
      const monthInflow = jitter(base * volatilityFactor, 0.15);
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, rand(5, 25) | 0), amount: monthInflow, direction: 'inflow', category: 'receivable', counterparty: 'Irregular Client' }));
      // High payroll
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 28), amount: jitter(base * 0.42, 0.03), direction: 'outflow', category: 'payroll' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 10), amount: jitter(base * 0.22, 0.08), direction: 'outflow', category: 'payable' }));
      txs.push(buildTx(businessId, { date: dateInMonth(year, month, 1), amount: jitter(base * 0.07, 0.01), direction: 'outflow', category: 'rent' }));
    }
  }

  return txs;
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Vantage database...');

  // Clear existing data
  await prisma.customerSummary.deleteMany();
  await prisma.healthScore.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.interactionNote.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.account.deleteMany();
  await prisma.business.deleteMany();
  await prisma.policyReference.deleteMany();
  await prisma.relationshipManager.deleteMany();

  // ── Relationship Manager ──────────────────────────────────────────────────
  const rm = await prisma.relationshipManager.create({
    data: { name: 'Priya Sharma', email: 'priya.sharma@vantagebank.com' },
  });

  // ── Policy References (LLM grounding data) ────────────────────────────────
  await prisma.policyReference.createMany({
    data: [
      {
        productType: 'working_capital',
        title: 'Working Capital Loan',
        summary: 'Short-term financing (6–18 months) to cover operational expenses during revenue gaps or growth phases. Amount: ₹5L–₹2Cr based on 12-month revenue assessment.',
        eligibility: 'Business operating ≥2 years, GST-registered, average monthly turnover ≥₹5L, no overdue loans in past 12 months.',
      },
      {
        productType: 'invoice_financing',
        title: 'Invoice Financing',
        summary: 'Unlock up to 85% of outstanding invoice value immediately. Useful when receivables are aging and cash is tied up. Processing in 48–72 hours.',
        eligibility: 'Invoices from GST-registered buyers, invoice age ≤90 days, minimum invoice value ₹1L.',
      },
      {
        productType: 'overdraft',
        title: 'Overdraft / Credit Line',
        summary: 'Revolving credit line (₹2L–₹50L) for managing short-term cash flow gaps. Interest charged only on utilized amount. Ideal for businesses with seasonal patterns.',
        eligibility: 'Existing current account ≥1 year, average monthly balance ≥₹50K, satisfactory credit history.',
      },
      {
        productType: 'term_loan',
        title: 'Term Loan Renewal',
        summary: 'Renewal or top-up of existing term loan. Simplified process for existing borrowers with good repayment history. Tenor: 1–5 years.',
        eligibility: 'Existing borrower with ≤2 delayed EMI payments in loan tenor, outstanding ≤60% of original principal, no current overdue.',
      },
    ],
  });

  // ── Business specs ────────────────────────────────────────────────────────
  const specs: BusinessSpec[] = [
    // 2 × receivables aging
    { name: 'Apex Textiles Pvt Ltd',       businessType: 'manufacturing', monthlyRevenueAvg: 850000,  scenario: 'receivables_aging' },
    { name: 'Bharat Export Services',       businessType: 'trading',       monthlyRevenueAvg: 620000,  scenario: 'receivables_aging' },
    // 2 × seasonal dip
    { name: 'Festive Crafts & Decor',       businessType: 'retail',        monthlyRevenueAvg: 480000,  scenario: 'seasonal_dip'      },
    { name: 'Himalayan Gift Emporium',      businessType: 'retail',        monthlyRevenueAvg: 390000,  scenario: 'seasonal_dip'      },
    // 2 × growing / opportunity
    { name: 'CloudStack IT Solutions',      businessType: 'services',      monthlyRevenueAvg: 720000,  scenario: 'growing'           },
    { name: 'GreenLeaf Organic Foods',      businessType: 'food',          monthlyRevenueAvg: 560000,  scenario: 'growing'           },
    // 2 × loan maturity
    { name: 'Precision Auto Components',    businessType: 'manufacturing', monthlyRevenueAvg: 940000,  scenario: 'loan_maturity'     },
    { name: 'Metro Cold Chain Logistics',   businessType: 'services',      monthlyRevenueAvg: 1100000, scenario: 'loan_maturity'     },
    // 2 × stable / control
    { name: 'Sunrise Stationery Store',     businessType: 'retail',        monthlyRevenueAvg: 220000,  scenario: 'stable'            },
    { name: 'Reliable Plumbing Works',      businessType: 'services',      monthlyRevenueAvg: 310000,  scenario: 'stable'            },
    // 2 × payroll stress
    { name: 'Urban Creatives Agency',       businessType: 'services',      monthlyRevenueAvg: 680000,  scenario: 'payroll_stress'    },
    { name: 'Pioneer Construction Works',   businessType: 'services',      monthlyRevenueAvg: 1250000, scenario: 'payroll_stress'    },
  ];

  const now = new Date();
  // Maturity date: ~35 days from now (within the 45-day detection window)
  const loanMaturityDate = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
  const oldMaturityDate  = new Date(now.getTime() - 2  * 365 * 24 * 60 * 60 * 1000); // 2y ago, active working cap

  for (const spec of specs) {
    const business = await prisma.business.create({
      data: {
        name: spec.name,
        businessType: spec.businessType,
        monthlyRevenueAvg: round(spec.monthlyRevenueAvg),
        onboardedAt: new Date(now.getFullYear() - Math.floor(rand(2, 6)), Math.floor(rand(0, 11)), 1),
        ownerEmail: spec.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
        rmId: rm.id,
      },
    });

    // ── Accounts ──────────────────────────────────────────────────────────
    const creditLimit = spec.scenario === 'growing' ? round(spec.monthlyRevenueAvg * 3) : null;
    const balance     = spec.scenario === 'growing'
      ? round(spec.monthlyRevenueAvg * 0.08) // low utilization — triggers UNDERUTILIZED_CREDIT
      : round(jitter(spec.monthlyRevenueAvg * 0.25));

    await prisma.account.create({
      data: {
        businessId: business.id,
        accountType: 'current',
        balance: round(jitter(spec.monthlyRevenueAvg * 0.18)),
        creditLimit: null,
      },
    });

    if (spec.scenario === 'growing' || spec.scenario === 'stable') {
      await prisma.account.create({
        data: {
          businessId: business.id,
          accountType: 'credit_line',
          balance,
          creditLimit: creditLimit ?? round(spec.monthlyRevenueAvg * 2),
        },
      });
    }

    // ── Loans ──────────────────────────────────────────────────────────────
    if (spec.scenario === 'loan_maturity') {
      await prisma.loan.create({
        data: {
          businessId: business.id,
          productType: 'term_loan',
          principal: round(spec.monthlyRevenueAvg * 10),
          outstanding: round(jitter(spec.monthlyRevenueAvg * 1.5)),
          maturityDate: loanMaturityDate,
          status: 'active',
        },
      });
    } else if (spec.scenario === 'growing') {
      // Has working capital loan, mostly repaid — opportunity for top-up given growth
      await prisma.loan.create({
        data: {
          businessId: business.id,
          productType: 'working_capital',
          principal: round(spec.monthlyRevenueAvg * 4),
          outstanding: round(spec.monthlyRevenueAvg * 0.6),
          maturityDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
          status: 'active',
        },
      });
    } else if (spec.scenario === 'payroll_stress') {
      await prisma.loan.create({
        data: {
          businessId: business.id,
          productType: 'overdraft',
          principal: round(spec.monthlyRevenueAvg * 1.5),
          outstanding: round(spec.monthlyRevenueAvg * 1.2),
          maturityDate: new Date(now.getFullYear(), now.getMonth() + 8, 1),
          status: 'active',
        },
      });
    }

    // ── Transactions ───────────────────────────────────────────────────────
    const txData = generateTransactions(business.id, spec);
    await prisma.transaction.createMany({ data: txData });

    // ── Interaction notes (realistic history) ──────────────────────────────
    const noteTemplates: Record<string, { note: string; channel: string }[]> = {
      receivables_aging: [
        { note: 'Discussed outstanding receivables from Client C. Business owner mentioned they have extended payment terms to a large buyer.', channel: 'call' },
        { note: 'Visited office. Team seems stretched. No formal credit control process in place.', channel: 'visit' },
      ],
      seasonal_dip: [
        { note: 'Quarterly review call. Owner aware of upcoming lean season. No specific plans discussed for cash buffer.', channel: 'call' },
      ],
      growing: [
        { note: 'Introductory call. Strong growth story — planning to hire 5 more people next quarter.', channel: 'call' },
        { note: 'Sent product brochure for working capital top-up at client request.', channel: 'email' },
      ],
      loan_maturity: [
        { note: 'Routine check-in. Loan repayment on track per owner. No discussion about renewal yet.', channel: 'call' },
      ],
      stable: [
        { note: 'Annual review. Business is stable. No immediate needs raised.', channel: 'visit' },
      ],
      payroll_stress: [
        { note: 'Owner mentioned some payment delays from a major project. Cash flow has been "tight" last couple of months.', channel: 'call' },
      ],
    };

    const notes = noteTemplates[spec.scenario] ?? [];
    for (let i = 0; i < notes.length; i++) {
      const daysAgo = 15 + i * 22;
      await prisma.interactionNote.create({
        data: {
          businessId: business.id,
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          note: notes[i].note,
          channel: notes[i].channel,
        },
      });
    }

    // ── Health Score History (for Timeline chart) ────────────────────────
    let currentScore = 80;
    if (spec.scenario === 'receivables_aging' || spec.scenario === 'payroll_stress') {
      currentScore = 75;
    } else if (spec.scenario === 'growing') {
      currentScore = 72;
    } else if (spec.scenario === 'loan_maturity' || spec.scenario === 'seasonal_dip') {
      currentScore = 78;
    } else if (spec.scenario === 'stable') {
      currentScore = 82;
    }

    for (let i = 4; i >= 0; i--) {
      const daysAgo = i * 7; // 28, 21, 14, 7, 0
      
      // Compute a trend
      if (i < 4) {
        if (spec.scenario === 'growing') {
          currentScore += rand(1, 4);
        } else if (spec.scenario === 'stable') {
          currentScore += rand(-2, 2);
        } else {
          // stress scenarios decline
          currentScore -= rand(2, 6);
        }
        currentScore = Math.max(0, Math.min(100, currentScore));
      }

      let driverCode = null;
      if (spec.scenario === 'receivables_aging') driverCode = 'RECEIVABLES_AGING';
      else if (spec.scenario === 'payroll_stress') driverCode = 'PAYROLL_STRESS';
      else if (spec.scenario === 'growing') driverCode = 'GROWTH_SPURT';
      else if (spec.scenario === 'loan_maturity') driverCode = 'LOAN_MATURITY_UPCOMING';
      else if (spec.scenario === 'seasonal_dip') driverCode = 'SEASONAL_DIP';

      await prisma.healthScore.create({
        data: {
          businessId: business.id,
          score: currentScore,
          computedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          driverCode: i < 2 ? driverCode : null, // Driver code starts appearing as trend continues
        },
      });
    }

    console.log(`  ✓ ${spec.name} (${spec.scenario}) — ${txData.length} transactions`);
  }

  console.log('\n✅ Seed complete. Run: npx prisma studio');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
