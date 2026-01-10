// src/lib/types.ts

export type ApiStatus = "checking" | "ok" | "down" | "missing_base_url";
export type Page = "landing" | "select" | "dashboard";

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
  }>;
  me?: any;
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
