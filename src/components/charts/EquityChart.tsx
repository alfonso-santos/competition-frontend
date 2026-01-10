// src/components/charts/EquityChart.tsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Brush,
} from "recharts";

type Point = { t: number; equity: number };

export function EquityChart({
  title,
  subtitle,
  series,
  height = 260,
  canExpand = false,
}: {
  title: string;
  subtitle?: string;
  series: Array<any>;
  height?: number;
  canExpand?: boolean;
}) {
  const data: Point[] = useMemo(() => {
    if (!Array.isArray(series)) return [];
    return series
      .map((p: any, i: number) => {
        const t = Number(p?.t ?? p?.x ?? i + 1);
        const equity = Number(p?.equity ?? p?.y ?? p?.value);
        if (!Number.isFinite(t) || !Number.isFinite(equity)) return null;
        return { t, equity };
      })
      .filter(Boolean) as Point[];
  }, [series]);

  const [expanded, setExpanded] = useState(false);

  if (!data.length) {
    return (
      <div className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
          </div>
        </div>
        <div className="mt-4 flex h-[220px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-600 ring-1 ring-slate-200">
          No data yet.
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
          </div>

          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Expand
            </button>
          ) : null}
        </div>

        <div className="mt-3" style={{ height }}>
          <EquityLineChart data={data} interactive={false} />
        </div>
      </div>

      {expanded ? (
        <EquityModal
          title={title}
          subtitle="Drag to zoom. Use Reset to return to full view."
          data={data}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </>
  );
}

function EquityLineChart({
  data,
  interactive,
}: {
  data: Point[];
  interactive: boolean;
}) {
  const [refLeft, setRefLeft] = useState<number | null>(null);
  const [refRight, setRefRight] = useState<number | null>(null);
  const [domain, setDomain] = useState<[number, number] | null>(null);

  const xDomain = domain ? [domain[0], domain[1]] : ["dataMin", "dataMax"];

  const onMouseDown = (e: any) => {
    if (!interactive) return;
    const x = Number(e?.activeLabel);
    if (!Number.isFinite(x)) return;
    setRefLeft(x);
    setRefRight(x);
  };

  const onMouseMove = (e: any) => {
    if (!interactive) return;
    if (refLeft === null) return;
    const x = Number(e?.activeLabel);
    if (!Number.isFinite(x)) return;
    setRefRight(x);
  };

  const onMouseUp = () => {
    if (!interactive) return;
    if (refLeft === null || refRight === null) {
      setRefLeft(null);
      setRefRight(null);
      return;
    }
    if (refLeft === refRight) {
      setRefLeft(null);
      setRefRight(null);
      return;
    }
    const a = Math.min(refLeft, refRight);
    const b = Math.max(refLeft, refRight);
    setDomain([a, b]);
    setRefLeft(null);
    setRefRight(null);
  };

  const reset = () => {
    setDomain(null);
    setRefLeft(null);
    setRefRight(null);
  };

  return (
    <div className="h-full w-full">
      {interactive ? (
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      ) : null}

      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            margin={{ top: 10, right: 16, bottom: interactive ? 30 : 10, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={xDomain as any}
              allowDataOverflow
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey="equity"
              tick={{ fontSize: 12 }}
              width={44}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: any) => {
                const x = Number(v);
                return Number.isFinite(x) ? x.toFixed(4) : String(v);
              }}
              labelFormatter={(l: any) => `t = ${l}`}
            />

            <Line
              type="monotone"
              dataKey="equity"
              stroke="rgb(2 132 199)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {interactive && refLeft !== null && refRight !== null ? (
              <ReferenceArea x1={refLeft} x2={refRight} strokeOpacity={0.15} />
            ) : null}

            {interactive ? (
              <Brush
                dataKey="t"
                height={22}
                travellerWidth={10}
                stroke="rgb(148 163 184)"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EquityModal({
  title,
  subtitle,
  data,
  onClose,
}: {
  title: string;
  subtitle?: string;
  data: Point[];
  onClose: () => void;
}) {
  // Lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        // click on backdrop closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[95vw] max-w-none rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <div className="text-xl font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <div className="h-[75vh] min-h-[480px]">
            <EquityLineChart data={data} interactive={true} />
          </div>
        </div>
      </div>
    </div>
  );

  // Key change: render to document.body so it's truly above everything and not width-constrained
  return createPortal(modal, document.body);
}
