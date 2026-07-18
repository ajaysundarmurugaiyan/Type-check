"use client";

import Link from "next/link";

export function LoadingState({ label = "Loading…" }) {
  return <div className="p-10 text-center text-slate-400">{label}</div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-600">Couldn&apos;t load your data</p>
        <p className="mt-2 text-sm text-red-500">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "No tests yet",
  message = "Take your first typing test to start tracking your progress.",
}) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
      >
        Start a test
      </Link>
    </div>
  );
}
