// src/components/ui/StatusChip.tsx
import { useMemo } from "react";

export type ApiStatus = "checking" | "ok" | "down" | "missing_base_url";

export function StatusChip({ status }: { status: ApiStatus }) {
  const cfg = useMemo(() => {
    switch (status) {
      case "ok":
        return { text: "API OK", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
      case "down":
        return { text: "API DOWN", cls: "bg-rose-50 text-rose-800 ring-rose-200" };
      case "missing_base_url":
        return { text: "Missing VITE_API_BASE_URL", cls: "bg-amber-50 text-amber-800 ring-amber-200" };
      default:
        return { text: "Checking API…", cls: "bg-slate-100 text-slate-700 ring-slate-200" };
    }
  }, [status]);

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
}
