// src/components/layout/HeaderBar.tsx
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { StatusChip, type ApiStatus } from "../ui/StatusChip";

export function HeaderBar({
  title,
  right,
  apiStatus,
  user,
  busy,
  onLogout,
  envLabel = "",
  hideUserBlock = false,
}: {
  title: string;
  right?: ReactNode;
  apiStatus: ApiStatus;
  user: User | null;
  busy: boolean;
  onLogout: () => void;
  envLabel?: string;
  hideUserBlock?: boolean;
}) {
  const hasRight = right !== undefined && right !== null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight sm:text-3xl">
            {title}{" "}
            {envLabel ? <span className="text-slate-500">({envLabel})</span> : null}
          </h1>
          <StatusChip status={apiStatus} />
        </div>
        <p className="mt-2 text-base text-slate-700 sm:text-lg">
          Submit portfolio weights • Get metrics • Track your rank
        </p>
      </div>

      <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
        {right ?? null}

        {!hasRight && !hideUserBlock && user ? (
          <>
            <img
              src="/brand/uam.png"
              alt="UAM"
              className="h-9 w-auto opacity-90 sm:h-10"
            />
            <div className="text-base text-slate-700 sm:text-sm">
              Logged in as{" "}
              <span className="font-medium text-slate-900">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              {busy ? "Working…" : "Logout"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
