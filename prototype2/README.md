# Prototype 2: Trade-off Explorer

**Stage:** choosing among several concept alternatives.

A trade-off explorer for comparing 3-8 concept alternatives against a design
brief.

## Flow

1. Enter a brief and 3-8 concepts. The LLM proposes 3-5 engineering axes
   specific to this brief (edit freely before continuing).
2. The LLM estimates every concept on every axis as a low/likely/high range,
   with a one-line justification each.
3. Add your own qualitative axes and rate concepts directly, or via
   pairwise comparison (shown one pair at a time; the final rating is
   derived from win rate).
4. Optionally set hard boundaries (e.g. "must feel handmade ≥ 4") — excluded
   concepts are listed with which boundary excluded them.
5. A 2D trade-off plot (any two axes, switchable) draws each concept's
   range as a box. Concepts are marked **clearly dominated** (another
   concept's worst case still beats this one's best case, on both axes),
   **overlapping, can't tell** (ranges overlap — genuinely ambiguous), or
   left uncolored as a frontier point.
6. If the "best on both axes" corner of the plot has no concept anywhere
   near it, a button offers to ask the LLM to imagine a concept (or hybrid)
   that would land there — it gets added to the concept list as
   AI-suggested.

## Running locally

```
npm install
npm run dev
```

Open the printed URL and click into "Prototype 2", or go directly to
`/prototype2/`. Click Agent and paste a Gemini API key (stored only in this
browser's local storage, shared with the other prototypes).

## Notes

- Estimates are a relative 1-10 score per axis (not physical units) —
  these are rough, early comparisons across the specific concepts you
  entered, not calibrated numbers.
- The domination/overlap classification is deliberately strict: it only
  calls a concept "clearly dominated" when there's no ambiguity at all on
  either plotted axis. Anything with overlapping ranges is left as
  "can't tell" rather than forcing a verdict — see `src/prototype2/analysis.ts`.
