// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";

import { HeaderBar } from "../components/layout/HeaderBar";
import { StatCard } from "../components/ui/StatCard";
import { SecondaryBlueButton, PrimaryGreenButton } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

import {
  parseNumber,
  parseWeightsText,
  validateWeightsSign,
  countDecimalsToken,
  splitAndNormalizeNumberTokens,
} from "../lib/parse";
import { pickFirstNumber } from "../lib/utils";
import { formatWhen } from "../lib/date";
import { primaryMetricLabel } from "../lib/metrics";
import { ProgressCharts } from "../components/charts/ProgressCharts";

import { useApp } from "../context/AppContext";

export type MeResponse = {
  contest_id: string;
  contest: any;
  participant: any;
  attempts: any;
  leaderboard_me: any;
};

export type SubmitResponse = {
  status: "ok" | "duplicate";
  contest_id: string;
  submission_id: string;
  score: number;
  primary_metric: string;
  metrics: Record<string, any>;
  portfolio_returns?: number[];
  attempts?: any;
};

export type LeaderboardResponse = {
  contest_id: string;
  contest: any;
  limit: number;
  top: Array<{
    rank: number;
    actor_id: string;
    actor_type?: string;
    team_id?: string | null;
    best_score?: number | null;
    last_score?: number | null;
    n_submissions?: number | null;
    primary_metric?: string | null;
  }>;
  me?: any;
  total_participants?: number;
  around_me?: any[];
};

export type SubmissionListItem = {
  submission_id: string;
  status?: "ok" | "duplicate";
  score?: number | null;
  primary_metric?: string | null;
  created_at?: string | null;
  rank_at_submit?: number | null;
  metrics?: Record<string, any>;
  validated?: any;

  // some backends may return nested as well
  submission?: any;
};

const METRICS_ORDER: string[] = [
  "annual_return",
  "annual_vol",
  "kurtosis",
  "sharpe",
  "var",
  "cvar",
  "sortino",
  "max_drawdown",
  "time_under_water",
];

const METRIC_LABEL: Record<string, string> = {
  annual_return: "Return",
  annual_vol: "Vol",
  kurtosis: "Kurtosis",
  sharpe: "Sharpe",
  var: "VaR",
  cvar: "CVaR",
  sortino: "Sortino",
  max_drawdown: "MDD",
  time_under_water: "TuW",
};

function unwrapSubmission(x: any): any {
  if (!x) return null;
  return x.submission ?? x;
}
function getCreatedAt(x: any): string | null {
  const s = unwrapSubmission(x);
  return (s?.created_at ?? x?.created_at ?? null) as any;
}
function getScore(x: any): number | null {
  const s = unwrapSubmission(x);
  const v = s?.score ?? x?.score;
  return Number.isFinite(Number(v)) ? Number(v) : null;
}
function getPrimaryMetric(x: any): string | null {
  const s = unwrapSubmission(x);
  return (s?.primary_metric ?? x?.primary_metric ?? null) as any;
}
function getMetrics(x: any): Record<string, any> | null {
  const s = unwrapSubmission(x);
  const m = s?.metrics ?? x?.metrics ?? null;
  return m && typeof m === "object" ? m : null;
}
function getValidated(x: any): any {
  const s = unwrapSubmission(x);
  return s?.validated ?? x?.validated ?? null;
}
function getWeightsFromValidated(x: any): number[] | null {
  const v = getValidated(x);
  const w = v?.weights ?? null;
  return Array.isArray(w) ? w.map((z: any) => Number(z)) : null;
}
function getFixedIncomeFromValidated(x: any): number | null {
  const v = getValidated(x);
  const fi = v?.fixed_income_weight ?? v?.fixedIncomeWeight ?? null;
  return Number.isFinite(Number(fi)) ? Number(fi) : null;
}

function formatMetricValue(k: string, v: any): string {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";

  const pctKeys = new Set(["annual_return", "annual_vol", "max_drawdown", "var", "cvar"]);
  if (pctKeys.has(k)) return `${(x * 100).toFixed(2)}%`;

  if (k === "time_under_water") return `${Math.round(x)} d`;
  if (k === "kurtosis") return x.toFixed(3);
  if (k === "sharpe" || k === "sortino") return x.toFixed(3);

  return x.toFixed(4);
}

function MetricList({
  metrics,
  primaryMetricKey,
}: {
  metrics: Record<string, any> | null;
  primaryMetricKey: string;
}) {
  if (!metrics) {
    return <div className="mt-2 text-sm text-slate-600">No metrics available yet.</div>;
  }

  const keys = METRICS_ORDER.filter(
    (k) => k in metrics && k !== "n_obs" && k !== "freq" && k !== primaryMetricKey
  );

  return (
    <div className="mt-3 mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-[15px]">
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
          <div className="font-medium text-slate-700">{METRIC_LABEL[k] ?? k}</div>
          <div className="font-semibold text-slate-900 tabular-nums">
            {formatMetricValue(k, (metrics as any)[k])}
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function fmtMaybeOneDecimal(n: number): string {
  if (!Number.isFinite(n)) return "";
  const s = String(n);
  return s.includes(".") ? s : `${s}.0`;
}

function coerceBoolish(v: any, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n", ""].includes(s)) return false;
  }
  return fallback;
}

function isContestFinished(contest: any): boolean {
  if (!contest) return false;

  const status = String(contest?.status ?? "").trim().toLowerCase();
  if (["finished", "ended", "closed", "completed"].includes(status)) return true;

  const endRaw =
    contest?.end_at ??
    contest?.end_date ??
    contest?.end ??
    contest?.limits?.end_at ??
    contest?.limits?.end_date ??
    null;

  if (endRaw) {
    const t = new Date(String(endRaw)).getTime();
    if (Number.isFinite(t) && Date.now() > t) return true;
  }

  return false;
}

export default function DashboardPage() {
  const {
    apiStatus,
    user,
    logout,

    selectedContestId,
    selectedContestItem,
    contestPublic,

    setPage,

    meData,
    meBusy,
    meError,
    loadMe,

    submitBusy,
    submitError,
    submitResult,
    submitWeights,

    weightsText,
    setWeightsText,
    fixedIncomeWeight,
    setFixedIncomeWeight,

    lbBusy,
    lbError,
    lbData,
    loadLeaderboard,

    histBusy,
    histError,
    histItems,
    loadSubmissions,

    histSelectedId,
    setHistSelectedId,
    histDetailBusy,
    histDetailError,
    histDetail,
    loadSubmissionDetail,
  } = useApp();

  const [lbExpanded, setLbExpanded] = useState(false);

  const contest = contestPublic ?? selectedContestItem?.contest ?? null;

  // Redirect to summary if contest finished
  useEffect(() => {
    if (!selectedContestId) return;
    if (!contest) return;
    if (isContestFinished(contest)) setPage("summary");
  }, [selectedContestId, contest, setPage]);

  const participantStatus = String(meData?.participant?.status ?? "");
  const isActive = participantStatus.toLowerCase() === "active";

  const nAssets = Number(contest?.rules?.n_assets ?? 0) || 0;

  const allowShort = coerceBoolish(contest?.rules?.allow_short, false);

  const maxFi = (() => {
    const v1 = Number((contest as any)?.max_fixed_income_weight);
    if (Number.isFinite(v1) && v1 >= 0) return v1;

    const v2 = Number((contest as any)?.limits?.max_fixed_income_weight);
    if (Number.isFinite(v2) && v2 >= 0) return v2;

    return 1;
  })();

  const sumTol = (() => {
    const v = Number(contest?.rules?.sum_tol);
    return Number.isFinite(v) && v >= 0 ? v : 1e-6;
  })();

  const primaryMetricKey = String(contest?.ranking?.primary_metric ?? "");
  const primaryMetricLabelText = primaryMetricLabel(primaryMetricKey);
  const order = String(contest?.ranking?.order ?? "desc").toLowerCase();

  const attempts = meData?.attempts ?? null;
  const lbMe = meData?.leaderboard_me ?? null;

  const dailyLeft = pickFirstNumber(
    attempts?.left_before?.daily_left,
    attempts?.left_before?.daily_submissions_left,
    attempts?.left?.daily_submissions_left,
    attempts?.daily_left,
    attempts?.daily_submissions_left
  );

  const totalLeft = pickFirstNumber(
    attempts?.left_before?.total_left,
    attempts?.left_before?.total_submissions_left,
    attempts?.left?.total_submissions_left,
    attempts?.total_left,
    attempts?.total_submissions_left
  );

  const bestScore = pickFirstNumber(lbMe?.best_score);
  const rankNow = pickFirstNumber((lbData as any)?.me?.rank, lbMe?.rank);

  const top1 = (lbData as any)?.top?.[0];
  const top1Score = pickFirstNumber(top1?.best_score, top1?.last_score);

  const gapVsTop1 = (() => {
    if (rankNow === null) return null;
    if (Number(rankNow) === 1) return 0;
    if (bestScore === null || top1Score === null) return null;
    return order === "asc" ? bestScore - top1Score : top1Score - bestScore;
  })();

  const preview = useMemo(() => {
    const parsed = parseWeightsText(weightsText, nAssets);

    const tokens = splitAndNormalizeNumberTokens(weightsText);
    let firstTooManyDecimalsPos: number | null = null;
    for (let i = 0; i < tokens.length; i++) {
      if (countDecimalsToken(tokens[i]) > 3) {
        firstTooManyDecimalsPos = i + 1;
        break;
      }
    }
    const weightsDecimalsOk = firstTooManyDecimalsPos === null;

    const signCheck = parsed.ok
      ? validateWeightsSign(parsed.weights, allowShort)
      : ({ ok: true as const } as any);

    const fiToken = String(fixedIncomeWeight ?? "").trim();
    const fi = parseNumber(fiToken);

    const fiDecimalsOk = fiToken.length === 0 ? true : countDecimalsToken(fiToken) <= 3;
    const fiParsedOk = fi !== null;

    let fiRangeOk = false;
    let fiErr = "";

    if (!fiToken.length) {
      fiErr = "Please enter fixed income weight (use 0.0 if none).";
    } else if (!fiParsedOk) {
      fiErr = 'Invalid fixed income number. Use "." for decimals.';
    } else if (!allowShort && (fi as number) < 0) {
      fiErr = "Fixed income must be ≥ 0 in long-only contests.";
    } else if ((fi as number) > maxFi + 1e-12) {
      fiErr = `Fixed income exceeds contest max (${maxFi}).`;
    } else if (!fiDecimalsOk) {
      fiErr = "Fixed income has more than 3 decimals.";
    } else {
      fiRangeOk = true;
    }

    const fiOk = fiParsedOk && fiRangeOk && fiDecimalsOk;

    let sumAssets: number | null = null;
    if (parsed.ok && parsed.weights) sumAssets = parsed.weights.reduce((a: number, b: number) => a + b, 0);

    const total = sumAssets === null || !fiOk || fi === null ? null : sumAssets + fi;
    const totalOk = total !== null ? Math.abs(total - 1.0) <= sumTol : false;

    const formOk =
      Boolean(parsed.ok) &&
      Boolean(weightsDecimalsOk) &&
      Boolean((signCheck as any)?.ok) &&
      Boolean(fiOk) &&
      Boolean(totalOk);

    const weightsErr =
      !parsed.ok
        ? parsed.error || "Invalid weights."
        : !weightsDecimalsOk && firstTooManyDecimalsPos !== null
        ? `Weights have more than 3 decimals at position ${firstTooManyDecimalsPos}.`
        : !(signCheck as any)?.ok
        ? (signCheck as any)?.error || "Invalid weights sign."
        : "";

    return {
      weightsOk: parsed.ok,
      weightsErr,
      nEntered: parsed.ok && parsed.weights ? parsed.weights.length : 0,
      sumAssets,

      weightsDecimalsOk,
      firstTooManyDecimalsPos,

      signOk: (signCheck as any)?.ok ?? true,

      fi,
      fiOk,
      fiErr,
      fiDecimalsOk,

      total,
      totalOk,

      formOk,
    };
  }, [weightsText, fixedIncomeWeight, nAssets, allowShort, maxFi, sumTol]);

  const canSubmit = isActive && !submitBusy && !meBusy && preview.formOk;

  useEffect(() => {
    if (!selectedContestId) return;

    if (!meData && !meBusy) loadMe();

    if (isActive && (!histItems || histItems.length === 0) && !histBusy) {
      loadSubmissions(50);
    }

    if (isActive && !lbBusy && !lbData) {
      loadLeaderboard(20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContestId, isActive]);

  useEffect(() => {
    if (!histItems?.length) return;
    if (histSelectedId) return;

    const latest = histItems[0] as any;
    const id = latest?.submission_id;
    if (!id) return;

    setHistSelectedId(id);
    if (selectedContestId && id) {
      loadSubmissionDetail(selectedContestId, id);
}

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histItems, histSelectedId]);

  const latestHist: SubmissionListItem | null = histItems?.length ? (histItems[0] as any) : null;
  const lastStatus = (submitResult as any) ?? (latestHist as any) ?? null;

  const lastMetrics = (() => {
    if (submitResult?.metrics && Object.keys(submitResult.metrics).length) return submitResult.metrics;
    return getMetrics(histDetail) ?? getMetrics(latestHist);
  })();

  const lastScore = (() => {
    const sc =
      submitResult && Number.isFinite(Number(submitResult.score))
        ? Number(submitResult.score)
        : Number.isFinite(Number(getScore(lastStatus)))
        ? Number(getScore(lastStatus))
        : null;
    return sc;
  })();

  const lastPrimaryMetricKey = getPrimaryMetric(lastStatus) ?? primaryMetricKey;

  const progressSeries = useMemo(() => {
    const items = [...(histItems ?? [])].reverse();
    const out: Array<{ t: number; score: number | null; rank: number | null }> = [];
    let k = 0;
    for (const it of items as any[]) {
      k += 1;
      out.push({
        t: k,
        score: Number.isFinite(Number(getScore(it))) ? Number(getScore(it)) : null,
        rank: Number.isFinite(Number(it.rank_at_submit)) ? Number(it.rank_at_submit) : null,
      });
    }
    return out;
  }, [histItems]);

  const topRowsAll = (((lbData as any)?.top ?? []) as any[]).slice(0, 20);
  const topRowsToShow = lbExpanded ? topRowsAll : topRowsAll.slice(0, 3);

  const totalParticipants =
    (lbData as any)?.total_participants ?? (lbData as any)?.total ?? (lbData as any)?.n_participants ?? null;

  const submissionOptions = useMemo(() => {
    const items = (histItems ?? []) as any[];
    return items.map((it) => {
      const when = formatWhen(getCreatedAt(it) ?? it.created_at);
      const sc = getScore(it);
      const score = sc === null ? "—" : sc.toFixed(3);
      const r = Number.isFinite(Number(it.rank_at_submit)) ? String(Math.round(Number(it.rank_at_submit))) : "—";
      return { id: it.submission_id, label: `${when} · Score ${score} · Rank ${r}` };
    });
  }, [histItems]);

  const selectedListItem = useMemo(() => {
    const items = (histItems ?? []) as any[];
    return items.find((x) => x.submission_id === histSelectedId) ?? null;
  }, [histItems, histSelectedId]);

  const selectedWeights = getWeightsFromValidated(histDetail) ?? getWeightsFromValidated(selectedListItem);
  const selectedFiWeight = getFixedIncomeFromValidated(histDetail) ?? getFixedIncomeFromValidated(selectedListItem);

  async function copyWeightsAsText() {
    if (!Array.isArray(selectedWeights) || !selectedWeights.length) return;
    const txt = selectedWeights.map((x: any) => String(Number(x))).join(", ");
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // ignore
    }
  }

  const selectedMetrics = getMetrics(histDetail) ?? getMetrics(selectedListItem);

  const selectedScore = (() => {
    const sc =
      getScore(histDetail) ??
      getScore(selectedListItem) ??
      (Number.isFinite(Number((selectedListItem as any)?.score)) ? Number((selectedListItem as any)?.score) : null);
    return sc;
  })();

  const selectedRankAtSubmit = Number.isFinite(Number((selectedListItem as any)?.rank_at_submit))
    ? Number((selectedListItem as any)?.rank_at_submit)
    : null;

  const currentRankForSelected = pickFirstNumber((lbData as any)?.me?.rank, lbMe?.rank);

  return (
    <>
      <HeaderBar
        title="Portfolio Challenge"
        apiStatus={apiStatus}
        // Prevent HeaderBar from rendering its own "Welcome/Loading" user/status text
        user={user}
        busy={false}
        onLogout={logout}
        hideUserBlock={true}
        right={
          <div className="flex w-full flex-col items-end gap-2">
            {/* UAM logo (top) */}
            <div className="flex items-center justify-end">
              <img
                src="/brand/uam.png"
                alt="UAM"
                className="h-9 w-auto select-none"
                loading="eager"
                onError={(e) => {
                  // Fallback: hide broken image without layout jump
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            {/* Logged in as */}
            <div className="text-sm text-slate-700">
              Logged in as{" "}
              <span className="font-semibold text-slate-900">
                {user?.email ?? "—"}
              </span>
            </div>

            {/* Buttons: Reload (left) + Logout (right) on same line */}
            <div className="flex w-full justify-end gap-2">
              <SecondaryBlueButton type="button" onClick={() => setPage("select")}>
                Back
              </SecondaryBlueButton>

              <SecondaryBlueButton type="button" onClick={logout} disabled={!user}>
                Logout
              </SecondaryBlueButton>
            </div>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-6">
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">Current</h2>
              {participantStatus ? (
                isActive ? (
                  <Badge text="ACTIVE" tone="green" />
                ) : (
                  <Badge text={participantStatus.toUpperCase()} tone="amber" />
                )
              ) : (
                <Badge text="—" tone="gray" />
              )}
            </div>

            <div className="text-[15px] text-slate-700">
              {contest?.name ? <span className="font-semibold text-slate-900">{String(contest.name)}</span> : null}
            </div>
          </div>

          {meError ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-base text-rose-800 ring-1 ring-rose-200">
              {meError}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Your rank" value={rankNow === null ? "—" : String(rankNow)} />
            <StatCard
              label={`Your best (${primaryMetricLabelText || "metric"})`}
              value={bestScore === null ? "—" : Number(bestScore).toFixed(3)}
            />
            <StatCard label="Gap vs #1" value={gapVsTop1 === null ? "—" : Number(gapVsTop1).toFixed(3)} />
            <StatCard
              label="Attempts left (Today / Total)"
              value={`${dailyLeft === null ? "—" : dailyLeft} / ${totalLeft === null ? "—" : totalLeft}`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
            <div className="lg:col-span-3 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm h-full flex flex-col">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Submit weights</h3>
                  <div className="mt-1 text-sm text-slate-600">
                    Mode:{" "}
                    <span className="font-semibold text-slate-900">{allowShort ? "Long/Short" : "Long-only"}</span> ·
                    FI max: <span className="font-semibold text-slate-900">{maxFi}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <PrimaryGreenButton type="button" onClick={submitWeights} disabled={!canSubmit}>
                    {submitBusy ? "Submitting…" : "Submit"}
                  </PrimaryGreenButton>
                </div>
              </div>

              {!isActive ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-base text-amber-800 ring-1 ring-amber-200">
                  You are not ACTIVE in this contest, so you cannot submit.
                </div>
              ) : null}

              {submitError ? (
                <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-base text-rose-800 ring-1 ring-rose-200">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-5 space-y-4 flex-1">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Weights ({nAssets || "—"} values)</span>
                  <textarea
                    value={weightsText}
                    onChange={(e) => setWeightsText(e.target.value)}
                    placeholder="Example (5 assets): 0.2, 0.2, 0.2, 0.2, 0.2"
                    rows={5}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
                  />
                  <div className="mt-2 text-sm text-slate-500">
                    Accepted separators: commas, spaces, new lines, semicolons. Decimals must use{" "}
                    <span className="font-semibold">.</span> (max 3 decimals).
                  </div>

                  {!preview.weightsDecimalsOk ? (
                    <div className="mt-2 text-sm text-rose-700">
                      Weights have more than 3 decimals (first at position {preview.firstTooManyDecimalsPos}).
                    </div>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-600">Fixed income weight</span>

                  <input
                    value={fixedIncomeWeight}
                    onChange={(e) => setFixedIncomeWeight(e.target.value)}
                    onBlur={(e) => {
                      const t = String(e.target.value ?? "").trim();
                      if (!t) {
                        setFixedIncomeWeight("0.0");
                        return;
                      }
                      const n = parseNumber(t);
                      if (n !== null && !t.includes(".")) {
                        setFixedIncomeWeight(fmtMaybeOneDecimal(n));
                      }
                    }}
                    placeholder="e.g. 0.0"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
                  />

                  <div className="mt-2 text-sm text-slate-500">
                    {allowShort ? (
                      <>
                        Can be negative (credit). Must be ≤ <span className="font-semibold">{maxFi}</span>.
                      </>
                    ) : (
                      <>
                        Must be between 0 and <span className="font-semibold">{maxFi}</span>.
                      </>
                    )}
                  </div>

                  {!preview.fiDecimalsOk ? (
                    <div className="mt-2 text-sm text-rose-700">Fixed income has more than 3 decimals.</div>
                  ) : null}
                </label>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Preview</div>
                  <div className="mt-2 text-sm text-slate-700 space-y-1">
                    <div>
                      Entered: <span className="font-semibold text-slate-900">{preview.nEntered}</span> /{" "}
                      {nAssets || "—"}
                    </div>
                    <div>
                      Sum (assets):{" "}
                      <span className="font-semibold text-slate-900">
                        {preview.sumAssets === null ? "—" : preview.sumAssets.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      Fixed income:{" "}
                      <span className="font-semibold text-slate-900">
                        {preview.fi === null ? "—" : preview.fi.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      Total:{" "}
                      <span className="font-semibold text-slate-900">
                        {preview.total === null ? "—" : preview.total.toFixed(3)}
                      </span>{" "}
                      {preview.total !== null ? (
                        preview.totalOk ? (
                          <span className="ml-2 text-emerald-700 font-semibold">OK</span>
                        ) : (
                          <span className="ml-2 text-rose-700 font-semibold">Must equal 1</span>
                        )
                      ) : null}
                    </div>

                    {!preview.weightsOk || preview.weightsErr ? (
                      <div className="mt-2 text-rose-700">{preview.weightsErr}</div>
                    ) : null}

                    {!preview.fiOk ? <div className="mt-2 text-rose-700">{preview.fiErr}</div> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 h-full flex flex-col gap-4">
              <div className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-semibold">Last result</div>
                  {submitResult ? (
                    submitResult.status === "ok" ? (
                      <Badge text="Submission accepted" tone="green" />
                    ) : (
                      <Badge text="Duplicate (not counted)" tone="amber" />
                    )
                  ) : latestHist ? (
                    <Badge text="Loaded from history" tone="gray" />
                  ) : (
                    <Badge text="No submissions yet" tone="gray" />
                  )}
                </div>

                {!lastStatus ? (
                  <div className="mt-4 text-base text-slate-700">No previous submissions yet.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                      <div className="text-sm font-semibold text-slate-900">Score</div>
                      <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
                        {lastScore === null ? "—" : lastScore.toFixed(3)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{primaryMetricLabel(lastPrimaryMetricKey)}</div>
                      {getCreatedAt(lastStatus) ? (
                        <div className="mt-2 text-xs text-slate-500">
                          {formatWhen(getCreatedAt(lastStatus) as any)}
                        </div>
                      ) : null}
                      <div
                        className="mt-4 h-1 w-full rounded-full"
                        style={{ backgroundColor: "rgba(74,119,41,0.25)" }}
                      />
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                      <div className="text-sm font-semibold text-slate-900">Metrics</div>
                      <MetricList metrics={lastMetrics} primaryMetricKey={lastPrimaryMetricKey} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">History</h2>
              <p className="mt-1 text-[15px] text-slate-700">
                Leaderboard (Top 20) and your submission history.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SecondaryBlueButton type="button" onClick={() => loadSubmissions(50)} disabled={histBusy}>
                {histBusy ? "Refreshing…" : "Refresh history"}
              </SecondaryBlueButton>

              <SecondaryBlueButton
                type="button"
                onClick={() => loadLeaderboard(20)}
                disabled={!isActive || lbBusy || meBusy}
              >
                {lbBusy ? "Refreshing…" : "Refresh leaderboard"}
              </SecondaryBlueButton>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Leaderboard</h3>
                <p className="mt-1 text-base text-slate-700">{lbExpanded ? "Top 20 (loaded)." : "Top 3 (loaded)."}</p>
              </div>

              <div className="flex items-center gap-2">
                {typeof totalParticipants === "number" ? (
                  <div className="text-sm text-slate-600">
                    Participants: <span className="font-semibold text-slate-900">{totalParticipants}</span>
                  </div>
                ) : null}

                <SecondaryBlueButton
                  type="button"
                  onClick={() => setLbExpanded((v) => !v)}
                  disabled={!isActive || lbBusy || meBusy || topRowsAll.length === 0}
                >
                  {lbExpanded ? "Show top 3" : "Show top 20"}
                </SecondaryBlueButton>
              </div>
            </div>

            {!isActive ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-base text-amber-800 ring-1 ring-amber-200">
                You are not ACTIVE in this contest, so you cannot view the leaderboard.
              </div>
            ) : null}

            {lbError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-base text-rose-800 ring-1 ring-rose-200">
                {lbError}
              </div>
            ) : null}

            {topRowsToShow?.length ? (
              <div className="mt-4 overflow-auto rounded-2xl ring-1 ring-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rank</th>
                      <th className="px-4 py-3 font-semibold">Best</th>
                      <th className="px-4 py-3 font-semibold">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {topRowsToShow.map((row: any) => (
                      <tr key={`${row.rank}-${row.actor_id}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold">{row.rank}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {row.best_score === null || row.best_score === undefined ? "—" : Number(row.best_score).toFixed(3)}
                        </td>
                        <td className="px-4 py-3">{row.n_submissions ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 text-base text-slate-700">
                {lbBusy ? "Loading leaderboard…" : "No leaderboard available yet."}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">My submissions</h3>
                <p className="mt-1 text-base text-slate-700">Progress + inspect one submission (metrics only).</p>
              </div>
            </div>

            {histError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-base text-rose-800 ring-1 ring-rose-200">
                {histError}
              </div>
            ) : null}

            <div className="mt-5">
              <ProgressCharts series={progressSeries} />
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-8">
                  <div className="text-sm font-semibold text-slate-900">Select submission</div>
                  <select
                    value={histSelectedId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      setHistSelectedId(id);
                      if (selectedContestId && id) {
                        loadSubmissionDetail(selectedContestId, id);
                    }
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    <option value="" disabled>
                      {histBusy ? "Loading…" : submissionOptions.length ? "Choose a submission" : "No submissions found"}
                    </option>
                    {submissionOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-4">
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <SecondaryBlueButton
                      type="button"
                      onClick={() => {
                        if (selectedContestId && histSelectedId) {
                            loadSubmissionDetail(selectedContestId, histSelectedId);
                        }
                      }}
                      disabled={!histSelectedId || histDetailBusy}
                    >
                      {histDetailBusy ? "Refreshing…" : "Refresh selected"}
                    </SecondaryBlueButton>

                    <PrimaryGreenButton
                      type="button"
                      onClick={copyWeightsAsText}
                      disabled={!histSelectedId || !selectedWeights?.length}
                    >
                      Copy weights
                    </PrimaryGreenButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Selected submission</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selectedListItem
                      ? formatWhen(getCreatedAt(selectedListItem) ?? (selectedListItem as any).created_at)
                      : "—"}
                  </div>
                </div>
              </div>

              {histDetailError ? (
                <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
                  {histDetailError}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiChip label="Score" value={selectedScore === null ? "—" : selectedScore.toFixed(3)} />
                <KpiChip
                  label="Rank at submit"
                  value={selectedRankAtSubmit === null ? "—" : String(Math.round(selectedRankAtSubmit))}
                />
                <KpiChip label="Rank (current)" value={currentRankForSelected === null ? "—" : String(currentRankForSelected)} />
                <KpiChip label="Fixed income" value={selectedFiWeight === null ? "—" : Number(selectedFiWeight).toFixed(2)} />
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Metrics</div>
                <MetricList metrics={selectedMetrics} primaryMetricKey={primaryMetricKey} />
              </div>

              {!histItems?.length && !histBusy ? (
                <div className="mt-6 text-base text-slate-700">No submissions found.</div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
