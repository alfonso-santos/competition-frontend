// src/components/forms/LoginForm.tsx
import type { Dispatch, SetStateAction } from "react";
import { PrimaryGreenButton } from "../ui/Button";

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  busy,
  msg,
}: {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  onLogin: () => void;
  busy: boolean;
  msg: string;
}) {
  return (
    <section className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur">
      <h2 className="text-lg font-semibold">Login</h2>
      <p className="mt-2 text-base text-slate-700">Log in with your email and password.</p>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-600">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-600">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
          />
        </label>

        <PrimaryGreenButton
          type="button"
          onClick={onLogin}
          disabled={busy || !email.trim() || !password}
          className="w-full"
        >
          {busy ? "Logging in…" : "Login"}
        </PrimaryGreenButton>

        {msg ? (
          <div className="rounded-2xl bg-slate-50 p-3 text-base text-slate-700 ring-1 ring-slate-200">
            {msg}
          </div>
        ) : null}
      </div>
    </section>
  );
}
