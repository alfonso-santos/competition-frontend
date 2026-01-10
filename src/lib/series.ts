// src/lib/series.ts

export type EquityPoint = { t: number; equity: number };

/**
 * Convert log-returns into an equity curve:
 *   wealth_t = exp(sum_{i<=t} r_i)
 *
 * Returns points {t, equity} where t starts at 1.
 */
export function equityFromLogReturns(logReturns: unknown[]): EquityPoint[] {
  const out: EquityPoint[] = [];
  let cum = 0;

  for (let i = 0; i < (Array.isArray(logReturns) ? logReturns.length : 0); i++) {
    const r = Number((logReturns as any[])[i]);
    if (!Number.isFinite(r)) continue;
    cum += r;
    out.push({ t: i + 1, equity: Math.exp(cum) });
  }

  return out;
}

/** Keep only last `tail` items of an array (safe). */
export function tailArray<T>(arr: T[] | undefined | null, tail: number): T[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const n = Math.max(0, Math.floor(Number(tail) || 0));
  if (!n || arr.length <= n) return arr.slice();
  return arr.slice(arr.length - n);
}

/**
 * Build a simple "submission # -> score/rank" series for charts.
 * Expects items in DESC order; we reverse to get chronological.
 */
export function buildProgressSeries(items: Array<{ score?: any; rank_at_submit?: any }>): Array<{ t: number; score: number | null; rank: number | null }> {
  const arr = Array.isArray(items) ? [...items].reverse() : [];
  const out: Array<{ t: number; score: number | null; rank: number | null }> = [];

  let k = 0;
  for (const it of arr) {
    k += 1;
    const scoreN = Number(it?.score);
    const rankN = Number(it?.rank_at_submit);

    out.push({
      t: k,
      score: Number.isFinite(scoreN) ? scoreN : null,
      rank: Number.isFinite(rankN) ? rankN : null,
    });
  }

  return out;
}
