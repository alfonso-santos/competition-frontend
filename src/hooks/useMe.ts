import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import type { ContestItem, MeResponse } from "../lib/types";

export function useMe(selectedContestId: string, selectedContestItem: ContestItem | null) {
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const contestPublic = useMemo(() => {
    return meData?.contest ?? selectedContestItem?.contest ?? null;
  }, [meData, selectedContestItem]);

  const participantStatus = useMemo(() => {
    const s = meData?.participant?.status ?? selectedContestItem?.participant?.status;
    return s ? String(s).toLowerCase() : "";
  }, [meData, selectedContestItem]);

  const isActive = participantStatus === "active";

  const nAssets = useMemo(() => {
    const n = contestPublic?.rules?.n_assets;
    const nn = Number(n);
    return Number.isFinite(nn) && nn > 0 ? Math.round(nn) : 0;
  }, [contestPublic]);

  const primaryMetric = useMemo(() => {
    const pm = contestPublic?.ranking?.primary_metric;
    return pm ? String(pm) : "";
  }, [contestPublic]);

  async function loadMe() {
    if (!selectedContestId) return;
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch<MeResponse>(`/contests/${encodeURIComponent(selectedContestId)}/me`);
      setMeData(data);
    } catch (e: any) {
      setMeData(null);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function resetMe() {
    setMeData(null);
    setError("");
  }

  return {
    meData,
    busy,
    error,
    contestPublic,
    participantStatus,
    isActive,
    nAssets,
    primaryMetric,
    loadMe,
    resetMe,
    setError,
  };
}
