"use client";

import { alignTyped } from "@/lib/typing";

// Renders the passage using the SAME alignment as the scoring, so the review
// matches the numbers exactly and re-syncs after a slip:
//   match -> normal text
//   sub   -> red, showing the WRONG character the user typed
//   ins   -> red underline, an extra character typed
//   del   -> faint grey, a passage letter the user never typed ("left")
function visible(ch) {
  if (ch === " ") return "·"; // make a wrong / extra space visible
  if (ch === "\n") return "⏎";
  if (ch === "\t") return "→";
  return ch;
}

export default function MistakesView({ target = "", typed = "", fontSize = 18 }) {
  const ops = alignTyped(target, typed);

  const nodes = ops.map((o, idx) => {
    if (o.type === "match") {
      return (
        <span key={idx} className="text-slate-700">
          {o.t}
        </span>
      );
    }
    if (o.type === "sub") {
      return (
        <span
          key={idx}
          title={`You typed "${visible(o.u)}", expected "${visible(o.t)}"`}
          className="rounded bg-red-200 text-red-700 line-through decoration-red-400"
        >
          {visible(o.u)}
        </span>
      );
    }
    if (o.type === "ins") {
      return (
        <span
          key={idx}
          title="Extra letter typed (not in the passage)"
          className="rounded bg-red-100 text-red-600 underline decoration-wavy"
        >
          {visible(o.u)}
        </span>
      );
    }
    // del -> a passage letter the user never typed
    return (
      <span key={idx} title="Not typed" className="text-slate-300">
        {o.t}
      </span>
    );
  });

  return (
    <div>
      {/* Legend */}
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-300" /> correct
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-300" /> wrong / extra
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" />{" "}
          not typed (left)
        </span>
      </div>

      <div
        className="whitespace-pre-wrap break-words leading-relaxed"
        style={{ fontSize: `${fontSize}px` }}
      >
        {nodes}
      </div>
    </div>
  );
}
