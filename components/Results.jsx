"use client";

import Link from "next/link";
import { formatTime } from "@/lib/typing";
import MistakesView from "@/components/MistakesView";

function Stat({ label, value, sub, big, tone }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
      ? "text-red-500"
      : tone === "muted"
      ? "text-slate-400"
      : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className={`font-bold ${big ? "text-4xl" : "text-2xl"} ${toneClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Results({
  result,
  passageTitle,
  target,
  typed,
  saveState,
  onRetry,
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Your Results</h2>
          <p className="text-sm text-slate-500">Passage: {passageTitle}</p>
        </div>
        <div className="text-right text-xs">
          {saveState === "saving" && (
            <span className="text-slate-400">Saving to history…</span>
          )}
          {saveState === "saved" && (
            <span className="text-emerald-600">✓ Saved to your history</span>
          )}
          {saveState === "error" && (
            <span className="text-red-500">Could not save history</span>
          )}
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Net WPM" value={result.netWpm} big tone="good" />
        <Stat label="Accuracy" value={`${result.accuracy}%`} big tone="good" />
      </div>

      {/* Breakdown */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Gross WPM" value={result.grossWpm} sub="raw speed" />
        <Stat label="Characters typed" value={result.totalTyped} />
        <Stat label="Time used" value={formatTime(result.timeUsedSec)} />
        <Stat label="Correct" value={result.correct} tone="good" />
        <Stat label="Wrong" value={result.wrong} tone="bad" />
        <Stat label="Left" value={result.left} tone="muted" />
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Passage length: {result.targetLen} characters
        {result.extra > 0 && ` · ${result.extra} extra characters beyond the passage`}
      </p>

      {/* Where the mistakes are */}
      {typeof typed === "string" && typeof target === "string" && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Review — {result.wrong} wrong, {result.left} not typed
          </h3>
          <MistakesView target={target} typed={typed} fontSize={18} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Try another passage
        </button>
        <Link
          href="/history"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          View history
        </Link>
      </div>
    </div>
  );
}
