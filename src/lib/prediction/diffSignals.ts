import { Signal } from '@prisma/client';

export interface SignalDiff {
  newSignals: Signal[];
  resolvedSignals: Signal[];
  totalActive: number;
}

/**
 * Compares two snapshots of signals to find what changed.
 * @param previousSignals The active signals from the last run
 * @param currentSignals The active signals from the current run
 */
export function compareDetectionRuns(
  previousSignals: Signal[],
  currentSignals: Signal[]
): SignalDiff {
  const previousMap = new Map(previousSignals.map(s => [s.code, s]));
  const currentMap = new Map(currentSignals.map(s => [s.code, s]));

  const newSignals: Signal[] = [];
  const resolvedSignals: Signal[] = [];

  for (const [code, sig] of currentMap.entries()) {
    if (!previousMap.has(code)) {
      newSignals.push(sig);
    }
  }

  for (const [code, sig] of previousMap.entries()) {
    if (!currentMap.has(code)) {
      resolvedSignals.push(sig);
    }
  }

  return {
    newSignals,
    resolvedSignals,
    totalActive: currentSignals.length
  };
}
