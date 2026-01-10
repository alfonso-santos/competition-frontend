// src/pages/CompetitionSummaryPage.tsx
import { useEffect, useMemo, useState } from "react";

import { HeaderBar } from "../components/layout/HeaderBar";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { SecondaryBlueButton } from "../components/ui/Button";
import { ProgressCharts } from "../components/charts/ProgressCharts";

import { useApp } from "../context/AppContext";
import { primaryMetricLabel } from "../lib/metrics";
import { apiFetch } from "../lib/api";

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
// Lightweight equity chart (SVG)
// -----------------------------
function EquityCompareChart({
  dates,
  wealthMe,
  wealthChampion,
}: {
  dates: string[];
  wealthMe: number[];
  wealthChampion: number[] | null;
}) {
  if (!dates.length || !wealthMe.length) {
    return <div className="mt-3 text-sm text-slate-600">No equity data.</div>;
  }

  const n = Math.min(dates.length, wealthMe.length, wealthChampion?.length ?? Infinity);
  if (n <= 1) return <div className="mt-3 text-sm text-slate-600">No equity data.</div>;

  const norm = (arr: number[]) => {
    const x0 = arr[0] || 1;
    return arr.slice(0, n).map((x) => x / x0);
  };

  const me = norm(wealthMe);
  const ch = wealthChampion ? norm(wealthChampion) : null;

  const all = ch ? me.concat(ch) : me;
  const ymin = Math.min(...all);
  const ymax = Math.max(...all);

  const W = 900;
  const H = 220;
  const P = 18;

  const x = (i: number) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - ymin) / (ymax - ymin || 1)) * (H - 2 * P);

  const path = (arr: number[]) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
      .join(" ");

  return (
    <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200 bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
        <path d={path(me)} fill="none" stroke="rgba(4,120,87,0.7)" strokeWidth="3" />
        {ch ? (
          <path d={path(ch)} fill="none" stroke="rgba(3,105,161,0.7)" strokeWidth="3" />
        ) : null}
      </svg>
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
  // Final summary (single source of truth for equity + best submission)
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
        `/contests/${selectedContestId}/final_summary?tail=0&top_n=20`
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
  // Load base data
  // -----------------------------
  useEffect(() => {
    if (!selectedContestId) return;

    // Keep these (cheap + already used elsewhere)
    if (!meData && !meBusy) loadMe();
    if (!lbBusy && !lbData) loadLeaderboard(20);
    if (!histBusy && (!histItems || histItems.length === 0)) loadSubmissions(200);

    // Summary for equity + best submission ids
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

  // Load best submission detail (to show weights + metrics)
    useEffect(() => {
    if (!bestSubmissionId || !selectedContestId) return;
    loadSubmissionDetail(selectedContestId, bestSubmissionId);
    }, [bestSubmissionId, selectedContestId]);



    const bestMetrics =
        histDetail?.metrics ??
        histDetail?.validated?.metrics ??
        null;

    const bestWeights =
        histDetail?.weights ??
        histDetail?.validated?.weights ??
        null;

    const bestFi =
        histDetail?.fixed_income_weight ??
        histDetail?.validated?.fixed_income_weight ??
        histDetail?.validated?.fixedIncomeWeight ??
        null;


  // Equity from final_summary
  const aligned = finalSummary?.series?.aligned_wealth ?? null;
  const dates: string[] = aligned?.dates ?? [];
  const wealthMe: number[] = aligned?.wealth_me ?? [];
  const wealthChampion: number[] | null = aligned?.wealth_champion ?? null;

  // -----------------------------
  // Progress chart (from history)
  // -----------------------------
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
        busy={Boolean(meBusy || lbBusy || histBusy || histDetailBusy || fsBusy)}
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
            <EquityCompareChart dates={dates} wealthMe={wealthMe} wealthChampion={wealthChampion} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold">Your best submission</h3>
              <div className="mt-1 text-sm text-slate-600">
                Submission id:{" "}
                <span className="font-mono">
                  {bestSubmissionId ? shortId(bestSubmissionId) : "—"}
                </span>
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
