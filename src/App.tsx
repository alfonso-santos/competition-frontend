// src/App.tsx
import { useApp } from "./context/useApp";

import LandingPage from "./pages/LandingPage";
import SelectBriefingPage from "./pages/SelectBriefingPage";
import DashboardPage from "./pages/DashboardPage";
import CompetitionSummaryPage from "./pages/CompetitionSummaryPage";
import AdminCreateContestPage from "./pages/AdminCreateContestPage";

export default function App() {
  const { page, isAdmin } = useApp();

  return (
    <div className="soft-bg min-h-screen text-slate-900">
      <main className="relative mx-auto max-w-6xl px-6 py-10">
        {page === "landing" ? (
          <LandingPage />
        ) : page === "select" ? (
          <SelectBriefingPage />
        ) : page === "summary" ? (
          <CompetitionSummaryPage />
        ) : page === "admin_create" ? (
          isAdmin ? (
            <AdminCreateContestPage />
          ) : (
            <SelectBriefingPage />
          )
        ) : (
          <DashboardPage />
        )}
      </main>
    </div>
  );
}
