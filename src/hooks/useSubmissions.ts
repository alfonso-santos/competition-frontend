import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { equityFromLogReturns } from "../lib/series";
import type { SubmissionDetail, SubmissionListItem, SubmissionSeries } from "../lib/types";

export function useSubmissions(selectedContestId: string) {
  const [histBusy, setHistBusy] = useState(false);
  const [histError, setHistError] = useState("");
  const [histItems, setHistItems] = useState<SubmissionListItem[]>([]);

  const [selectedId, setSelectedId] = useState("");
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);

  const [seriesBusy, setSeriesBusy] = useState(false);
  const [seriesError, setSeriesError] = useState("");
  const [series, setSeries] = useState<SubmissionSeries | null>(null);

  const [tail, setTail] = useState<number>(252);

  async function loadList(limit = 50) {
    if (!selectedContestId) return;
    setHistError("");
    setHistBusy(true);
    try {
      const data = await apiFetch<any>(
        `/contests/${encodeURIComponent(selectedContestId)}/submissions?limit=${encodeURIComponent(String(limit))}`
      );
      const items = Array.isArray(data) ? data : data?.items ?? [];
      if (!Array.isArray(items)) throw new Error("Unexpected /submissions response format.");

      const norm: SubmissionListItem[] = items
        .map((x: any) => ({
          submission_id: String(x.submission_id ?? x.id ?? ""),
          status: x.status,
          score: x.score,
          primary_metric: x.primary_metric,
          created_at: x.created_at ?? x.submitted_at ?? null,
          rank_at_submit: x.rank_at_submit ?? null,
        }))
        .filter((x) => x.submission_id);

      setHistItems(norm);

      if (selectedId && !norm.some((it) => it.submission_id === selectedId)) {
        setSelectedId("");
        setDetail(null);
        setSeries(null);
      }
    } catch (e: any) {
      setHistError(String(e?.message ?? e));
      setHistItems([]);
    } finally {
      setHistBusy(false);
    }
  }

  async function loadDetail(submissionId: string) {
    if (!selectedContestId || !submissionId) return;
    setDetailError("");
    setDetailBusy(true);
    try {
      const d = await apiFetch<SubmissionDetail>(
        `/contests/${encodeURIComponent(selectedContestId)}/submissions/${encodeURIComponent(submissionId)}`
      );
      setDetail(d);
    } catch (e: any) {
      setDetail(null);
      setDetailError(String(e?.message ?? e));
    } finally {
      setDetailBusy(false);
    }
  }

  async function loadSeries(submissionId: string, t: number) {
    if (!selectedContestId || !submissionId) return;
    setSeriesError("");
    setSeriesBusy(true);
    try {
      const s = await apiFetch<SubmissionSeries>(
        `/contests/${encodeURIComponent(selectedContestId)}/submissions/${encodeURIComponent(submissionId)}/series?tail=${encodeURIComponent(String(t))}`
      );
      setSeries(s);
    } catch (e: any) {
      setSeries(null);
      setSeriesError(String(e?.message ?? e));
    } finally {
      setSeriesBusy(false);
    }
  }

  const equity = useMemo(() => {
    const eq = series?.equity;
    if (Array.isArray(eq) && eq.length) return eq.map((v, i) => ({ t: i + 1, equity: Number(v) }));
    const r = (series?.portfolio_returns ?? series?.returns) ?? [];
    if (Array.isArray(r) && r.length) return equityFromLogReturns(r);
    return [];
  }, [series]);

  function resetAll() {
    setHistItems([]);
    setHistError("");
    setSelectedId("");
    setDetail(null);
    setDetailError("");
    setSeries(null);
    setSeriesError("");
  }

  return {
    histBusy,
    histError,
    histItems,
    loadList,

    selectedId,
    setSelectedId,

    detailBusy,
    detailError,
    detail,
    loadDetail,

    seriesBusy,
    seriesError,
    series,
    loadSeries,

    tail,
    setTail,

    equity,
    resetAll,
  };
}
