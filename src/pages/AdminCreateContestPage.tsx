import { useMemo, useState } from "react";

import { HeaderBar } from "../components/layout/HeaderBar";
import { PrimaryGreenButton, SecondaryBlueButton } from "../components/ui/Button";
import { apiFetch } from "../lib/api";
import { useApp } from "../context/useApp";

function parseRequiredInt(raw: string, field: string, min: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`${field} must be an integer >= ${min}.`);
  }
  return n;
}

function parseRequiredFloat(raw: string, field: string, min: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`${field} must be a number >= ${min}.`);
  }
  return n;
}

function parseOptionalInt(raw: string): number | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const n = Number(text);
  if (!Number.isInteger(n)) throw new Error("Optional integer field has invalid value.");
  return n;
}

function parseOptionalFloat(raw: string): number | undefined {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error("Optional numeric field has invalid value.");
  return n;
}

function parseOptionalJsonArray(raw: string): any[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Participants JSON must be an array.");
  }
  return parsed;
}

function parseOptionalJsonObject(raw: string): Record<string, any> {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  const parsed = JSON.parse(text);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Advanced overrides JSON must be an object.");
  }
  return parsed as Record<string, any>;
}

export default function AdminCreateContestPage() {
  const {
    apiStatus,
    user,
    logout,
    setPage,
    isAdmin,
    adminBusy,
    adminError,
    checkAdminAccess,
    loadContests,
    selectContest,
  } = useApp();

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState("");

  const [competitionType, setCompetitionType] = useState("smoke_test");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [nAssets, setNAssets] = useState("3");
  const [allowShort, setAllowShort] = useState(false);
  const [metric, setMetric] = useState("sharpe");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [scoringVersion, setScoringVersion] = useState("v1");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationDays, setDurationDays] = useState("90");
  const [version, setVersion] = useState("");
  const [allowExisting, setAllowExisting] = useState(false);
  const [contestId, setContestId] = useState("");
  const [contestName, setContestName] = useState("");

  const [datasetId, setDatasetId] = useState("ds_main");
  const [datasetFormat, setDatasetFormat] = useState<"csv" | "parquet">("csv");
  const [returnsType, setReturnsType] = useState<"log" | "simple">("log");
  const [freq, setFreq] = useState("252");
  const [gcsUri, setGcsUri] = useState("");
  const [trainGcsUri, setTrainGcsUri] = useState("");

  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [maxDaily, setMaxDaily] = useState("9999");
  const [maxTotal, setMaxTotal] = useState("9999");
  const [maxFi, setMaxFi] = useState("1.0");
  const [fiAnnualReturnPct, setFiAnnualReturnPct] = useState("2.0");

  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [minAbsWeight, setMinAbsWeight] = useState("");
  const [minPositions, setMinPositions] = useState("");
  const [maxPositions, setMaxPositions] = useState("");
  const [maxLeverage, setMaxLeverage] = useState("");
  const [sumTol, setSumTol] = useState("0.000001");
  const [zeroEpsilon, setZeroEpsilon] = useState("0.000001");

  const [participantsJson, setParticipantsJson] = useState("[]");
  const [advancedOverrides, setAdvancedOverrides] = useState("{}");

  const canSubmit = useMemo(() => {
    if (submitBusy) return false;
    if (!isAdmin) return false;
    if (!competitionType.trim()) return false;
    if (!gcsUri.trim()) return false;
    return true;
  }, [submitBusy, isAdmin, competitionType, gcsUri]);

  async function createContest() {
    setSubmitError("");
    setSubmitResult("");
    setSubmitBusy(true);
    try {
      const payload: Record<string, any> = {
        n_assets: parseRequiredInt(nAssets, "n_assets", 1),
        metric: (metric || "sharpe").trim().toLowerCase(),
        order,
        scoring_version: (scoringVersion || "v1").trim(),
        duration_days: parseRequiredInt(durationDays, "duration_days", 1),
        allow_existing: allowExisting,
        allow_short: allowShort,
        timezone: (timezone || "Europe/Madrid").trim(),
        max_daily: parseRequiredInt(maxDaily, "max_daily", 1),
        max_total: parseRequiredInt(maxTotal, "max_total", 1),
        max_fi: parseRequiredFloat(maxFi, "max_fi", 0),
        fixed_income_annual_return_pct: parseRequiredFloat(
          fiAnnualReturnPct,
          "fixed_income_annual_return_pct",
          -100
        ),
        dataset_id: (datasetId || "ds_main").trim(),
        dataset_format: datasetFormat,
        returns_type: returnsType,
        freq: parseRequiredInt(freq, "freq", 1),
        gcs_uri: gcsUri.trim(),
        description: description.trim(),
        mode: "portfolio",
        participation: "individual",
        status,
        competition_type: competitionType.trim().toLowerCase(),
        participants: parseOptionalJsonArray(participantsJson),
      };

      if (!payload.gcs_uri.startsWith("gs://")) {
        throw new Error("gcs_uri must start with gs://");
      }

      const start = startDate.trim();
      if (start) payload.start_date = start;
      const end = endDate.trim();
      if (end) payload.end_date = end;

      const v = parseOptionalInt(version);
      if (v !== undefined) {
        if (v < 1) throw new Error("version must be >= 1.");
        payload.version = v;
      }

      const cid = contestId.trim();
      if (cid) payload.contest_id = cid;
      const cname = contestName.trim();
      if (cname) payload.name = cname;

      const maybeTrainUri = trainGcsUri.trim();
      if (maybeTrainUri) payload.train_gcs_uri = maybeTrainUri;

      const maybeMinWeight = parseOptionalFloat(minWeight);
      if (maybeMinWeight !== undefined) payload.min_weight = maybeMinWeight;
      const maybeMaxWeight = parseOptionalFloat(maxWeight);
      if (maybeMaxWeight !== undefined) payload.max_weight = maybeMaxWeight;
      const maybeMinAbsWeight = parseOptionalFloat(minAbsWeight);
      if (maybeMinAbsWeight !== undefined) payload.min_abs_weight = maybeMinAbsWeight;
      const maybeMinPositions = parseOptionalInt(minPositions);
      if (maybeMinPositions !== undefined) payload.min_positions = maybeMinPositions;
      const maybeMaxPositions = parseOptionalInt(maxPositions);
      if (maybeMaxPositions !== undefined) payload.max_positions = maybeMaxPositions;
      const maybeMaxLeverage = parseOptionalFloat(maxLeverage);
      if (maybeMaxLeverage !== undefined) payload.max_leverage = maybeMaxLeverage;

      payload.sum_tol = parseRequiredFloat(sumTol, "sum_tol", Number.MIN_VALUE);
      payload.zero_epsilon = parseRequiredFloat(zeroEpsilon, "zero_epsilon", 0);

      const overrides = parseOptionalJsonObject(advancedOverrides);
      Object.assign(payload, overrides);

      const data = await apiFetch<any>("/admin/contests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSubmitResult(JSON.stringify(data, null, 2));
      await loadContests();

      const createdId = String(data?.contest_id ?? "");
      if (createdId) {
        selectContest(createdId);
      }
    } catch (err: any) {
      setSubmitError(String(err?.message ?? err ?? "Create contest failed."));
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <>
      <HeaderBar
        title="Admin - Create Competition"
        apiStatus={apiStatus}
        user={user}
        busy={false}
        onLogout={logout}
        hideUserBlock={true}
        right={
          <div className="flex w-full flex-col items-end gap-2">
            <div className="text-sm text-slate-700">
              Logged in as <span className="font-semibold text-slate-900">{user?.email ?? "-"}</span>
            </div>
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

      <main className="mx-auto max-w-6xl px-6 pb-10">
        {adminBusy ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
            Checking admin access...
          </div>
        ) : null}

        {adminError ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {adminError}
            <div className="mt-2">
              <SecondaryBlueButton type="button" onClick={() => void checkAdminAccess()}>
                Retry admin check
              </SecondaryBlueButton>
            </div>
          </div>
        ) : null}

        {!isAdmin ? (
          <div className="mt-6 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
            Admin access required.
          </div>
        ) : (
          <section className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
            <h2 className="text-2xl font-semibold">Create competition</h2>
            <p className="mt-2 text-sm text-slate-700">
              This form calls <code>POST /admin/contests</code>. Use Advanced overrides for any extra payload keys.
            </p>

            {submitError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{submitError}</div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <div className="text-sm font-medium text-slate-600">competition_type *</div>
                <input
                  value={competitionType}
                  onChange={(e) => setCompetitionType(e.target.value)}
                  placeholder="smoke_test"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">status</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-slate-600">description</div>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hackathon UAM"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">n_assets *</div>
                <input
                  value={nAssets}
                  onChange={(e) => setNAssets(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">allow_short</div>
                <select
                  value={allowShort ? "true" : "false"}
                  onChange={(e) => setAllowShort(e.target.value === "true")}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">metric</div>
                <input
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">order</div>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="desc">desc</option>
                  <option value="asc">asc</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">scoring_version</div>
                <input
                  value={scoringVersion}
                  onChange={(e) => setScoringVersion(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">start_date (YYYY-MM-DD)</div>
                <input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="2026-02-08"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">end_date (optional)</div>
                <input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="2026-05-09"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">duration_days</div>
                <input
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">version (optional)</div>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">contest_id (optional)</div>
                <input
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">name (optional)</div>
                <input
                  value={contestName}
                  onChange={(e) => setContestName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-slate-600">gcs_uri (TEST) *</div>
                <input
                  value={gcsUri}
                  onChange={(e) => setGcsUri(e.target.value)}
                  placeholder="gs://master-competition-api-data/<contest_id>/returns_TEST.csv"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-slate-600">train_gcs_uri (optional)</div>
                <input
                  value={trainGcsUri}
                  onChange={(e) => setTrainGcsUri(e.target.value)}
                  placeholder="gs://master-competition-api-data/<contest_id>/returns_TRAIN.csv"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">dataset_id</div>
                <input
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">dataset_format</div>
                <select
                  value={datasetFormat}
                  onChange={(e) => setDatasetFormat(e.target.value as "csv" | "parquet")}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="csv">csv</option>
                  <option value="parquet">parquet</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">returns_type</div>
                <select
                  value={returnsType}
                  onChange={(e) => setReturnsType(e.target.value as "log" | "simple")}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                >
                  <option value="log">log</option>
                  <option value="simple">simple</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">freq</div>
                <input
                  value={freq}
                  onChange={(e) => setFreq(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">timezone</div>
                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_daily</div>
                <input
                  value={maxDaily}
                  onChange={(e) => setMaxDaily(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_total</div>
                <input
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_fi</div>
                <input
                  value={maxFi}
                  onChange={(e) => setMaxFi(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">fixed_income_annual_return_pct</div>
                <input
                  value={fiAnnualReturnPct}
                  onChange={(e) => setFiAnnualReturnPct(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">min_weight (optional)</div>
                <input
                  value={minWeight}
                  onChange={(e) => setMinWeight(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_weight (optional)</div>
                <input
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">min_abs_weight (optional)</div>
                <input
                  value={minAbsWeight}
                  onChange={(e) => setMinAbsWeight(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">min_positions (optional)</div>
                <input
                  value={minPositions}
                  onChange={(e) => setMinPositions(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_positions (optional)</div>
                <input
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">max_leverage (optional)</div>
                <input
                  value={maxLeverage}
                  onChange={(e) => setMaxLeverage(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">sum_tol</div>
                <input
                  value={sumTol}
                  onChange={(e) => setSumTol(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-slate-600">zero_epsilon</div>
                <input
                  value={zeroEpsilon}
                  onChange={(e) => setZeroEpsilon(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-slate-600">participants (JSON array)</div>
                <textarea
                  value={participantsJson}
                  onChange={(e) => setParticipantsJson(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-slate-300"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-slate-600">Advanced overrides (JSON object)</div>
                <textarea
                  value={advancedOverrides}
                  onChange={(e) => setAdvancedOverrides(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-slate-300"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allowExisting}
                  onChange={(e) => setAllowExisting(e.target.checked)}
                />
                allow_existing
              </label>

              <PrimaryGreenButton type="button" onClick={createContest} disabled={!canSubmit}>
                {submitBusy ? "Creating..." : "Create competition"}
              </PrimaryGreenButton>
            </div>

            {submitResult ? (
              <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900/90 p-3 text-xs text-slate-100 ring-1 ring-slate-800">
                {submitResult}
              </pre>
            ) : null}
          </section>
        )}
      </main>
    </>
  );
}

