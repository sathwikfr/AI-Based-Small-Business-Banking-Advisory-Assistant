// src/lib/signals/utils.ts
// Pure math helpers used by multiple detectors.

/** Group transactions by YYYY-MM key, oldest first */
export function groupByMonth(
  transactions: Array<{ date: Date; amount: number; direction: string; category?: string }>
): Map<string, typeof transactions> {
  const map = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  // Sort keys chronologically
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Sum amounts for a set of transactions */
export function sum(txs: Array<{ amount: number }>): number {
  return txs.reduce((acc, t) => acc + t.amount, 0);
}

/** Population standard deviation */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Trailing N months of data from a chronologically sorted map */
export function trailingMonths<T>(
  map: Map<string, T>,
  n: number
): T[] {
  const entries = [...map.values()];
  return entries.slice(Math.max(0, entries.length - n));
}

/** Same-month data from the previous year */
export function sameMonthLastYear(
  map: Map<string, Array<{ amount: number; direction: string }>>,
  targetYear: number,
  targetMonth: number
): Array<{ amount: number; direction: string }> {
  const key = `${targetYear - 1}-${String(targetMonth).padStart(2, '0')}`;
  return map.get(key) ?? [];
}
