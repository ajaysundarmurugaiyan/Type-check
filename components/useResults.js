"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { fetchHistory, describeFirestoreError } from "@/lib/results";

// Shared data hook for the dashboard and history pages.
// States: loading (rows === null && !error), error (string), data (rows array).
export function useResults() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setRows(null);
    setError("");
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchHistory(user.uid)
      .then((data) => alive && setRows(data))
      .catch((e) => alive && setError(describeFirestoreError(e)));
    return () => {
      alive = false;
    };
  }, [user, nonce]);

  return { rows, error, loading: rows === null && !error, reload };
}

// Aggregate summary numbers used by the dashboard.
export function summarize(rows) {
  if (!rows || rows.length === 0) return null;
  const n = rows.length;
  const netWpms = rows.map((r) => r.netWpm ?? 0);
  const accs = rows.map((r) => r.accuracy ?? 0);
  const sum = (a) => a.reduce((s, x) => s + x, 0);

  // rows are newest-first; chrono is oldest-first for trend + charts.
  const chrono = [...rows].reverse();
  const first = chrono[0];
  const last = chrono[chrono.length - 1];

  return {
    count: n,
    bestWpm: Math.max(...netWpms),
    avgWpm: Math.round(sum(netWpms) / n),
    bestAcc: Math.round(Math.max(...accs)),
    avgAcc: Math.round(sum(accs) / n),
    lastWpm: last.netWpm ?? 0,
    lastAcc: Math.round(last.accuracy ?? 0),
    wpmDelta: (last.netWpm ?? 0) - (first.netWpm ?? 0),
    accDelta: Math.round((last.accuracy ?? 0) - (first.accuracy ?? 0)),
    lastDate: last.createdAt,
    wpmSeries: chrono.map((r) => r.netWpm ?? 0),
    accSeries: chrono.map((r) => Math.round(r.accuracy ?? 0)),
  };
}
