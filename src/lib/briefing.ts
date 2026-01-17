// src/lib/briefing.ts
import { primaryMetricLabel } from "./metrics";

export type BriefingBlockChip = {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "gray";
};

export type BriefingBlocks = {
  atAGlance: BriefingBlockChip[];
  objectiveLines: string[];
  rulesLines: string[];
  limitsLines: string[];
  fiLines: string[];
};

/** Briefing builder (concise, rule-aware) */
export function buildBriefingBlocks(contest: any): BriefingBlocks {
  const rules = contest?.rules ?? {};
  const limits = contest?.limits ?? {};
  const ranking = contest?.ranking ?? {};


  const nAssets = Number(rules?.n_assets ?? 0) || 0;
  const allowShort = Boolean(rules?.allow_short);
  const sumMin = Number(rules?.sum_min ?? 0);
  const sumMax = Number(rules?.sum_max ?? 1);
  const maxLev = Number(rules?.max_leverage ?? 1);
  const maxPos = Number(rules?.max_positions ?? nAssets);

  const primary = String(ranking?.primary_metric ?? "");
  const order = String(ranking?.order ?? "desc");
  const better = order === "asc" ? "Lower is better" : "Higher is better";

  const fiAnn = contest?.fixed_income_annual_return_pct;
  const hasFiAnn = Number.isFinite(Number(fiAnn));

  const maxDaily = limits?.max_daily_submissions;
  const maxTotal = limits?.max_total_submissions;

  const maxFi = Number(contest?.max_fixed_income_weight);

  const atAGlance: BriefingBlockChip[] = [
    { label: "Metric", value: primary ? `${primaryMetricLabel(primary)} • ${better}` : "—", tone: "blue" },
    { label: "Assets", value: nAssets ? String(nAssets) : "—", tone: "gray" },
    { label: "Style", value: allowShort ? "Long/Short allowed" : "Long-only", tone: allowShort ? "amber" : "green" },
  ];

  if (typeof maxDaily === "number") atAGlance.push({ label: "Daily limit", value: String(maxDaily), tone: "gray" });
  if (typeof maxTotal === "number") atAGlance.push({ label: "Total limit", value: String(maxTotal), tone: "gray" });
  if (hasFiAnn) atAGlance.push({ label: "Fixed income", value: `${Number(fiAnn).toFixed(2)}% / year`, tone: "blue" });

  const objectiveLines: string[] = [];
  objectiveLines.push(primary ? `Your score is based on ${primaryMetricLabel(primary)}.` : "Your score is based on the contest metric.");
  objectiveLines.push("You submit portfolio weights; the system evaluates on unseen future returns.");

  const rulesLines: string[] = [];
  rulesLines.push(`Provide ${nAssets || "N"} risky-asset weights.`);
  rulesLines.push(allowShort ? "Short positions are allowed (negative weights)." : "All risky-asset weights must be ≥ 0.");

  if (maxLev > 1) rulesLines.push(`Leverage: sum(|risky weights|) + fixed income ≤ ${maxLev}.`);
  else rulesLines.push("Risky-asset weights plus the fixed-income weight must equal 1.");

  const eps = 1e-12;

  const isDefaultAlloc01 =
    Math.abs(sumMin - 0) < eps && Math.abs(sumMax - 1) < eps;

  const isFixedAlloc1 =
    Math.abs(sumMin - 1) < eps && Math.abs(sumMax - 1) < eps;

  if (!(isDefaultAlloc01 || isFixedAlloc1)) {
    rulesLines.push(`Total allocation must be between ${sumMin} and ${sumMax}.`);
  }

  if (nAssets && Number.isFinite(maxPos) && Math.round(maxPos) !== Math.round(nAssets)) {
    rulesLines.push(`Max positions: at most ${Math.round(maxPos)} non-zero risky-asset weights.`);
  }

  const limitsLines: string[] = [];
  if (contest?.start_date) limitsLines.push(`Start: ${String(contest.start_date)}`);
  if (contest?.end_date) limitsLines.push(`End: ${String(contest.end_date)}`);
  if (typeof maxDaily === "number") limitsLines.push(`Max submissions per day: ${maxDaily}`);
  if (typeof maxTotal === "number") limitsLines.push(`Max submissions total: ${maxTotal}`);

  const fiLines: string[] = [];
  if (hasFiAnn) fiLines.push(`Fixed income annual return: ${Number(fiAnn).toFixed(2)}%`);
  if (Number.isFinite(maxFi)) {
  fiLines.push(`Max fixed income weight: ${maxFi}`);
  } 
  fiLines.push("If your contest uses fixed income, include it in the total weight you submit.");

  return { atAGlance, objectiveLines, rulesLines, limitsLines, fiLines };
}
