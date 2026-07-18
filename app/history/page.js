"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import LineChart from "@/components/LineChart";
import MistakesView from "@/components/MistakesView";
import { useResults, summarize } from "@/components/useResults";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataStates";
import { formatTime, formatDateTime } from "@/lib/typing";
import { PASSAGES } from "@/lib/passages";

function ReviewModal({ row, onClose }) {
  // Older records may not have the typed text stored.
  const target =
    row.passageText || PASSAGES.find((p) => p.id === row.passageId)?.text || "";
  const canReview = typeof row.typed === "string" && target;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h3 className="font-bold text-slate-800">{row.passageTitle || "Test"}</h3>
            <p className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-100 px-5 py-3 text-sm">
          <span>
            <b className="text-indigo-600">{row.netWpm}</b> net wpm
          </span>
          <span>
            <b className="text-emerald-600">{row.accuracy}%</b> accuracy
          </span>
          <span className="text-slate-600">{row.correct} correct</span>
          <span className="text-red-500">{row.wrong} wrong</span>
          <span className="text-slate-400">{row.left} not typed</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {canReview ? (
            <MistakesView target={target} typed={row.typed} fontSize={18} />
          ) : (
            <p className="text-sm text-slate-500">
              This test was recorded before the mistake-review feature was added,
              so the typed text wasn&apos;t saved. New tests will show the full
              review here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryContent() {
  const { rows, error, loading, reload, deleteRow } = useResults();
  const [review, setReview] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(row) {
    if (!window.confirm("Delete this test result? This cannot be undone.")) return;
    setDeletingId(row.id);
    try {
      await deleteRow(row.id);
    } catch {
      window.alert("Could not delete this result. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading your history…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!rows || rows.length === 0) return <EmptyState />;

  const s = summarize(rows);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-800">Your Progress</h1>
      <p className="text-sm text-slate-500">
        {s.count} test{s.count === 1 ? "" : "s"} · Best {s.bestWpm} WPM · Best{" "}
        {s.bestAcc}% accuracy · Avg {s.avgWpm} WPM / {s.avgAcc}%
      </p>

      {/* Charts */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <LineChart title="Net WPM over time" points={s.wpmSeries} color="#4f46e5" />
        <LineChart
          title="Accuracy over time"
          points={s.accSeries}
          color="#059669"
          unit="%"
        />
      </div>

      {/* Full table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Passage</th>
              <th className="px-4 py-3 font-semibold">Net WPM</th>
              <th className="px-4 py-3 font-semibold">Gross</th>
              <th className="px-4 py-3 font-semibold">Accuracy</th>
              <th className="px-4 py-3 font-semibold">Correct</th>
              <th className="px-4 py-3 font-semibold">Wrong</th>
              <th className="px-4 py-3 font-semibold">Left</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-slate-700">{r.passageTitle || "—"}</td>
                <td className="px-4 py-3 font-semibold text-indigo-600">{r.netWpm}</td>
                <td className="px-4 py-3 text-slate-500">{r.grossWpm}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{r.accuracy}%</td>
                <td className="px-4 py-3 text-slate-600">{r.correct}</td>
                <td className="px-4 py-3 text-red-500">{r.wrong}</td>
                <td className="px-4 py-3 text-slate-400">{r.left}</td>
                <td className="px-4 py-3 text-slate-500">{formatTime(r.timeUsedSec)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReview(r)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === r.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {review && <ReviewModal row={review} onClose={() => setReview(null)} />}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-[100dvh] flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <HistoryContent />
        </main>
      </div>
    </RequireAuth>
  );
}
