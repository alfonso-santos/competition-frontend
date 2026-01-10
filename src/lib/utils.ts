// src/lib/utils.ts

export function pretty(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function formatWhen(s?: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

export function safeFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;

  // RFC 5987: filename*=UTF-8''...
  const m1 = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].trim());

  // filename="..."
  const m2 = cd.match(/filename\s*=\s*"([^"]+)"/i);
  if (m2?.[1]) return m2[1].trim();

  // filename=...
  const m3 = cd.match(/filename\s*=\s*([^;]+)/i);
  if (m3?.[1]) return m3[1].trim().replace(/^"|"$|'/g, "");

  return null;
}

export function equityFromLogReturns(logReturns: number[]): { t: number; equity: number }[] {
  const out: { t: number; equity: number }[] = [];
  let cum = 0;

  for (let i = 0; i < logReturns.length; i++) {
    const r = Number(logReturns[i]);
    if (!Number.isFinite(r)) continue;
    cum += r;
    out.push({ t: i + 1, equity: Math.exp(cum) });
  }
  return out;
}

export function pickFirstNumber(...vals: any[]): number | null {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function getContestId(item: Record<string, any>): string {
  return String(item?.contest_id ?? item?.id ?? item?.slug ?? "");
}

