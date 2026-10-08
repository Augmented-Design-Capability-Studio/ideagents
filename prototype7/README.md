# Prototype 7: Configuration Comparison

An iteration on prototype 6. Instead of one massing model, a concept becomes
several contrasting **configurations** in a responsive, masonry-packed grid
that scrolls vertically (with edge fades and a "N more below" button so the
overflow is visible). Cards start collapsed to the 3D view and key figures;
each expands to its sliders, materials and notes. Below the grid, a table
compares them on the same engineering metrics.

Built around the vehicle rear cabin sample, which is the case that most wants
this: "less claustrophobic without changing the roofline" has several
strategies (more glazing, slimmer seats, a glazed roof panel) that trade
against each other, and the point is to see the trade, not to pick a winner.

## Running locally

```
npm install
npm run dev
```

Open "Prototype 7" from the home page (or `/prototype7/`), click Agent and
paste a Gemini API key. The cabin concept is pre-filled.

## What a configuration is

One Gemini call returns a single scene spec **plus six contrasting
configurations of it**. A configuration only changes parameter values and
optionally some materials — the nodes, the structure and the implications are
identical across all of them. That constraint is what makes the comparison
mean anything: same metrics, same formulas, different settings.

The prompt explicitly asks for configurations that each trade something away,
so the table shows a real tension rather than one configuration dominating.

## In each panel

- Its own 3D view, its own sliders, its own material choices.
- Its own **inside/outside** toggle and **Linked** checkbox (both per panel,
  not global).
- Rename it, duplicate it (to fork a variant from one you like), or remove it.
- Key figures and any threshold warnings for that configuration.

Up to 5 panels — each runs its own WebGL context, and the table stops being
readable well before the browser's context limit.

## Linking

Panels are linked by default. Linked panels share two things:

- **A camera.** Orbit one and the others follow, which is what makes
  side-by-side comparison actually work — otherwise you're comparing three
  different viewpoints. Whichever panel you're dragging is the driver.
- **A view mode.** Switching one linked panel to the interior view switches
  the whole linked group, since a group sharing one camera while showing a mix
  of inside and outside views would be incoherent.

Unlink a panel to inspect it on its own — it keeps its own camera and can sit
on the opposite view mode from the group. Re-link it and it re-frames and
rejoins.

For the cabin (a "space" concept) panels start *inside* at seated eye height,
so you're comparing what the passenger sees, not three boxes.

## Constraints, and configurations that break them on purpose

The spec now carries 2-4 named **constraints** — hard limits with a stated
source (a standard, a moulding rule of thumb, a package hardpoint) and a
rationale for what goes wrong past them. They're separate from an
implication's warning threshold because a configuration is allowed to break
one deliberately.

Of the six configurations the model returns, two satisfy every constraint and
serve as baselines, and **four are provocations**: each breaks at least one
constraint on purpose, pushed far enough that the violation is obvious rather
than marginal. The provocations are spread across the constraints so each one
gets broken at least once, and no two are the same move at a different
intensity. For each, the model says what breaking the constraint *buys*, and what would have to
change for it to become legal — a different process, material, standard, or
package change. That second half is the generative part; a violation with no
route out of it is just an error.

Violations are styled as *notable*, not as failures: a violet accent rather
than the error red used elsewhere in the suite. The intent is that the
infeasible configuration is the one you look at hardest.

Constraints are evaluated live from the same parameter values, so dragging a
slider past a limit flips the chip and shows how far past you are — a
configuration you break yourself behaves the same as the one the model
proposed, except it keeps its "feasible" intent label, since a designer
deliberately pushing a slider is a different act from the model proposing a
thought experiment.

## Design implications

Each configuration also carries 2-3 qualitative **design implications** —
consequences a designer cares about that no formula captures: what it does to
the experience, the perception, the assembly, the repairability, the people
around it. They're collapsed by default, and expanded automatically on the
provocation panels, where they tend to be the most interesting.

## The comparison table

Rows are mass, material cost, open area where relevant, and every implication
the model supplied. Best-in-row is highlighted **only** where the model
declared a direction (`betterWhen`) — a metric it called neutral gets no
highlight rather than an invented preference.

Below those, a constraints block shows each configuration against each limit,
with how far past it any violation sits.

## Shared with prototype 6

The massing engine now lives in `src/massing/` and both prototypes use it: the
DSL types, the geometry builder, the implications engine, the material
library, the scene prompt, and the `SceneView` renderer. Prototype 6 remains
the single-model, render-and-CMF version; prototype 7 is the comparison
version.

`SceneView` gained two things for this prototype: render-on-demand instead of
a continuous animation loop (several views run at once), and optional external
camera control for linking.

## Known limits

- Configurations share one structure. Genuinely different *geometries* would
  need separate specs, and then the metrics would stop being comparable —
  which is the tradeoff this design deliberately takes.
- Every panel rebuilds its geometry when any slider moves. Geometry runs on a
  deferred copy of the state so the handles stay smooth, but a heavily
  perforated model across 5 panels will still work the CPU.
- All the caveats from prototype 6 still apply: dimensions are the model's
  weakest output, there are no sculpted surfaces, and assemblies are shallow.
