// src/lib/format.ts

/** Safe JSON pretty print */
export function prettyJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

/** Format ISO-ish timestamp for tables */
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

/** Extract filename from Content-Disposition header */
export function safeFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m1 = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].trim());
  const m2 = cd.match(/filename\s*=\s*"([^"]+)"/i);
  if (m2?.[1]) return m2[1].trim();
  const m3 = cd.match(/filename\s*=\s*([^;]+)/i);
  if (m3?.[1]) return m3[1].trim().replace(/^"|"$|'/g, "");
  return null;
}

export type MetricFormat = "percent" | "ratio" | "number" | "integer" | "days";

export const METRIC_META: Record<
  string,
  { label: string; fmt: MetricFormat; decimals?: number; percentFromUnitInterval?: boolean }
> = {
  annual_return: { label: "Annual return", fmt: "percent", decimals: 2, percentFromUnitInterval: true },
  annual_vol: { label: "Annual volatility", fmt: "percent", decimals: 2, percentFromUnitInterval: true },
  var: { label: "VaR (5%)", fmt: "percent", decimals: 2, percentFromUnitInterval: true },
  cvar: { label: "CVaR (5%)", fmt: "percent", decimals: 2, percentFromUnitInterval: true },
  max_drawdown: { label: "Max drawdown", fmt: "percent", decimals: 2, percentFromUnitInterval: true },
  sharpe: { label: "Sharpe ratio", fmt: "ratio", decimals: 2 },
  sortino: { label: "Sortino ratio", fmt: "ratio", decimals: 2 },
  calmar: { label: "Calmar ratio", fmt: "ratio", decimals: 2 },
  time_under_water: { label: "Time under water", fmt: "days" },
  n_obs: { label: "Observations", fmt: "integer" },
  freq: { label: "Frequency (days/year)", fmt: "integer" },
  alpha: { label: "Alpha", fmt: "percent", decimals: 1, percentFromUnitInterval: true },
  kurtosis: { label: "Kurtosis", fmt: "number", decimals: 2 },
};

export function humanizeKey(k: string): string {
  return String(k ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function primaryMetricLabel(primary: string): string {
  return METRIC_META[primary]?.label ?? humanizeKey(primary);
}

export function formatMetricValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);

  const meta = METRIC_META[key];
  const label = meta?.label ?? humanizeKey(key);

  if (!meta) return `${label}: ${n}`;

  switch (meta.fmt) {
    case "percent": {
      const d = meta.decimals ?? 2;
      const v = meta.percentFromUnitInterval ? n * 100 : n;
      return `${label}: ${v.toFixed(d)}%`;
    }
    case "ratio": {
      const d = meta.decimals ?? 2;
      return `${label}: ${n.toFixed(d)}`;
    }
    case "days":
      return `${label}: ${Math.round(n)} days`;
    case "integer":
      return `${label}: ${Math.round(n)}`;
    default: {
      const d = meta.decimals ?? 2;
      return `${label}: ${n.toFixed(d)}`;
    }
  }
}
