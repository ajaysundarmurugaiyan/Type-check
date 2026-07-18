"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import LineChart from "@/components/LineChart";
import { useAuth } from "@/components/AuthProvider";
import { useResults, summarize } from "@/components/useResults";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataStates";
import { formatTime, formatDateTime } from "@/lib/typing";

function Card({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-3xl font-bold ${accent || "text-slate-800"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Delta({ value, unit = "" }) {
  if (value === 0)
    return <span className="text-slate-400">no change yet</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-emerald-600" : "text-red-500"}>
      {up ? "▲" : "▼"} {Math.abs(value)}
      {unit} since your first test
    </span>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { rows, error, loading, reload } = useResults();

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!rows || rows.length === 0)
    return (
      <EmptyState message="Take your first typing test and your stats and progress charts will appear here." />
    );

  const s = summarize(rows);
  const recent = rows.slice(0, 5);
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "there");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {name} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Last test: {formatDateTime(s.lastDate)}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Start a new test
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Tests taken" value={s.count} />
        <Card label="Best WPM" value={s.bestWpm} accent="text-indigo-600" />
        <Card label="Avg WPM" value={s.avgWpm} />
        <Card label="Best accuracy" value={`${s.bestAcc}%`} accent="text-emerald-600" />
        <Card label="Avg accuracy" value={`${s.avgAcc}%`} />
        <Card label="Last test" value={`${s.lastWpm} wpm`} sub={`${s.lastAcc}% accuracy`} />
      </div>

      {/* Improvement line */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <span className="font-semibold text-slate-600">Speed trend: </span>
          <Delta value={s.wpmDelta} unit=" wpm" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <span className="font-semibold text-slate-600">Accuracy trend: </span>
          <Delta value={s.accDelta} unit="%" />
        </div>
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <LineChart title="Net WPM over time" points={s.wpmSeries} color="#4f46e5" />
        <LineChart
          title="Accuracy over time"
          points={s.accSeries}
          color="#059669"
          unit="%"
        />
      </div>

      {/* Recent attempts */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Recent attempts</h2>
        <Link href="/history" className="text-sm font-semibold text-indigo-600 hover:underline">
          View all →
        </Link>
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Passage</th>
              <th className="px-4 py-3 font-semibold">Net WPM</th>
              <th className="px-4 py-3 font-semibold">Accuracy</th>
              <th className="px-4 py-3 font-semibold">Wrong</th>
              <th className="px-4 py-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-slate-700">{r.passageTitle || "—"}</td>
                <td className="px-4 py-3 font-semibold text-indigo-600">{r.netWpm}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{r.accuracy}%</td>
                <td className="px-4 py-3 text-red-500">{r.wrong}</td>
                <td className="px-4 py-3 text-slate-500">{formatTime(r.timeUsedSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-[100dvh] flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <DashboardContent />
        </main>
      </div>
    </RequireAuth>
  );
}
