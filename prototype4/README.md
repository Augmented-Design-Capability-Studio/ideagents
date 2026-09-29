# Prototype 4: What Engineers Will Ask You

**Stage:** preparing a chosen concept for engineering review.

A pre-review rehearsal tool: given a concept (and optional reference
image), proposes which review lenses apply, generates likely engineer
questions per lens with real web search, and helps the designer triage and
draft responses before the real conversation.

## Flow

1. Enter a brief, a concept description, and optionally a reference image.
   The LLM proposes which review lenses apply (structural, safety,
   regulatory, materials, manufacturing, operations, cost, accessibility
   standards, or anything else this concept specifically calls for) — add
   or remove freely.
2. For each lens, "Generate questions" uses Gemini's web-search grounding
   to produce a prioritized list of likely engineer questions. Each shows
   why it's asked, which part of the design intent it risks, a rough
   confidence level, what to prepare, and any conflict with a constraint
   stated in the brief. Sources found while researching are listed under
   the lens (see Notes below on precision).
3. Mark each question **can answer** / **needs exploration** / **out of
   scope**, and optionally draft a response.
4. Export the triaged questions with your responses and open-item count as
   JSON, ready to bring to the engineer.

## Running locally

```
npm install
npm run dev
```

Open the printed URL and click into "Prototype 4", or go directly to
`/prototype4/`. Click Agent and paste a Gemini API key (stored only in this
browser's local storage, shared with the other prototypes).

## Notes

- **Sources are per-lens, not per-question.** Gemini's search grounding
  returns which web sources it consulted for the whole answer; attributing
  one specific source to one specific question would need parsing
  fine-grained grounding-support spans, which this skips for a first pass.
  Treat the source list as "these pages were consulted for this lens,"
  not a citation on any single question.
- Search grounding + structured JSON output is a combination I couldn't
  verify against a live API in the session that built this (no test key
  available). The prompt asks for JSON directly and parsing tolerates a
  stray ` ```json ` fence, so it should hold up — but if a lens's
  generation reliably fails to parse, that combination not composing
  cleanly is the first thing to check (`src/shared/gemini.ts`,
  `callGeminiGrounded`).
- Per the original brief: this never simulates or speaks for users with
  disabilities on accessibility-related lenses — it points to published
  guidelines and flags where real user testing is needed instead.
