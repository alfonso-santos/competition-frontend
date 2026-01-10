import { useState } from "react";
import { apiFetch } from "../lib/api";
import type { LeaderboardResponse } from "../lib/types";

export function useLeaderboard(selectedContestId: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  async function load(limit = 50) {
    if (!selectedContestId) return;
    setError("");
    setBusy(true);
    try {
      const d = await apiFetch<LeaderboardResponse>(
        `/contests/${encodeURIComponent(selectedContestId)}/leaderboard?limit=${encodeURIComponent(String(limit))}`
      );
      setData(d);
    } catch (e: any) {
      setData(null);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setData(null);
    setError("");
  }

  return { busy, error, data, load, reset, setError };
}
