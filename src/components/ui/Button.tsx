// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes } from "react";

export function SecondaryBlueButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-sky-200 bg-sky-100 text-sky-900 ring-sky-200 ${className}`}
    />
  );
}

export function PrimaryGreenButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-95 ${className}`}
      style={{ backgroundColor: "var(--brand-green)" }}
    />
  );
}
