// src/components/forms/SubmitWeightsForm.tsx
import type { Dispatch, SetStateAction } from "react";
import { PrimaryGreenButton } from "../ui/Button";

export function SubmitWeightsForm({
  nAssets,
  isActive,
  canSubmit,
  submitBusy,
  onSubmit,
  submitError,

  weightsText,
  setWeightsText,
  fixedIncomeWeight,
  setFixedIncomeWeight,

  preview,
}: {
  nAssets: number;
  isActive: boolean;
  canSubmit: boolean;
  submitBusy: boolean;
  onSubmit: () => void;
  submitError: string;

  weightsText: string;
  setWeightsText: Dispatch<SetStateAction<string>>;
  fixedIncomeWeight: string;
  setFixedIncomeWeight: Dispatch<SetStateAction<string>>;

  preview: {
    nEntered: number;
    sumAssets: number | null;
    fi: number | null;
    fiOk: boolean;
    total: number | null;
    totalOk: boolean;
    weightsOk: boolean;
    weightsErr: string;
  };
}) {
  return (
    <div className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Submit weights</h3>
          <p className="mt-1 text-base text-slate-700">
            Paste <span className="font-semibold text-slate-900">{nAssets || "—"}</span> weights (comma / space / newline).
          </p>
        </div>
        <PrimaryGreenButton type="button" onClick={onSubmit} disabled={!canSubmit}>
          {submitBusy ? "Submitting…" : "Submit"}
        </PrimaryGreenButton>
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

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-600">Weights ({nAssets || "—"} values)</span>
          <textarea
            value={weightsText}
            onChange={(e) => setWeightsText(e.target.value)}
            placeholder="Example (5 assets): 0.2, 0.2, 0.2, 0.2, 0.2"
            rows={5}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
          />
          <div className="mt-2 text-sm text-slate-500">Accepted separators: commas, spaces, new lines, semicolons.</div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-600">Fixed income weight</span>
          <input
            value={fixedIncomeWeight}
            onChange={(e) => setFixedIncomeWeight(e.target.value)}
            placeholder="e.g. 0.00"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
          />
          <div className="mt-2 text-sm text-slate-500">Use 0 if your contest has no fixed-income component.</div>
        </label>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">Preview</div>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            <div>
              Entered: <span className="font-semibold text-slate-900">{preview.nEntered}</span> / {nAssets || "—"}
            </div>
            <div>
              Sum (assets):{" "}
              <span className="font-semibold text-slate-900">
                {preview.sumAssets === null ? "—" : preview.sumAssets.toFixed(6)}
              </span>
            </div>
            <div>
              Fixed income:{" "}
              <span className="font-semibold text-slate-900">
                {preview.fiOk && preview.fi !== null ? preview.fi.toFixed(6) : "—"}
              </span>
            </div>
            <div>
              Total:{" "}
              <span className="font-semibold text-slate-900">
                {preview.total === null ? "—" : preview.total.toFixed(6)}
              </span>{" "}
              {preview.total !== null ? (
                preview.totalOk ? (
                  <span className="ml-2 text-emerald-700 font-semibold">OK</span>
                ) : (
                  <span className="ml-2 text-rose-700 font-semibold">Must equal 1</span>
                )
              ) : null}
            </div>

            {!preview.weightsOk ? <div className="mt-2 text-rose-700">{preview.weightsErr}</div> : null}
            {!preview.fiOk ? <div className="mt-2 text-rose-700">Fixed income weight must be between 0 and 1.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
