// src/pages/LandingPage.tsx
import { StatusChip } from "../components/ui/StatusChip";
import { PrimaryGreenButton } from "../components/ui/Button";
import { useApp } from "../context/AppContext";

export default function LandingPage() {
  const {
    apiStatus,
    email,
    setEmail,
    password,
    setPassword,
    login,
    busy,
    msg,
    apiBaseShown,
    setApiBaseShown,
    baseUrl,
  } = useApp();

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight sm:text-4xl">
            Portfolio Challenge <span className="text-slate-500"></span>
          </h1>
          <StatusChip status={apiStatus} />
        </div>
        <p className="mt-1 text-base text-slate-700 sm:text-xl">
          Submit portfolio weights • Get metrics • Track your rank
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200 backdrop-blur">
        <div className="text-lg font-semibold text-slate-900 sm:text-2xl">
          Compete with your classmates to design the best portfolio—and learn why it works.
        </div>
        <p className="mt-2 text-lg text-slate-700 sm:text-lg">
          Submit weights built from anonymous return series. Get metrics and your rank based on unseen future returns.
        </p>

        <div className="mt-5 flex justify-center">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <img
              src="/brand/bolsa.jpg"
              alt="Market chart"
              className="h-44 w-full object-cover sm:h-56"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setApiBaseShown((v) => !v)}
          className="mt-4 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
        >
          {apiBaseShown ? "Hide API base URL" : "Show API base URL"}
        </button>

        {apiBaseShown && (
          <pre className="mt-2 overflow-auto rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100 ring-1 ring-slate-800">
            {baseUrl || "(empty) — create .env.local with VITE_API_BASE_URL"}
          </pre>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium ring-1"
              style={{
                backgroundColor: "rgba(0,119,200,0.08)",
                color: "#0077C8",
                borderColor: "rgba(0,119,200,0.20)",
              }}
            >
              Anonymous data
            </span>
          </div>

          <ul className="mt-4 space-y-3 text-lg text-slate-700">
            <li className="flex gap-3">
              <span
                className="mt-2 h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: "#0077C8" }}
              />
              You receive anonymous daily returns (no names, no dates).
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: "#4A7729" }}
              />
              You compute optimal weights using your own criteria.
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: "#0077C8" }}
              />
              You submit weights; the system evaluates on unseen future returns.
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: "#4A7729" }}
              />
              You get portfolio metrics and your ranking for the contest metric.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl bg-white/80 p-6 ring-1 ring-slate-200 backdrop-blur">
          <h2 className="text-2xl font-semibold">Login</h2>
          <p className="mt-2 text-lg text-slate-700">
            Log in with your email and password.
          </p>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-lg font-medium text-slate-600">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-300"
              />
            </label>

            <label className="block">
              <span className="text-lg font-medium text-slate-600">Password</span>
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
              onClick={login}
              disabled={busy || !email.trim() || !password}
              className="w-full"
            >
              {busy ? "Logging in…" : "Login"}
            </PrimaryGreenButton>

            {msg && (
              <div className="rounded-2xl bg-slate-50 p-3 text-base text-slate-700 ring-1 ring-slate-200">
                {msg}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
