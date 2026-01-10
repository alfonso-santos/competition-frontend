// src/components/charts/ProgressCharts.tsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function ProgressCharts({
  series,
}: {
  series: Array<{ t: number; score: number | null; rank: number | null }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Primary metric over time</div>
        <div className="mt-3" style={{ height: 220 }}>
          {series.some((x) => x.score !== null) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v: any) => [v === null ? "—" : Number(v).toFixed(4), "Score"]}
                  labelFormatter={(l) => `Submission #${l}`}
                />
                <Line type="monotone" dataKey="score" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white text-sm text-slate-600 ring-1 ring-slate-200">
              No history yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Rank over time</div>
        <div className="mt-3" style={{ height: 220 }}>
          {series.some((x) => x.rank !== null) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v: any) => [v === null ? "—" : String(Math.round(Number(v))), "Rank"]}
                  labelFormatter={(l) => `Submission #${l}`}
                />
                <Line type="monotone" dataKey="rank" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white text-sm text-slate-600 ring-1 ring-slate-200">
              No rank history yet.
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-600">Note: lower rank is better (1 is top).</div>
      </div>
    </div>
  );
}
