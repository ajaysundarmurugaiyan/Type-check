# TypeTest — Typing Practice

An exam-style typing practice web app (SSC / CPCT style):

- Passages of **1200–1500 characters**, shuffled so none repeats until all are seen.
- **15-minute** countdown timer.
- **Backspace disabled.** To correct a mistake you must **select the text with your mouse and press Delete** — that is the only way to delete.
- Arrow keys, Home/End, Page Up/Down, Tab and all Ctrl/Cmd shortcuts (copy/paste/cut) are blocked. Mouse-only cursor movement.
- **No live feedback** — nothing is scored while you type. Results are calculated **only when the test ends** (time runs out or you click Submit).
- Results: characters typed, correct, wrong, left, **accuracy**, **Net WPM** (headline) and Gross WPM.
- **Font size +/-** controls for readability.
- Layout **locked to the screen** on desktop (panels scroll internally, the page never scrolls). Responsive stacking on smaller screens.
- **Per-user history** with a progress table and Net-WPM / accuracy charts, powered by Firebase Auth (Google + Email/Password) and Cloud Firestore.

## Tech

Next.js (App Router) · Tailwind CSS v4 · Firebase (Auth + Firestore).

## One-time Firebase setup (required before login/history work)

The web credentials are already in `.env.local`. In the [Firebase Console](https://console.firebase.google.com/) for project **learnnew-4e4d6**:

1. **Authentication → Sign-in method** → enable **Google** and **Email/Password**.
2. **Firestore Database → Create database** (Production mode is fine).
3. **Firestore → Rules** → paste the contents of [`firestore.rules`](./firestore.rules) and **Publish**. These rules let each user read/write only their own results.
4. (For deployment) **Authentication → Settings → Authorized domains** → add your Vercel domain (e.g. `your-app.vercel.app`). `localhost` is already authorized.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be sent to `/login` first.

## Deploy to Vercel

Push to GitHub and import into Vercel. **Add the same `NEXT_PUBLIC_FIREBASE_*` variables** from `.env.local` into the Vercel project's Environment Variables, then deploy. Remember step 4 above to authorize the Vercel domain for Google sign-in.

## Where things live

| Path | What |
|---|---|
| `lib/passages.js` | The 8 practice passages |
| `lib/typing.js` | Shuffle-bag, scoring math, timer format |
| `lib/firebase.js` / `lib/results.js` | Firebase init + save/fetch history |
| `components/TypingTest.jsx` | The typing engine + all key rules |
| `components/Results.jsx` | End-of-test results screen |
| `components/LineChart.jsx` | Dependency-free SVG progress chart |
| `app/page.js` | Practice page | 
| `app/history/page.js` | Progress history |
| `app/login/page.js` | Sign in / register |
| `firestore.rules` | Security rules to paste into Firebase |
