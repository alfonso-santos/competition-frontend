// src/components/ui/Badge.tsx
export function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "gray" | "green" | "red" | "blue" | "amber";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "red"
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : tone === "blue"
      ? "bg-sky-50 text-sky-800 ring-sky-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${cls}`}>
      {text}
    </span>
  );
}
