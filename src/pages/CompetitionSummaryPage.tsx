// src/pages/CompetitionSummaryPage.tsx
import { useEffect, useMemo, useState } from "react";

import { HeaderBar } from "../components/layout/HeaderBar";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { SecondaryBlueButton } from "../components/ui/Button";
import { ProgressCharts } from "../components/charts/ProgressCharts";

import { useApp } from "../context/useApp";
import { primaryMetricLabel } from "../lib/metrics";
import { apiFetch } from "../lib/api";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from "recharts";

// -----------------------------
// Helpers
// -----------------------------
function shortId(id: string, left = 6, right = 6): string {
  if (!id) return "—";
  if (id.length <= left + right + 3) return id;
  return `${id.slice(0, left)}…${id.slice(-right)}`;
}

function fmtNum(x: any, d = 3): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function fmtPct(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function csvEscape(v: any): string {
  const s = String(v ?? "");
  // CSV con ;, escapado estándar
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvExcelFriendly(rows: string[], filename: string) {
  const csv = "\uFEFF" + rows.join("\n"); // BOM UTF-8 para Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// -----------------------------
// Best metrics panel
// -----------------------------
function BestMetrics({
  metrics,
  primaryMetricKey,
}: {
  metrics: Record<string, any> | null;
  primaryMetricKey: string;
}) {
  if (!metrics) {
    return <div className="mt-3 text-sm text-slate-600">No metrics available.</div>;
  }

  const order = [
    primaryMetricKey,
    "annual_return",
    "annual_vol",
    "kurtosis",
    "var",
    "cvar",
  ].filter((k, i, a) => k && a.indexOf(k) === i && k in metrics);

  return (
    <div className="mt-4 space-y-3">
      {order.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_auto] gap-x-4 items-baseline">
          <div className="text-sm font-medium text-slate-700">
            {k === primaryMetricKey ? primaryMetricLabel(primaryMetricKey) : k}
          </div>
          <div className="text-sm font-semibold text-slate-900 tabular-nums">
            {["annual_return", "annual_vol", "var", "cvar"].includes(k)
              ? fmtPct(metrics[k])
              : fmtNum(metrics[k], k === primaryMetricKey ? 3 : 4)}
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------
// Equity chart (Recharts)
// -----------------------------
function EquityCompareChart({
  wealthMe,
  wealthChampion,
  height = 520,
}: {
  wealthMe: number[];
  wealthChampion: number[] | null;
  height?: number;
}) {
  const n = Math.min(
    wealthMe?.length ?? 0,
    wealthChampion ? wealthChampion.length : Infinity
  );

  if (!Array.isArray(wealthMe) || wealthMe.length < 2 || n < 2) {
    return <div className="mt-3 text-sm text-slate-600">No equity data.</div>;
  }

  const me0 = wealthMe[0] || 1;
  const ch0 = wealthChampion ? (wealthChampion[0] || 1) : null;

  const data = Array.from({ length: n }, (_, i) => ({
    t: i + 1,
    me: wealthMe[i] / me0,
    ch: wealthChampion ? wealthChampion[i] / (ch0 || 1) : null,
  }));

  return (
    <div className="mt-4 rounded-2xl ring-1 ring-slate-200 bg-white p-3">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 18, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tickLine={false}
              axisLine={true}
              label={{ value: "Day", position: "insideBottomRight", offset: -6 }}
            />
            <YAxis
              tickLine={false}
              axisLine={true}
              domain={["auto", "auto"]}
              label={{ value: "Normalized wealth", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(v: any, name: any) => [Number(v).toFixed(4), name]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Legend />
            <Line type="monotone" dataKey="me" name="You" dot={false} strokeWidth={2.5} />
            {wealthChampion ? (
              <Line type="monotone" dataKey="ch" name="Champion" dot={false} strokeWidth={2.5} />
            ) : null}
            <Brush dataKey="t" height={28} travellerWidth={10} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Tip: arrastra el área inferior (Brush) para “zoom” por rango.
      </div>
    </div>
  );
}

// -----------------------------
// Main page
// -----------------------------
export default function CompetitionSummaryPage() {
  const {
    apiStatus,
    user,
    logout,
    setPage,

    selectedContestId,
    selectedContestItem,
    contestPublic,

    meData,
    meBusy,
    loadMe,

    lbBusy,
    lbData,
    loadLeaderboard,

    histBusy,
    histItems,
    loadSubmissions,

    histDetailBusy,
    histDetail,
    loadSubmissionDetail,
  } = useApp();

  const contest = contestPublic ?? selectedContestItem?.contest ?? null;
  const ranking = contest?.ranking ?? {};
  const fallbackPrimaryMetricKey = String(ranking?.primary_metric ?? "");

  // -----------------------------
  // Final summary (equity + best ids)
  // -----------------------------
  const [fsBusy, setFsBusy] = useState(false);
  const [fsError, setFsError] = useState("");
  const [finalSummary, setFinalSummary] = useState<any>(null);

  async function loadFinalSummary() {
    if (!selectedContestId) return;
    setFsBusy(true);
    setFsError("");
    try {
      const r: any = await apiFetch(
        `/contests/${encodeURIComponent(selectedContestId)}/final_summary?tail=0&top_n=200`
      );
      setFinalSummary(r ?? null);
    } catch (e: any) {
      setFsError(e?.message ?? "Failed to load final summary.");
      setFinalSummary(null);
    } finally {
      setFsBusy(false);
    }
  }

  // -----------------------------
  // Download leaderboard (CSV Excel-friendly)
  // -----------------------------
  const [dlBusy, setDlBusy] = useState(false);
  const [dlErr, setDlErr] = useState("");

  async function downloadLeaderboardCsv() {
    if (!selectedContestId) return;
    setDlBusy(true);
    setDlErr("");

    try {
      const LIMIT = 200;

      const r: any = await apiFetch(
        `/contests/${encodeURIComponent(selectedContestId)}/leaderboard?limit=${encodeURIComponent(String(LIMIT))}`
      );

      const top: any[] = Array.isArray(r?.top) ? r.top : [];
      if (!top.length) throw new Error("Empty leaderboard response.");

      const metricKey = String(r?.contest?.ranking?.primary_metric ?? primaryMetricKey ?? "metric");

      const rows: string[] = [];
      rows.push(["rank", "name", metricKey].map(csvEscape).join(";"));

      for (const it of top) {
        const rank = it?.rank ?? "";
        const name = it?.display_name ?? it?.actor_id ?? "";
        const metricValue = it?.best_score ?? "";
        rows.push([rank, name, metricValue].map(csvEscape).join(";"));
      }

      downloadCsvExcelFriendly(rows, `final_leaderboard_${selectedContestId}.csv`);
    } catch (e: any) {
      setDlErr(e?.message ?? "Failed to download leaderboard.");
    } finally {
      setDlBusy(false);
    }
  }

  // -----------------------------
  // Load base data
  // -----------------------------
  useEffect(() => {
    if (!selectedContestId) return;

    if (!meData && !meBusy) loadMe();
    if (!lbBusy && !lbData) loadLeaderboard(200);
    if (!histBusy && (!histItems || histItems.length === 0)) loadSubmissions(200);

    loadFinalSummary();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContestId]);

  const primaryMetricKey = String(finalSummary?.primary_metric ?? fallbackPrimaryMetricKey);

  const myRank = finalSummary?.me?.rank ?? lbData?.me?.rank ?? null;
  const myBest = finalSummary?.me?.best_score ?? lbData?.me?.best_score ?? null;

  const championBest =
    finalSummary?.champion?.best_score ??
    (Array.isArray(lbData?.top) && lbData?.top?.length ? lbData.top[0]?.best_score : null) ??
    null;

  const totalParticipants =
    finalSummary?.total_participants ??
    lbData?.total_participants ??
    null;

  const bestSubmissionId =
    finalSummary?.me?.best_submission_id ??
    finalSummary?.me?.last_submission_id ??
    null;

  // Load best submission detail (weights + metrics)
  useEffect(() => {
    if (!bestSubmissionId || !selectedContestId) return;
    loadSubmissionDetail(selectedContestId, bestSubmissionId);
  }, [bestSubmissionId, selectedContestId, loadSubmissionDetail]);

  // NOTE: get_my_submission devuelve { contest_id, submission_id, submission: {...} }
  const subAny: any = (histDetail as any)?.submission ?? histDetail ?? null;

  const bestMetrics =
    subAny?.metrics ??
    subAny?.validated?.metrics ??
    null;

  const bestWeights =
    subAny?.validated?.weights ??
    subAny?.weights ??
    null;

  const bestFi =
    subAny?.validated?.fixed_income_weight ??
    subAny?.fixed_income_weight ??
    null;

  // Equity from final_summary
  const aligned = finalSummary?.series?.aligned_wealth ?? null;
  const wealthMe: number[] = Array.isArray(aligned?.wealth_me) ? aligned.wealth_me : [];
  const wealthChampion: number[] | null =
    Array.isArray(aligned?.wealth_champion) ? aligned.wealth_champion : null;

  // Progress chart (from history)
  const progressSeries = useMemo(() => {
    const items = [...(histItems ?? [])].reverse();
    let best: number | null = null;
    let t = 0;

    return items.map((it: any) => {
      t += 1;
      const sc = Number(it?.score);
      if (Number.isFinite(sc)) best = best === null ? sc : Math.max(best, sc);

      return {
        t,
        score: best,
        rank: Number.isFinite(Number(it?.rank_at_submit)) ? Number(it.rank_at_submit) : null,
      };
    });
  }, [histItems]);

  return (
    <>
      <HeaderBar
        title="Competition summary"
        apiStatus={apiStatus}
        user={user}
        busy={Boolean(meBusy || lbBusy || histBusy || histDetailBusy || fsBusy || dlBusy)}
        onLogout={logout}
        right={
          <SecondaryBlueButton type="button" onClick={() => setPage("select")}>
            Back
          </SecondaryBlueButton>
        }
      />

      <main className="mx-auto max-w-6xl px-6">
        <section className="mt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">Final results</h2>
            <Badge text="FINISHED" tone="gray" />
          </div>

          {fsError ? <div className="mt-3 text-sm text-rose-700">{fsError}</div> : null}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Your final rank" value={myRank == null ? "—" : String(myRank)} />
            <StatCard
              label={`Your best (${primaryMetricLabel(primaryMetricKey)})`}
              value={myBest === null ? "—" : fmtNum(myBest)}
            />
            <StatCard label="Champion best" value={championBest === null ? "—" : fmtNum(championBest)} />
            <StatCard
              label="Participants"
              value={totalParticipants == null ? "—" : String(totalParticipants)}
            />
          </div>

          <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold">Your progress</h3>
            <div className="mt-4">
              <ProgressCharts series={progressSeries} />
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold">Equity curve (You vs Champion)</h3>
            <EquityCompareChart wealthMe={wealthMe} wealthChampion={wealthChampion} height={520} />
          </div>

          <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Final leaderboard</h3>

              <div className="flex items-center gap-2">
                <SecondaryBlueButton type="button" onClick={downloadLeaderboardCsv} disabled={dlBusy}>
                  {dlBusy ? "Preparing…" : "Download CSV (Excel)"}
                </SecondaryBlueButton>
              </div>
            </div>

            <div className="mt-1 text-xs text-slate-600">
              Download includes rank, name, and {primaryMetricLabel(primaryMetricKey)} (up to 200).
            </div>

            {dlErr ? <div className="mt-2 text-sm text-rose-700">{dlErr}</div> : null}

            <div className="mt-4 overflow-auto rounded-2xl ring-1 ring-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">{primaryMetricLabel(primaryMetricKey)}</th>
                    <th className="px-3 py-2">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(lbData?.top) ? lbData.top : []).map((row: any) => (
                    <tr key={`${row.rank}-${row.actor_id ?? ""}`} className="border-t">
                      <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                      <td className="px-3 py-2">{row.display_name ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtNum(row.best_score, 6)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.n_submissions ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Number.isFinite(Number(lbData?.total_participants)) &&
            Array.isArray(lbData?.top) &&
            lbData.top.length < (lbData.total_participants ?? 0) ? (
              <div className="mt-2 text-xs text-slate-600">
                Showing {lbData.top.length} of {lbData.total_participants}. (Download fetches up to 200.)
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold">Your best submission</h3>
              <div className="mt-1 text-sm text-slate-600">
                Submission id:{" "}
                <span className="font-mono">{bestSubmissionId ? shortId(bestSubmissionId) : "—"}</span>
              </div>

              {histDetailBusy ? (
                <div className="mt-3 text-sm text-slate-600">Loading…</div>
              ) : (
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <div>Assets: {Array.isArray(bestWeights) ? bestWeights.length : "—"}</div>
                  <div>Fixed income: {bestFi == null ? "—" : String(bestFi)}</div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold">Best submission metrics</h3>
              <BestMetrics metrics={bestMetrics} primaryMetricKey={primaryMetricKey} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
