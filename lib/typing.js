import { PASSAGES } from "./passages";

export const TEST_DURATION_SEC = 15 * 60; // 15 minutes
const BAG_KEY = "tp_passage_bag";
const LAST_KEY = "tp_passage_last";

// Fisher-Yates shuffle (returns a new array).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle-bag: every passage is shown once before any repeats. When the bag
// empties it is reshuffled, and we make sure the first item of the new bag is
// not the same passage that was just shown, so it never feels repetitive.
export function getNextPassage() {
  if (typeof window === "undefined") return PASSAGES[0];

  let bag;
  try {
    bag = JSON.parse(localStorage.getItem(BAG_KEY) || "[]");
  } catch {
    bag = [];
  }
  const last = localStorage.getItem(LAST_KEY);

  if (!Array.isArray(bag) || bag.length === 0) {
    bag = shuffle(PASSAGES.map((p) => p.id));
    // Avoid an immediate repeat across bag boundaries.
    if (bag.length > 1 && bag[0] === last) {
      [bag[0], bag[1]] = [bag[1], bag[0]];
    }
  }

  const nextId = bag.shift();
  localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  localStorage.setItem(LAST_KEY, nextId);

  return PASSAGES.find((p) => p.id === nextId) || PASSAGES[0];
}

// Pick a passage without touching the bag (used for the very first server render
// / before the client has hydrated). Deterministic so SSR and client agree.
export function getInitialPassage() {
  return PASSAGES[0];
}

/**
 * Compute all result statistics. Nothing here runs until the test ends.
 * @param {string} target - the passage the user was asked to type
 * @param {string} typed  - what the user actually typed
 * @param {number} timeUsedSec - seconds actually spent typing
 */
export function computeStats(target, typed, timeUsedSec) {
  const targetLen = target.length;
  const typedLen = typed.length;

  let correct = 0;
  let wrong = 0;

  const overlap = Math.min(targetLen, typedLen);
  for (let i = 0; i < overlap; i++) {
    if (typed[i] === target[i]) correct++;
    else wrong++;
  }

  // Anything typed beyond the length of the passage counts as extra errors.
  const extra = Math.max(0, typedLen - targetLen);
  wrong += extra;

  // Characters of the passage the user never reached.
  const left = Math.max(0, targetLen - typedLen);

  const totalTyped = typedLen;
  const accuracy = totalTyped > 0 ? (correct / totalTyped) * 100 : 0;

  const minutes = timeUsedSec > 0 ? timeUsedSec / 60 : 1 / 60;
  // Standard: 1 word = 5 characters.
  const grossWpm = totalTyped / 5 / minutes;
  const netWpm = Math.max(0, correct / 5 / minutes); // correct chars only

  return {
    targetLen,
    totalTyped,
    correct,
    wrong,
    extra,
    left,
    accuracy: round1(accuracy),
    grossWpm: Math.round(grossWpm),
    netWpm: Math.round(netWpm),
    timeUsedSec: Math.round(timeUsedSec),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function formatTime(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Firestore Timestamp | Date | ms -> "18 Jul 2026, 09:14"
export function formatDateTime(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || isNaN(d.getTime())) return "—";
    return (
      d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "—";
  }
}
