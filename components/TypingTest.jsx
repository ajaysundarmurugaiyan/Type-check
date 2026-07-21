"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Results from "@/components/Results";
import { saveResult } from "@/lib/results";
import {
  getNextPassage,
  splitIntoChunks,
  aggregateStats,
  formatTime,
  TEST_DURATION_SEC,
} from "@/lib/typing";

const FONT_KEY = "tp_font_size";
const FONT_MIN = 14;
const FONT_MAX = 40;
const FONT_DEFAULT = 20;

const BLOCKED_NAV_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Tab",
];

export default function TypingTest() {
  const { user } = useAuth();

  const [passage, setPassage] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("idle"); // idle | running | finished
  const [remaining, setRemaining] = useState(TEST_DURATION_SEC);
  const [fontSize, setFontSize] = useState(FONT_DEFAULT);
  const [result, setResult] = useState(null);
  const [finalTypedChunks, setFinalTypedChunks] = useState([]);
  const [saveState, setSaveState] = useState("idle");

  const textareaRef = useRef(null);
  const typedChunksRef = useRef([]); // per-chunk inputs (source of truth)
  const startAtRef = useRef(null);
  const finishedRef = useRef(false);

  // Keep the current chunk's input mirrored into the per-chunk array.
  useEffect(() => {
    if (chunks.length) typedChunksRef.current[chunkIndex] = typed;
  }, [typed, chunkIndex, chunks.length]);

  // Pick the first passage + split it + restore font size (client only).
  useEffect(() => {
    const p = getNextPassage();
    const c = splitIntoChunks(p.text);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassage(p);
    setChunks(c);
    typedChunksRef.current = new Array(c.length).fill("");
    const saved = Number(localStorage.getItem(FONT_KEY));
    if (saved >= FONT_MIN && saved <= FONT_MAX) setFontSize(saved);
  }, []);

  const finishTest = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const used = startAtRef.current
      ? Math.min(TEST_DURATION_SEC, (Date.now() - startAtRef.current) / 1000)
      : TEST_DURATION_SEC;

    const typedChunks = typedChunksRef.current;
    const stats = aggregateStats(chunks, typedChunks, used);

    setResult(stats);
    setFinalTypedChunks([...typedChunks]);
    setStatus("finished");

    if (user) {
      setSaveState("saving");
      saveResult(user.uid, {
        passageId: passage.id,
        passageTitle: passage.title,
        passageText: passage.text,
        chunks, // per-paragraph target text
        typedChunks: [...typedChunks], // per-paragraph input
        netWpm: stats.netWpm,
        grossWpm: stats.grossWpm,
        accuracy: stats.accuracy,
        correct: stats.correct,
        wrong: stats.wrong,
        left: stats.left,
        totalTyped: stats.totalTyped,
        timeUsedSec: stats.timeUsedSec,
        paragraphs: chunks.length,
      })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }
  }, [passage, chunks, user]);

  // Countdown timer (driven by `remaining`, so no side effect in a state updater).
  useEffect(() => {
    if (status !== "running") return;
    if (remaining <= 0) {
      finishTest();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [status, remaining, finishTest]);

  function startTest() {
    typedChunksRef.current = new Array(chunks.length).fill("");
    finishedRef.current = false;
    setChunkIndex(0);
    setTyped("");
    setResult(null);
    setSaveState("idle");
    setRemaining(TEST_DURATION_SEC);
    startAtRef.current = Date.now();
    setStatus("running");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function loadNewPassage() {
    const p = getNextPassage();
    const c = splitIntoChunks(p.text);
    setPassage(p);
    setChunks(c);
    typedChunksRef.current = new Array(c.length).fill("");
    finishedRef.current = false;
    setChunkIndex(0);
    setStatus("idle");
    setTyped("");
    setResult(null);
    setSaveState("idle");
    setRemaining(TEST_DURATION_SEC);
  }

  function goNext() {
    typedChunksRef.current[chunkIndex] = typed;
    if (chunkIndex >= chunks.length - 1) {
      finishTest();
      return;
    }
    setChunkIndex((i) => i + 1);
    setTyped("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function changeFont(delta) {
    setFontSize((f) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, f + delta));
      localStorage.setItem(FONT_KEY, String(next));
      return next;
    });
  }

  // Exam key rules (unchanged): backspace off, delete only on a mouse selection,
  // no keyboard cursor movement, no clipboard, no typing over a selection.
  function handleKeyDown(e) {
    if (status !== "running") {
      e.preventDefault();
      return;
    }
    const el = e.currentTarget;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    const k = e.key;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      return;
    }
    if (k === "Backspace") {
      e.preventDefault();
      return;
    }
    if (k === "Delete") {
      if (!hasSelection) e.preventDefault();
      return;
    }
    if (BLOCKED_NAV_KEYS.includes(k)) {
      e.preventDefault();
      return;
    }
    if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") return;
    if (hasSelection) e.preventDefault();
  }

  function block(e) {
    e.preventDefault();
  }

  if (!passage || chunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading passage…
      </div>
    );
  }

  if (status === "finished" && result) {
    return (
      <Results
        result={result}
        passageTitle={passage.title}
        chunks={chunks}
        typedChunks={finalTypedChunks}
        saveState={saveState}
        onRetry={loadNewPassage}
      />
    );
  }

  const running = status === "running";
  const current = chunks[chunkIndex];
  const isLast = chunkIndex === chunks.length - 1;
  const progress = current
    ? Math.round((typed.length / current.length) * 100)
    : 0;
  const lowTime = remaining <= 60;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-3">
      {/* Control row */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg px-4 py-1.5 font-mono text-2xl font-bold tabular-nums ${
              lowTime && running
                ? "bg-red-100 text-red-600"
                : "bg-slate-200 text-slate-800"
            }`}
          >
            {formatTime(remaining)}
          </div>
          <span className="text-sm font-medium text-slate-600">
            Paragraph {chunkIndex + 1} of {chunks.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1">
            <button
              onClick={() => changeFont(-2)}
              className="h-8 w-8 rounded text-lg font-bold text-slate-600 hover:bg-slate-100"
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              A−
            </button>
            <span className="w-10 text-center text-xs text-slate-400">
              {fontSize}px
            </span>
            <button
              onClick={() => changeFont(2)}
              className="h-8 w-8 rounded text-lg font-bold text-slate-600 hover:bg-slate-100"
              title="Increase font size"
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mb-3 flex shrink-0 gap-1.5">
        {chunks.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < chunkIndex
                ? "bg-emerald-400"
                : i === chunkIndex
                ? "bg-indigo-500"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* TOP: paragraph to read */}
      <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Read this
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 leading-relaxed text-slate-700"
          style={{ fontSize: `${fontSize}px` }}
        >
          {current}
        </div>
      </div>

      {/* Action button — fixed directly below the passage */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
        <span className="hidden text-xs text-slate-400 sm:block">
          {running
            ? isLast
              ? "Last paragraph — click Finish when you're done."
              : "Done with this one? Move to the next paragraph."
            : "Read the paragraph above, then press Start."}
        </span>
        {!running ? (
          <button
            onClick={startTest}
            className="w-full rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Start test
          </button>
        ) : (
          <button
            onClick={goNext}
            className={`w-full rounded-lg px-6 py-2.5 font-semibold text-white transition sm:w-auto ${
              isLast
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLast ? "Finish & see result" : "Next paragraph →"}
          </button>
        )}
      </div>

      {/* BOTTOM: type here */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Type here
          </span>
          {running && <span className="text-xs text-slate-400">{progress}%</span>}
        </div>
        <textarea
          ref={textareaRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={block}
          onCut={block}
          onCopy={block}
          onDrop={block}
          onContextMenu={block}
          disabled={!running}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          data-gramm="false"
          placeholder={
            running
              ? "Type the paragraph above…"
              : "Press “Start test” to begin. Backspace is disabled — to edit, select text with your mouse and press Delete."
          }
          className="min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>

      <p className="mt-2 shrink-0 text-center text-xs text-slate-400">
        Backspace &amp; arrow keys are disabled. Select text with your mouse and
        press <kbd className="rounded border border-slate-300 px-1">Delete</kbd> to
        correct. Results appear only at the end.
      </p>
    </div>
  );
}
