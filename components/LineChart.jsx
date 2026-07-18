"use client";

// Lightweight dependency-free SVG line chart. `points` is oldest -> newest.
export default function LineChart({ title, points, color = "#4f46e5", unit = "" }) {
  const W = 340;
  const H = 150;
  const padX = 28;
  const padY = 18;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  if (!points || points.length === 0) {
    return null;
  }

  const maxRaw = Math.max(...points, 1);
  // Round the top of the axis up to something tidy.
  const max = Math.ceil(maxRaw / 10) * 10 || 10;

  const xFor = (i) =>
    points.length === 1 ? padX + plotW / 2 : padX + (i / (points.length - 1)) * plotW;
  const yFor = (v) => padY + plotH - (v / max) * plotH;

  const line = points.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");

  // A few horizontal gridlines.
  const gridVals = [0, max / 2, max];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 text-sm font-semibold text-slate-700">{title}</div>
      <div className="text-xs text-slate-400">
        Latest: {points[points.length - 1]}
        {unit} · Best: {Math.max(...points)}
        {unit}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={title}
      >
        {gridVals.map((g, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={4} y={yFor(g) + 3} fontSize="9" fill="#94a3b8">
              {Math.round(g)}
            </text>
          </g>
        ))}

        {points.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((v, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(v)} r="3" fill={color} />
        ))}
      </svg>
    </div>
  );
}
