// src/lib/metrics.ts

export type MetricFormat = "percent" | "ratio" | "number" | "integer" | "days";

export type MetricMeta = {
  label: string;
  fmt: MetricFormat;
  decimals?: number;
  /**
   * If true, assumes value is in unit interval (e.g. 0.12) and displays as percent (12%).
   */
  percentFromUnitInterval?: boolean;
};

export const METRIC_META: Record<string, MetricMeta> = {
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
  return String(k)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function primaryMetricLabel(primary: string): string {
  return METRIC_META[primary]?.label ?? humanizeKey(primary);
}

export function formatMetricValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) {
    const label0 = METRIC_META[key]?.label ?? humanizeKey(key);
    return `${label0}: ${String(value)}`;
  }

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

/** Helpers used in dashboard cards */
export function pickFirstNumber(...vals: any[]): number | null {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
