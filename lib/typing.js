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
 * Align the typed text against the target using edit-distance (Levenshtein).
 * This lets the comparison RE-SYNC after a slip instead of marking everything
 * afterwards as wrong. Returns an ordered list of operations:
 *   { type: "match" } correct letter
 *   { type: "sub"   } a letter typed wrongly in place of the expected one
 *   { type: "ins"   } an extra letter typed that isn't in the passage
 *   { type: "del"   } a passage letter the user never typed (missing / left)
 * Each op carries `t` (target char) and/or `u` (the char the user typed).
 */
export function alignTyped(target, typed) {
  const n = target.length;
  const m = typed.length;
  const W = m + 1;
  // dp[i*W + j] = edit distance between target[0..i) and typed[0..j)
  const dp = new Uint16Array((n + 1) * W);
  for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    dp[i * W] = i;
    const ti = target[i - 1];
    for (let j = 1; j <= m; j++) {
      const cost = ti === typed[j - 1] ? 0 : 1;
      const del = dp[(i - 1) * W + j] + 1; // skip a target char
      const ins = dp[i * W + (j - 1)] + 1; // extra typed char
      const diag = dp[(i - 1) * W + (j - 1)] + cost; // match / substitute
      let best = del < ins ? del : ins;
      if (diag < best) best = diag;
      dp[i * W + j] = best;
    }
  }

  // Backtrack from (n, m) to build the aligned operations.
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = target[i - 1] === typed[j - 1] ? 0 : 1;
      if (dp[i * W + j] === dp[(i - 1) * W + (j - 1)] + cost) {
        ops.push(
          cost === 0
            ? { type: "match", t: target[i - 1], u: typed[j - 1] }
            : { type: "sub", t: target[i - 1], u: typed[j - 1] }
        );
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && dp[i * W + j] === dp[(i - 1) * W + j] + 1) {
      ops.push({ type: "del", t: target[i - 1] }); // never typed -> "left"
      i--;
      continue;
    }
    ops.push({ type: "ins", u: typed[j - 1] }); // extra typed -> "wrong"
    j--;
  }
  ops.reverse();
  return ops;
}

/**
 * Compute all result statistics. Nothing here runs until the test ends.
 * Uses alignment so a single skipped/extra letter no longer cascades:
 *   correct = letters that match  |  wrong = wrongly typed + extra letters
 *   left    = passage letters never typed (mid-passage omissions + the tail)
 * @param {string} target - the passage the user was asked to type
 * @param {string} typed  - what the user actually typed
 * @param {number} timeUsedSec - seconds actually spent typing
 */
export function computeStats(target, typed, timeUsedSec) {
  const targetLen = target.length;
  const ops = alignTyped(target, typed);

  let correct = 0;
  let sub = 0;
  let ins = 0;
  let del = 0;
  for (const o of ops) {
    if (o.type === "match") correct++;
    else if (o.type === "sub") sub++;
    else if (o.type === "ins") ins++;
    else del++;
  }

  const wrong = sub + ins; // letters typed incorrectly + extra letters
  const left = del; // passage letters not entered at all
  const totalTyped = typed.length; // = correct + sub + ins (actual keystrokes)
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
    extra: ins, // extra letters typed beyond the passage flow
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
