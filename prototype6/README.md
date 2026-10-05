# Prototype 6: Massing Model & Implications

Turns a design concept (text, optionally a rough sketch) into a crude
parametric 3D massing model you can measure, re-dimension, re-material, and
render. The point is not CAD — it's to put a *measurable* object next to a
*seductive* render and let the gap between them be visible.

## Running locally

```
npm install
npm run dev
```

Open "Prototype 6" from the home page (or `/prototype6/`), click Agent and
paste a Gemini API key.

## The flow

1. Describe a concept or upload a sketch; pick one of the built-in samples if
   you want to see it work immediately.
2. Gemini classifies the concept as one of four kinds and emits a parametric
   scene spec plus engineering implications.
3. Sliders drive every dimension. The geometry, the mass, and the implications
   all update together.
4. CMF choices come from a curated material library, so a finish change moves
   mass, cost and process — not just colour.
5. "Render this view" snapshots the three.js viewport and sends that image to
   the image model to be re-lit in a chosen material.

## Why it classifies concepts first

The concepts these prototypes use as samples don't want the same view:

| Kind | Example | View | What's measured |
|---|---|---|---|
| part | perforated headrest window, stove knob | orbit the object | mass, volume, open area |
| space | vehicle rear cabin, museum gallery | camera *inside* at eye height | glazed area, clearances |
| material | interior door panel finish | carrier surface + variants | durability, cost/m², mass |
| mechanism | lever knob | two states with a blend slider | operating force, travel |

They share one geometry vocabulary and one renderer — the difference is mostly
camera placement, plus a `states` array for mechanisms.

## Two sources of numbers, labelled separately

- **Measured from the geometry** — bounding box, solid volume, mass, part
  count, open-area ratio. Computed in `implications.ts` from the model that is
  actually on screen. No LLM involved, so these are as right as the dimensions
  are.
- **Estimated by the model** — formulas Gemini supplies, evaluated client-side
  by the shared expression evaluator (`src/shared/formula.ts`, factored out of
  prototype 3). Assumptions are editable, because they're the part most likely
  to be wrong.

## Known limits — these are deliberate, not bugs

- **Dimensions are the weak output.** Benchmarks on parametric 3D generation
  put semantic accuracy around 0.80 but dimensional accuracy around 0.35. The
  sliders exist because of that: the model proposes, you correct.
- **No sculpted surfaces.** The vocabulary is plates, boxes, cylinders,
  spheres, lathes and extrusions. Panels, grilles, enclosures and turned forms
  work; chair shells, shoe midsoles and car exteriors do not. There is no
  class-A surfacing, and curvature continuity is out of reach.
- **Assemblies are shallow.** A handful of positioned parts, no joints, no
  interference checking.
- **The render prettifies.** The image model will add fillets and nudge
  proportions even when told not to. It's a mood image of your geometry, not a
  measurement of it — which is exactly the gap the two panes are there to show.

## Geometry vocabulary

`box`, `plate` (rounded rectangle extruded, with `grid` / `hexGrid` / `radial`
/ `single` hole patterns), `cylinder` (with optional taper), `sphere`,
`lathe`, `extrude`. Every dimension may be an arithmetic expression over the
parameter ids, which is what lets one slider drive several features at once.
Hole patterns are descriptors, never lists of holes, and are capped so a
pathological pitch can't lock the tab.

## Dependencies

This is the only prototype with a dependency beyond React: `three`. It's a
separate Vite entry point, so prototypes 1-5 don't pay for it.
