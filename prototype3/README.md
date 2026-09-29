# Prototype 3: Intent-to-Requirement Translation

**Stage:** developing one chosen concept.

Translates 1-3 qualitative goals (e.g. "feels open") into measurable
requirements with a visible chain of reasoning, then into rough
micro-simulations the designer can play with.

## Flow

1. Enter a brief, the chosen concept, and 1-3 qualitative goals.
2. For each goal, generate 2-4 candidate chains: **mechanism** (why the
   concept could produce that feeling) → **requirement** (a measurable spec
   item that follows from it) → **rationale**. Every field is editable;
   accept or reject each chain independently.
3. For an accepted requirement, "Build micro-simulation" asks the LLM for a
   structured spec — variables (with units/ranges), simple formulas, and
   outputs — rendered generically as sliders with live-updating outputs. If
   no meaningful quantitative model exists for that requirement, it says so
   instead of forcing one.
4. Every assumption behind a model is listed and directly editable.
5. Export accepted requirements (with their goal, mechanism, rationale, and
   any model) as JSON, for handing to engineers.

## Running locally

```
npm install
npm run dev
```

Open the printed URL and click into "Prototype 3", or go directly to
`/prototype3/`. Click Agent and paste a Gemini API key (stored only in this
browser's local storage, shared with the other prototypes).

## Notes

- The LLM never generates executable code for a model — only a plain
  arithmetic formula string (e.g. `sqrt(width * height) / 2`). It's
  evaluated by a small restricted parser in `src/prototype3/formula.ts`
  (numbers, named variables, `+-*/^`, parentheses, and a fixed whitelist of
  math functions) rather than `eval`/`new Function`, so nothing the model
  returns can execute arbitrary JavaScript.
- Formulas are validated (parsed + evaluated against the variables'
  defaults) as soon as a model comes back, so a broken formula surfaces
  immediately with a clear error rather than silently as `NaN` on a slider.
