// src/state/AppContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { apiFetch, publicFetch } from "../lib/api";
import { parseNumber, parseWeightsText, countDecimalsToken, validateWeightsSign } from "../lib/parse";
import { getContestId } from "../lib/utils";
import { safeFilenameFromContentDisposition } from "../lib/download";

export type ApiStatus = "checking" | "ok" | "down" | "missing_base_url";
type Page = "landing" | "select" | "dashboard" | "summary";

export type ContestItem = Record<string, any>;

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
    display_name?: string | null;
  }>;
  me?: any;
  total_participants?: number | null;
};


export type SubmissionListItem = {
  submission_id: string;
  status?: "ok" | "duplicate";
  score?: number | null;
  primary_metric?: string | null;
  created_at?: string | null;
  rank_at_submit?: number | null;
};

export type SubmissionDetail = Record<string, any>;

export type SubmissionSeries = {
  portfolio_returns?: number[];
  returns?: number[];
  equity?: number[];
  created_at?: string;
};

export type AppContextValue = {
  // env/ui
  baseUrl: string;
  apiStatus: ApiStatus;
  checkApiHealth: () => Promise<void>;
  apiBaseShown: boolean;
  setApiBaseShown: React.Dispatch<React.SetStateAction<boolean>>;

  // navigation
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page>>;

  // auth
  user: User | null;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  busy: boolean;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  login: () => Promise<void>;
  logout: () => Promise<void>;

  // contests
  contestsBusy: boolean;
  contestsError: string;
  contests: ContestItem[];
  selectedContestId: string;
  selectedContestItem: ContestItem | null;
  contestPublic: any;
  loadContests: () => Promise<void>;
  selectContest: (id: string) => void;

  // training dataset download
  trainBusy: boolean;
  trainMsg: string;
  downloadTrainDataset: () => Promise<void>;

  // /me
  meBusy: boolean;
  meError: string;
  meData: MeResponse | null;
  loadMe: () => Promise<void>;

  // submit
  weightsText: string;
  setWeightsText: React.Dispatch<React.SetStateAction<string>>;
  fixedIncomeWeight: string;
  setFixedIncomeWeight: React.Dispatch<React.SetStateAction<string>>;
  submitBusy: boolean;
  submitError: string;
  submitResult: SubmitResponse | null;
  submitWeights: () => Promise<void>;

  // leaderboard
  lbBusy: boolean;
  lbError: string;
  lbData: LeaderboardResponse | null;
  loadLeaderboard: (limit?: number) => Promise<void>;

  // submissions history
  histBusy: boolean;
  histError: string;
  histItems: SubmissionListItem[];
  histSelectedId: string;
  setHistSelectedId: React.Dispatch<React.SetStateAction<string>>;
  loadSubmissions: (limit?: number) => Promise<void>;

  // selected submission detail
  histDetailBusy: boolean;
  histDetailError: string;
  histDetail: SubmissionDetail | null;
  loadSubmissionDetail: (contestId: string, submissionId: string) => Promise<void>;


  // series
  histSeriesBusy: boolean;
  histSeriesError: string;
  histSeries: SubmissionSeries | null;
  histTail: number;
  setHistTail: React.Dispatch<React.SetStateAction<number>>;
  loadSubmissionSeries: (submissionId: string, tail: number) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider />");
  return ctx;
}

// --- helpers (frontend-side robustness) ---
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

function coerceMaxFixedIncomeWeight(contest: any): number {
  // Prefer contest.root.max_fixed_income_weight (backend canonical),
  // fallback to contest.limits.max_fixed_income_weight (older frontend assumption),
  // fallback to 1.
  const v1 = Number(contest?.max_fixed_income_weight);
  if (Number.isFinite(v1) && v1 >= 0) return v1;

  const v2 = Number(contest?.limits?.max_fixed_income_weight);
  if (Number.isFinite(v2) && v2 >= 0) return v2;

  return 1;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [apiBaseShown, setApiBaseShown] = useState(false);

  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [contestsBusy, setContestsBusy] = useState(false);
  const [contestsError, setContestsError] = useState("");
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [selectedContestId, setSelectedContestId] = useState("");

  const [trainBusy, setTrainBusy] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");

  const [meBusy, setMeBusy] = useState(false);
  const [meError, setMeError] = useState("");
  const [meData, setMeData] = useState<MeResponse | null>(null);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const [weightsText, setWeightsText] = useState("");
  // Default should display as 0.0
  const [fixedIncomeWeight, setFixedIncomeWeight] = useState("0.0");

  const [lbBusy, setLbBusy] = useState(false);
  const [lbError, setLbError] = useState("");
  const [lbData, setLbData] = useState<LeaderboardResponse | null>(null);

  const [histBusy, setHistBusy] = useState(false);
  const [histError, setHistError] = useState("");
  const [histItems, setHistItems] = useState<SubmissionListItem[]>([]);
  const [histSelectedId, setHistSelectedId] = useState("");
  const [histDetailBusy, setHistDetailBusy] = useState(false);
  const [histDetailError, setHistDetailError] = useState("");
  const [histDetail, setHistDetail] = useState<SubmissionDetail | null>(null);
  const [histSeriesBusy, setHistSeriesBusy] = useState(false);
  const [histSeriesError, setHistSeriesError] = useState("");
  const [histSeries, setHistSeries] = useState<SubmissionSeries | null>(null);
  const [histTail, setHistTail] = useState<number>(252);

  const selectedContestItem = useMemo(() => {
    if (!selectedContestId) return null;
    return contests.find((c) => getContestId(c) === selectedContestId) ?? null;
  }, [contests, selectedContestId]);

  const contestPublic = useMemo(() => {
    return meData?.contest ?? selectedContestItem?.contest ?? null;
  }, [meData, selectedContestItem]);

  async function checkApiHealth() {
    if (!baseUrl) {
      setApiStatus("missing_base_url");
      return;
    }
    setApiStatus("checking");
    try {
      await publicFetch("/health");
      setApiStatus("ok");
    } catch {
      setApiStatus("down");
    }
  }

  useEffect(() => {
    void checkApiHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (!u) {
        // --- ensure Landing always starts with empty credentials ---
        setEmail("");
        setPassword("");

        setPage("landing");
        setContests([]);
        setSelectedContestId("");
        setMeData(null);
        setMeError("");
        setSubmitResult(null);
        setSubmitError("");
        setLbData(null);
        setLbError("");
        setWeightsText("");
        setFixedIncomeWeight("0.0");
        setHistItems([]);
        setHistSelectedId("");
        setHistDetail(null);
        setHistSeries(null);
        setMsg("");
        setTrainMsg("");
      } else {
        setPage("select");
        void loadContests();
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (page !== "dashboard") return;
    if (!selectedContestId) return;
    void loadMe();
    void loadSubmissions(50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedContestId]);

  async function login() {
    setMsg("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMsg("Welcome! Loading your contests…");
    } catch (err: any) {
      const code = String(err?.code ?? "");
      if (code === "auth/invalid-credential") setMsg("Invalid email or password.");
      else if (code === "auth/too-many-requests") setMsg("Too many attempts. Try again later.");
      else if (code === "auth/network-request-failed") setMsg("Network error. Check your connection.");
      else setMsg(String(err?.message ?? "Login failed."));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setMsg("");
    setBusy(true);
    try {
      await signOut(auth);
      setMsg("Logged out.");
    } catch {
      setMsg("Could not log out.");
    } finally {
      setEmail("");
      setPassword("");
      setBusy(false);
    }
  }

  async function loadContests() {
    setContestsError("");
    setContestsBusy(true);
    try {
      const data = await apiFetch<unknown>("/contests");
      const list = Array.isArray(data) ? data : (data as any)?.items ?? [];
      if (!Array.isArray(list)) throw new Error("Unexpected /contests response format.");

      setContests(list as ContestItem[]);
      if (!selectedContestId && list.length > 0) {
        const firstId = getContestId(list[0] as ContestItem);
        if (firstId) setSelectedContestId(firstId);
      }
    } catch (err: any) {
      setContestsError(String(err?.message ?? err));
      setContests([]);
      setSelectedContestId("");
    } finally {
      setContestsBusy(false);
    }
  }

  function selectContest(id: string) {
    setSelectedContestId(id);
    setMeData(null);
    setMeError("");
    setSubmitResult(null);
    setSubmitError("");
    setLbData(null);
    setLbError("");
    setHistItems([]);
    setHistSelectedId("");
    setHistDetail(null);
    setHistSeries(null);
    setTrainMsg("");
    // Keep inputs but reset FI to a clean default
    setFixedIncomeWeight("0.0");
  }

  async function loadMe() {
    if (!selectedContestId) return;
    setMeError("");
    setMeBusy(true);
    try {
      const data = await apiFetch<MeResponse>(`/contests/${encodeURIComponent(selectedContestId)}/me`);
      setMeData(data);
    } catch (err: any) {
      setMeData(null);
      setMeError(String(err?.message ?? err));
    } finally {
      setMeBusy(false);
    }
  }

  async function loadLeaderboard(limit = 50) {
    if (!selectedContestId) return;
    setLbError("");
    setLbBusy(true);
    try {
      const data = await apiFetch<LeaderboardResponse>(
        `/contests/${encodeURIComponent(selectedContestId)}/leaderboard?limit=${encodeURIComponent(String(limit))}`
      );
      setLbData(data);
    } catch (err: any) {
      setLbData(null);
      setLbError(String(err?.message ?? err));
    } finally {
      setLbBusy(false);
    }
  }

  async function protectedFetchRaw(path: string): Promise<Response> {
    const u = auth.currentUser;
    if (!u) throw new Error("Not authenticated.");
    const tok = await u.getIdToken();
    const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    return fetch(url, { method: "GET", headers: { Authorization: `Bearer ${tok}` } });
  }

  async function downloadTrainDataset() {
    if (!selectedContestId) return;
    setTrainMsg("");
    setTrainBusy(true);
    try {
      const path = `/contests/${encodeURIComponent(selectedContestId)}/dataset/train`;
      const resp = await protectedFetchRaw(path);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Download failed (${resp.status}): ${txt || resp.statusText}`);
      }

      const blob = await resp.blob();
      const cd = resp.headers.get("content-disposition");
      const fname = safeFilenameFromContentDisposition(cd) || `${selectedContestId}_train_dataset.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setTrainMsg("Training dataset downloaded.");
    } catch (e: any) {
      setTrainMsg(String(e?.message ?? e));
    } finally {
      setTrainBusy(false);
    }
  }

  async function loadSubmissions(limit = 50) {
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

      if (histSelectedId && !norm.some((it) => it.submission_id === histSelectedId)) {
        setHistSelectedId("");
        setHistDetail(null);
        setHistSeries(null);
      }
    } catch (e: any) {
      setHistError(String(e?.message ?? e));
      setHistItems([]);
    } finally {
      setHistBusy(false);
    }
  }

  async function loadSubmissionDetail(
    contestId: string,
    submissionId: string
  ) {
    if (!contestId || !submissionId) return;

    setHistDetailError("");
    setHistDetailBusy(true);

    try {
      const d = await apiFetch<SubmissionDetail>(
        `/contests/${encodeURIComponent(contestId)}/submissions/${encodeURIComponent(submissionId)}`
      );
      setHistDetail(d);
    } catch (e: any) {
      setHistDetail(null);
      setHistDetailError(String(e?.message ?? e));
    } finally {
      setHistDetailBusy(false);
    }
  }


  async function loadSubmissionSeries(submissionId: string, tail: number) {
    if (!selectedContestId || !submissionId) return;
    setHistSeriesError("");
    setHistSeriesBusy(true);
    try {
      const s = await apiFetch<SubmissionSeries>(
        `/contests/${encodeURIComponent(selectedContestId)}/submissions/${encodeURIComponent(
          submissionId
        )}/series?tail=${encodeURIComponent(String(tail))}`
      );
      setHistSeries(s);
    } catch (e: any) {
      setHistSeries(null);
      setHistSeriesError(String(e?.message ?? e));
    } finally {
      setHistSeriesBusy(false);
    }
  }

  function validateSubmitInputs():
    | { ok: true; payload: { weights: number[]; fixed_income_weight: number } }
    | { ok: false; error: string } {
    const contest = contestPublic ?? selectedContestItem?.contest ?? null;
    const rules = contest?.rules ?? {};


    const nAssets = Number(rules?.n_assets ?? 0) || 0;
    if (!nAssets) return { ok: false, error: "Contest rules missing (n_assets)." };

    const participantStatus = String(meData?.participant?.status ?? selectedContestItem?.participant?.status ?? "").toLowerCase();
    const isActive = participantStatus === "active";
    if (!isActive) return { ok: false, error: "You are not ACTIVE in this contest." };

    // Robust allow_short parsing
    const allowShort = coerceBoolish(rules?.allow_short, false);

    // Tolerance for sum-to-1 check (prefer backend-like sum_tol, but keep a mild UX tolerance floor).
    const sumTolRule = Number(rules?.sum_tol);
    const sumTol = Number.isFinite(sumTolRule) && sumTolRule >= 0 ? Math.max(sumTolRule, 1e-6) : 1e-6;

    // Canonical max FI: prefer contest.max_fixed_income_weight (backend),
    // fallback to contest.limits.max_fixed_income_weight (older),
    // fallback 1.
    const maxFi = coerceMaxFixedIncomeWeight(contest);

    // --- Fixed income parsing (dot decimals only) + 3 decimals max ---
    const fiToken = String(fixedIncomeWeight ?? "").trim();
    const fi = parseNumber(fiToken);
    if (fi === null) return { ok: false, error: 'Invalid fixed income number. Use "." for decimals.' };
    if (countDecimalsToken(fiToken) > 3) return { ok: false, error: "Fixed income has more than 3 decimals." };
    if (!allowShort && fi < 0) return { ok: false, error: "Fixed income must be ≥ 0 in long-only contests." };
    if (fi > maxFi + 1e-12) return { ok: false, error: `Fixed income exceeds contest max (${maxFi}).` };

    // --- Weights parsing + 3 decimals max ---
    const parsed = parseWeightsText(weightsText, nAssets);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    // --- Sign rule (long-only) ---
    const signCheck = validateWeightsSign(parsed.weights, allowShort);
    if (!signCheck.ok) return { ok: false, error: signCheck.error };

    // --- Total sum must be 1 (always), including FI ---
    const sumAssets = parsed.weights.reduce((a, b) => a + b, 0);
    const total = sumAssets + fi;
    if (Math.abs(total - 1.0) > sumTol) {
      return { ok: false, error: `Weights must sum to 1 (including fixed income). Current sum = ${total.toFixed(6)}.` };
    }

    return { ok: true, payload: { weights: parsed.weights, fixed_income_weight: fi } };
  }

  async function submitWeights() {
    setSubmitError("");
    setSubmitResult(null);

    const v = validateSubmitInputs();
    if (!v.ok) {
      setSubmitError(v.error);
      return;
    }

    setSubmitBusy(true);
    try {
      const data = await apiFetch<SubmitResponse>(
        `/contests/${encodeURIComponent(selectedContestId)}/submit`,
        {
          method: "POST",
          body: JSON.stringify(v.payload),
        } as any
      );

      setSubmitResult(data);
      void loadMe();
      void loadSubmissions(50);
    } catch (err: any) {
      setSubmitError(String(err?.message ?? err));
    } finally {
      setSubmitBusy(false);
    }
  }

  const value: AppContextValue = {
    baseUrl,
    apiStatus,
    checkApiHealth,
    apiBaseShown,
    setApiBaseShown,

    page,
    setPage,

    user,
    email,
    setEmail,
    password,
    setPassword,
    busy,
    msg,
    setMsg,
    login,
    logout,

    contestsBusy,
    contestsError,
    contests,
    selectedContestId,
    selectedContestItem,
    contestPublic,
    loadContests,
    selectContest,

    trainBusy,
    trainMsg,
    downloadTrainDataset,

    meBusy,
    meError,
    meData,
    loadMe,

    weightsText,
    setWeightsText,
    fixedIncomeWeight,
    setFixedIncomeWeight,
    submitBusy,
    submitError,
    submitResult,
    submitWeights,

    lbBusy,
    lbError,
    lbData,
    loadLeaderboard,

    histBusy,
    histError,
    histItems,
    histSelectedId,
    setHistSelectedId,
    loadSubmissions,

    histDetailBusy,
    histDetailError,
    histDetail,
    loadSubmissionDetail,

    histSeriesBusy,
    histSeriesError,
    histSeries,
    histTail,
    setHistTail,
    loadSubmissionSeries,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
