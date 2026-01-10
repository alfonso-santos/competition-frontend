import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getContestId } from "../lib/utils";
import type { ContestItem } from "../lib/types";

export function useContests() {
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedContestId, setSelectedContestId] = useState("");

  const selectedContestItem = useMemo(() => {
    if (!selectedContestId) return null;
    return contests.find((c) => getContestId(c) === selectedContestId) ?? null;
  }, [contests, selectedContestId]);

  async function loadContests() {
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch<unknown>("/contests");
      const list = Array.isArray(data) ? data : (data as any)?.items ?? [];
      if (!Array.isArray(list)) throw new Error("Unexpected /contests response format.");

      setContests(list as ContestItem[]);

      if (!selectedContestId && list.length > 0) {
        const firstId = getContestId(list[0] as ContestItem);
        if (firstId) setSelectedContestId(firstId);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setContests([]);
      setSelectedContestId("");
    } finally {
      setBusy(false);
    }
  }

  function selectContest(id: string) {
    setSelectedContestId(id);
  }

  return {
    contests,
    busy,
    error,
    selectedContestId,
    selectedContestItem,
    loadContests,
    selectContest,
    setError,
    setContests,
  };
}
