import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { parseNumber, parseWeightsText } from "../lib/parse";
import type { SubmitResponse } from "../lib/types";

export function useSubmit(params: {
  selectedContestId: string;
  contestPublic: any;
  nAssets: number;
  isActive: boolean;
}) {
  const { selectedContestId, contestPublic, nAssets, isActive } = params;

  const [weightsText, setWeightsText] = useState("");
  const [fixedIncomeWeight, setFixedIncomeWeight] = useState("0");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const preview = useMemo(() => {
    const parsed = parseWeightsText(weightsText, nAssets);
    const fi = parseNumber(fixedIncomeWeight);
    const fiOk = fi !== null && fi >= 0 && fi <= 1;

    let sumAssets: number | null = null;
    if (parsed.ok && parsed.weights) sumAssets = parsed.weights.reduce((a, b) => a + b, 0);

    const total = sumAssets === null || !fiOk || fi === null ? null : sumAssets + fi;

    return {
      weightsOk: parsed.ok,
      weightsErr: parsed.ok ? "" : parsed.error || "Invalid weights.",
      nEntered: parsed.ok && parsed.weights ? parsed.weights.length : 0,
      sumAssets,
      fi,
      fiOk,
      total,
      totalOk: total !== null ? Math.abs(total - 1.0) <= 1e-3 : false,
    };
  }, [weightsText, fixedIncomeWeight, nAssets]);

  function validate(): { ok: boolean; payload?: { weights: number[]; fixed_income_weight: number }; error?: string } {
    if (!nAssets) return { ok: false, error: "Contest rules missing (n_assets)." };
    if (!isActive) return { ok: false, error: "You are not ACTIVE in this contest." };

    const fi = parseNumber(fixedIncomeWeight);
    if (fi === null || fi < 0 || fi > 1) return { ok: false, error: "Fixed income weight must be between 0 and 1." };

    const parsed = parseWeightsText(weightsText, nAssets);
    if (!parsed.ok) {
    return { ok: false, error: parsed.error || "Invalid weights." };
    }


    const allowShort = Boolean(contestPublic?.rules?.allow_short);
    for (let i = 0; i < parsed.weights.length; i++) {
      const v = parsed.weights[i];
      if (!allowShort && v < 0) return { ok: false, error: `Weight ${i + 1} must be ≥ 0.` };
    }

    const sumAssets = parsed.weights.reduce((a, b) => a + b, 0);
    const total = sumAssets + fi;

    const maxLev = Number(contestPublic?.rules?.max_leverage ?? 1);
    if (!(Number.isFinite(maxLev) && maxLev > 1)) {
      if (Math.abs(total - 1.0) > 1e-3) {
        return { ok: false, error: `Weights must sum to 1 (including fixed income). Current sum = ${total.toFixed(6)}.` };
      }
    }

    return { ok: true, payload: { weights: parsed.weights, fixed_income_weight: fi } };
  }

  async function submit() {
    setError("");
    setResult(null);

    if (!selectedContestId) {
      setError("No contest selected.");
      return;
    }

    const v = validate();
    if (!v.ok) {
      setError(v.error || "Invalid inputs.");
      return;
    }

    setBusy(true);
    try {
      const data = await apiFetch<SubmitResponse>(`/contests/${encodeURIComponent(selectedContestId)}/submit`, {
        method: "POST",
        body: JSON.stringify(v.payload),
      } as any);
      setResult(data);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setError("");
    setResult(null);
  }

  return {
    weightsText,
    setWeightsText,
    fixedIncomeWeight,
    setFixedIncomeWeight,
    busy,
    error,
    result,
    preview,
    submit,
    reset,
    setError,
  };
}
