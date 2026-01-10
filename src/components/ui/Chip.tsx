// src/components/ui/Chip.tsx
export function Chip({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "gray";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : tone === "gray"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : "bg-sky-50 text-sky-800 ring-sky-200";

  return (
    <div className={`rounded-2xl px-3 py-2 ring-1 ${cls}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
