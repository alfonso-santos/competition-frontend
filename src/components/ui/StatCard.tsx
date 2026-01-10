// src/components/ui/StatCard.tsx
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white/75 p-2.5 ring-1 ring-slate-200 backdrop-blur shadow-sm">
      <div className="text-md font-medium text-slate-600">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">{value}</div>
      {sub ? <div className="mt-0.5 text-sm leading-snug text-slate-600">{sub}</div> : null}
      <div className="mt-2 h-[2px] w-full rounded-full" style={{ backgroundColor: "rgba(74,119,41,0.35)" }} />
    </div>
  );
}
