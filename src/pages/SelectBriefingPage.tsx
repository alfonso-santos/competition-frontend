// src/pages/SelectBriefingPage.tsx
import { HeaderBar } from "../components/layout/HeaderBar";
import { SecondaryBlueButton, PrimaryGreenButton } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { AccentCard } from "../components/ui/AccentCard";
import { buildBriefingBlocks } from "../lib/briefing";
import { getContestId } from "../lib/utils";
import { useApp } from "../context/AppContext";

export default function SelectBriefingPage() {
  const {
    apiStatus,
    user,
    logout,

    contestsBusy,
    contestsError,
    contests,
    selectedContestId,
    selectContest,

    contestPublic,
    selectedContestItem,

    loadContests,

    downloadTrainDataset,
    trainBusy,
    trainMsg,

    setPage,
  } = useApp();

  const contest = contestPublic ?? selectedContestItem?.contest ?? null;
  const briefing = buildBriefingBlocks(contest);

  // --- At a glance: local tweaks (no backend changes) ---
  const nAssets =
    (contest as any)?.rules?.n_assets ??
    (contest as any)?.rules?.nAssets ??
    (contest as any)?.n_assets ??
    5;

 

  const atAGlance = (briefing.atAGlance ?? [])
    // Remove any prior "Fixed interest" chip (label-based)
    .filter((c) => !/fixed\s+(interest|income)/i.test(String(c.label ?? "")))
    .map((c) => {
      const label = String(c.label ?? "");
      let value = c.value;

      // Remove "Higher is better" (or similar) from the metric chip.
      if (/metric/i.test(label) && typeof value === "string") {
        value = value
          .replace(/\(.*higher.*better.*\)/gi, "")
          .replace(/higher\s+is\s+better/gi, "")
          .replace(/lower\s+is\s+better/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      // Assets chip: show "5 + Fixed Rate" (or contest-provided n_assets if available).
      if (/assets/i.test(label)) {
        value = `${String(nAssets)} + Fixed Rate`;
      }

      return { ...c, value };
    });

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
              <SecondaryBlueButton
                type="button"
                onClick={loadContests}
                disabled={contestsBusy}
              >
                {contestsBusy ? "Loading…" : "Reload contests"}
              </SecondaryBlueButton>

              <SecondaryBlueButton type="button" onClick={logout} disabled={!user}>
                Logout
              </SecondaryBlueButton>
            </div>
          </div>
        }
      />

      <main className="mx-auto max-w-5xl px-6">
        <div className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
          {/* Centered header */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Choose your competition</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-700">
              Select a competition, review the briefing, optionally download the
              training dataset, then continue.
            </p>
          </div>

          {contestsError ? (
            <div className="mt-5 rounded-2xl bg-rose-50 p-3 text-base text-rose-800 ring-1 ring-rose-200">
              {contestsError}
            </div>
          ) : null}

          {/* Dropdown full-width */}
          <div className="mt-6">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">
                Competition
              </span>
              <select
                value={selectedContestId}
                onChange={(e) => selectContest(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[16px] outline-none focus:border-slate-300"
              >
                <option value="" disabled>
                  {contestsBusy
                    ? "Loading…"
                    : contests.length
                    ? "Select a competition"
                    : "No competitions found"}
                </option>
                {contests.map((c: any) => {
                  const cid = getContestId(c);
                  const label = c?.contest?.name ? `${c.contest.name} (${cid})` : cid;
                  return (
                    <option key={cid} value={cid}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            {/* At a glance chips: centered + larger */}
            <div className="mt-5">
              <div className="text-lg font-semibold text-slate-900 text-center">
                At a glance
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {atAGlance.map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl ring-1 ring-slate-200 bg-white/60 px-1 py-1"
                  >
                    {/* Wrapper upsizes Chip without changing the component API */}
                    <div className="scale-[1.08] origin-center">
                      <Chip
                        label={c.label}
                        value={c.value}
                        tone={c.tone ?? "blue"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 cards in two columns */}
          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            <AccentCard title="Objective" tone="blue">
              <ul className="space-y-2 text-base">
                {briefing.objectiveLines.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-sky-500/70" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </AccentCard>

            <AccentCard title="Submission rules" tone="green">
              <ul className="space-y-2 text-base">
                {briefing.rulesLines.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-600/70" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </AccentCard>

            <AccentCard title="Limits" tone="amber">
              <ul className="space-y-2 text-base">
                {briefing.limitsLines.length ? (
                  briefing.limitsLines.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-600/70" />
                      <span>{t}</span>
                    </li>
                  ))
                ) : (
                  <div className="text-slate-700">No limits provided.</div>
                )}
              </ul>
            </AccentCard>

            <AccentCard title="Fixed income" tone="gray">
              <ul className="space-y-2 text-base">
                {briefing.fiLines.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-500/60" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </AccentCard>
          </div>

          {/* Bottom-right actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <SecondaryBlueButton
              type="button"
              onClick={downloadTrainDataset}
              disabled={!selectedContestId || trainBusy}
            >
              {trainBusy ? "Downloading…" : "Download training data"}
            </SecondaryBlueButton>

            <PrimaryGreenButton
              type="button"
              onClick={() => setPage("dashboard")}
              disabled={!selectedContestId}
            >
              Continue
            </PrimaryGreenButton>
          </div>

          {trainMsg ? (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              {trainMsg}
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
