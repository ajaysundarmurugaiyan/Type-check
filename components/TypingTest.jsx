"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Results from "@/components/Results";
import { saveResult } from "@/lib/results";
import {
  getNextPassage,
  computeStats,
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
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("idle"); // idle | running | finished
  const [remaining, setRemaining] = useState(TEST_DURATION_SEC);
  const [fontSize, setFontSize] = useState(FONT_DEFAULT);
  const [result, setResult] = useState(null);
  const [saveState, setSaveState] = useState("idle");

  const textareaRef = useRef(null);
  const typedRef = useRef("");
  const startAtRef = useRef(null);
  const finishedRef = useRef(false); // ensures the result is saved exactly once

  // Keep a ref in sync so the timer's finish handler reads the latest text.
  useEffect(() => {
    typedRef.current = typed;
  }, [typed]);

  // Pick the first passage + restore saved font size on the client only.
  // This MUST run in an effect (not a render-time / lazy initializer): the
  // passage is chosen with randomness + localStorage, so doing it during SSR
  // would cause a hydration mismatch. Server and first client render both show
  // the "Loading passage…" state, then this fills it in.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassage(getNextPassage());
    const saved = Number(localStorage.getItem(FONT_KEY));
    if (saved >= FONT_MIN && saved <= FONT_MAX) setFontSize(saved);
  }, []);

  // Finish once. All side effects live here (NOT inside a setState updater, which
  // React Strict Mode double-invokes — that was causing duplicate history saves).
  const finishTest = useCallback(() => {
    if (finishedRef.current) return; // guard against double finish (timer + click)
    finishedRef.current = true;

    const used = startAtRef.current
      ? Math.min(TEST_DURATION_SEC, (Date.now() - startAtRef.current) / 1000)
      : TEST_DURATION_SEC;
    const typedText = typedRef.current;
    const stats = computeStats(passage.text, typedText, used);

    setResult(stats);
    setStatus("finished");

    if (user) {
      setSaveState("saving");
      saveResult(user.uid, {
        passageId: passage.id,
        passageTitle: passage.title,
        passageText: passage.text, // stored so mistakes can be reviewed later
        typed: typedText, // what the user actually typed
        netWpm: stats.netWpm,
        grossWpm: stats.grossWpm,
        accuracy: stats.accuracy,
        correct: stats.correct,
        wrong: stats.wrong,
        left: stats.left,
        totalTyped: stats.totalTyped,
        timeUsedSec: stats.timeUsedSec,
      })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }
  }, [passage, user]);

  // Countdown timer. Driven by `remaining` so no side effect lives inside a
  // state updater. When it reaches 0 we finish (guarded, so it runs once).
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
    setTyped("");
    typedRef.current = "";
    finishedRef.current = false;
    setResult(null);
    setSaveState("idle");
    setRemaining(TEST_DURATION_SEC);
    startAtRef.current = Date.now();
    setStatus("running");
    // Focus after the textarea becomes enabled.
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function loadNewPassage() {
    setPassage(getNextPassage());
    setStatus("idle");
    setTyped("");
    typedRef.current = "";
    finishedRef.current = false;
    setResult(null);
    setSaveState("idle");
    setRemaining(TEST_DURATION_SEC);
  }

  function changeFont(delta) {
    setFontSize((f) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, f + delta));
      localStorage.setItem(FONT_KEY, String(next));
      return next;
    });
  }

  // The heart of the exam rules.
  function handleKeyDown(e) {
    if (status !== "running") {
      e.preventDefault();
      return;
    }
    const el = e.currentTarget;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    const k = e.key;

    // Block every Ctrl/Cmd shortcut (copy, paste, cut, select-all, undo, redo).
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      return;
    }

    // Backspace is fully disabled.
    if (k === "Backspace") {
      e.preventDefault();
      return;
    }

    // Delete works ONLY on text selected with the mouse.
    if (k === "Delete") {
      if (!hasSelection) e.preventDefault();
      return;
    }

    // No keyboard cursor movement — mouse only.
    if (BLOCKED_NAV_KEYS.includes(k)) {
      e.preventDefault();
      return;
    }

    // Allow modifier-only presses (e.g. Shift) to pass without inserting.
    if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") return;

    // If text is selected, the only allowed action is Delete (handled above).
    // Typing over a selection would delete it, so block that too — deletion
    // must happen only through the Delete key.
    if (hasSelection) {
      e.preventDefault();
    }
  }

  function block(e) {
    e.preventDefault();
  }

  if (!passage) {
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
        target={passage.text}
        typed={typed}
        saveState={saveState}
        onRetry={loadNewPassage}
      />
    );
  }

  const running = status === "running";
  const progress = Math.round((typed.length / passage.text.length) * 100);
  const lowTime = remaining <= 60;

  return (
    <div className="flex h-full flex-col p-3">
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
          <span className="text-sm text-slate-500">{passage.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Font size controls */}
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

          {!running && (
            <button
              onClick={startTest}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700"
            >
              Start test
            </button>
          )}
          {running && (
            <button
              onClick={finishTest}
              className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {/* Two panels: passage (read) + typing box */}
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
        {/* Passage to read */}
        <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Passage
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 leading-relaxed text-slate-700"
            style={{ fontSize: `${fontSize}px` }}
          >
            {passage.text}
          </div>
        </div>

        {/* Typing box */}
        <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your typing
            </span>
            {running && (
              <span className="text-xs text-slate-400">{progress}%</span>
            )}
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
                ? "Start typing here…"
                : "Press “Start test” to begin. Backspace is disabled — to edit, select text with your mouse and press Delete."
            }
            className="min-h-0 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
            style={{ fontSize: `${fontSize}px` }}
          />
        </div>
      </div>

      {/* Rules hint */}
      <p className="mt-2 shrink-0 text-center text-xs text-slate-400">
        Backspace &amp; arrow keys are disabled. To correct a mistake, select the
        text with your mouse and press <kbd className="rounded border border-slate-300 px-1">Delete</kbd>.
        Results are shown only when the test ends.
      </p>
    </div>
  );
}
