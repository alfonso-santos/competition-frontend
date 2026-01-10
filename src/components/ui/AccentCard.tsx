// src/components/ui/AccentCard.tsx
import type { ReactNode } from "react";

export function AccentCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "blue" | "green" | "amber" | "gray";
  children: ReactNode;
}) {
  const bg =
    tone === "green"
      ? "bg-emerald-50/60"
      : tone === "amber"
      ? "bg-amber-50/60"
      : tone === "gray"
      ? "bg-slate-50"
      : "bg-sky-50/60";

  const bar =
    tone === "green"
      ? "bg-emerald-400/70"
      : tone === "amber"
      ? "bg-amber-400/70"
      : tone === "gray"
      ? "bg-slate-300"
      : "bg-sky-400/70";

  return (
    <section className={`relative overflow-hidden rounded-3xl p-5 ring-1 ring-slate-200 ${bg}`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${bar}`} />
      <div className="pl-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 text-[15px] leading-relaxed text-slate-800">{children}</div>
      </div>
    </section>
  );
}
