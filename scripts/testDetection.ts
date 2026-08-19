/**
 * scripts/testDetection.ts
 * Standalone console verification for the signal detection engine.
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} scripts/testDetection.ts
 *
 * Prints all active signals per business — verify this looks right before touching UI.
 */

import { PrismaClient } from '@prisma/client';
import { runDetectionForAllBusinesses } from '../src/lib/signals/runDetection';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Running signal detection across all businesses…\n');
  const results = await runDetectionForAllBusinesses(prisma);

  for (const r of results) {
    console.log(`\n─── ${r.name} ───`);

    const signals = await prisma.signal.findMany({
      where:   { businessId: r.businessId, isActive: true },
      orderBy: { detectedAt: 'desc' },
    });

    if (signals.length === 0) {
      console.log('  (no active signals — stable)');
    } else {
      for (const s of signals) {
        const icon = s.type === 'opportunity' ? '🟢' : s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟡' : '🟠';
        console.log(`  ${icon} [${s.code}] ${s.severity.toUpperCase()} — ${s.metricLabel}`);
      }
    }
  }

  const totalSignals = await prisma.signal.count({ where: { isActive: true } });
  console.log(`\n✅ Detection complete — ${totalSignals} active signals across ${results.length} businesses\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
