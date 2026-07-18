"use client";

// Renders the passage with every character coloured by how the user typed it:
//   correct  -> normal text
//   wrong    -> red highlight, showing the WRONG character the user typed
//   left     -> faint grey (characters never reached / not entered at all)
//   extra    -> red underline (characters typed beyond the end of the passage)
//
// Errors are judged only on what was actually entered; anything not typed shows
// up as "left", never as wrong.
function visible(ch) {
  if (ch === " ") return "·"; // make a wrong/typed space visible
  if (ch === "\n") return "⏎";
  if (ch === "\t") return "→";
  return ch;
}

export default function MistakesView({ target = "", typed = "", fontSize = 18 }) {
  const nodes = [];

  for (let i = 0; i < target.length; i++) {
    const expected = target[i];
    if (i < typed.length) {
      const got = typed[i];
      if (got === expected) {
        nodes.push(
          <span key={i} className="text-slate-700">
            {expected}
          </span>
        );
      } else {
        nodes.push(
          <span
            key={i}
            title={`You typed "${visible(got)}", expected "${visible(expected)}"`}
            className="rounded bg-red-200 text-red-700 line-through decoration-red-400"
          >
            {visible(got)}
          </span>
        );
      }
    } else {
      // Not entered at all -> counts as "left".
      nodes.push(
        <span key={i} className="text-slate-300">
          {expected}
        </span>
      );
    }
  }

  // Anything typed past the end of the passage.
  if (typed.length > target.length) {
    const extra = typed.slice(target.length);
    nodes.push(
      <span
        key="extra"
        title="Extra characters typed beyond the passage"
        className="rounded bg-red-100 text-red-600 underline decoration-wavy"
      >
        {extra.split("").map(visible).join("")}
      </span>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-300" /> correct
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-300" /> wrong
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
