# Prototype 5: Radical Tool

A web app that pushes designers toward more radical but reasonable ideas.
The AI never proposes solutions — it only challenges the designer's own
concept. Based on the spec in `radical_tool.txt` at the repo root.

## Running locally

```
npm install
npm run dev
```

Open the printed URL and go to "Prototype 5" from the home page (or
`/prototype5/` directly). Click Agent and paste a Gemini API key.

## Core loop

1. Submit an initial concept (text + optional sketch) — this locks in v1
   and starts Round 1.
2. Prior art (real products/patents/papers, found via grounded search)
   appears on the right — "Already done — go beyond these" — hidden until
   v1 is submitted, to avoid fixation.
3. A challenge appears in the center, scaled to the current intensity
   dial (1-5). It only challenges an assumption; it never proposes a
   solution.
4. Rate the challenge (👍/👎 + optional reason) — required before you can
   continue.
5. Either "Respond & revise" (edit the concept, save it as a new version)
   or "Skip". The dial then auto-increments for the next round (you can
   still drag it down yourself at any point); a fresh challenge loads.
6. Prior art refreshes after every revision (not after a skip, since the
   concept didn't change).
7. End the session any time — the latest version is marked submitted.

## Researcher mode

Visit `/prototype5/?admin` (not linked from the app) to set participant
ID, condition, and dial behavior (escalating / fixed / locked), and to
export the full event log as JSON or CSV, or clear it. This is a stub
"hidden route" — there's no router in this app, so it's a query-param
check in `App.tsx`, not a real server-side route.

## Logged events

Every session/round event (session start/end, concept submitted, prior
art shown, challenge shown, rating, skip, revision + its distance score)
is timestamped and appended to `localStorage` (`radical_tool_events`), so
researcher mode can export it even across reloads. Clear it between
participants from researcher mode.

## Backend hooks

`src/prototype5/api.ts` implements the three hooks from the spec directly
against Gemini (no separate mock layer — this repo's other prototypes
call Gemini live too):

- `getPriorArt(apiKey, concept, image)` — grounded search (Google Search
  tool) for similar real products/patents/papers, each with a similarity
  score (used to position it in the optional graph view) and a real
  source link, or an empty link rather than a fabricated one.
- `getChallenge(apiKey, concept, priorArt, dialLevel)` — one
  assumption-challenging prompt/question plus 1-3 "why this is
  reasonable" evidence items, scaled to the dial level. The system prompt
  explicitly forbids proposing a solution.
- `getDistance(apiKey, conceptV1, conceptVn)` — a 0-100 drift score
  judged on substance (mechanism, form, challenged assumptions), not
  wording.

## Out of scope (v1, per spec)

AI-generated solutions, an open chat box, multi-user collaboration.
