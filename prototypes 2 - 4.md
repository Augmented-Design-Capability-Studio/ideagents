# Claude Code Prompts: Prototypes 2–4

Paste the shared context first, then one prototype prompt at a time.

---

## Shared context (paste first)

```
I'm building crude research prototypes for an HCI project. The goal is to help early-career, experience-oriented designers bridge high-level creative ideas to engineering review, in the stage after ideation and before the first engineering meeting. Engineers are secondary stakeholders who receive the output.

This repo already contains prototype 1. The new prototypes are numbered 2, 3, and 4. They follow the design process in order: choosing among alternatives (2), developing one chosen concept (3), and preparing for engineering review (4).

Before writing code, look through this repo and follow its existing setup, stack, and conventions, including how prototype 1 is structured. Use whatever LLM/API integration already exists; if there is none, ask me before adding one.

Test inputs are these three design briefs:
1. Reduce claustrophobic feel in the rear cabin of a vehicle without changing the roofline
2. Improve museum experience for visually impaired users
3. Improve accessibility of a kitchen stove

These are crude prototypes for pilot studies, so prioritize a working end-to-end flow over polish. Always show confidence levels and sources for AI claims, and label estimates as rough.
```

---

## Prototype 2: Trade-off space across concept alternatives

**Stage:** choosing among several alternatives.

```
Build prototype 2: a trade-off explorer for choosing among concept alternatives.

Input: the design brief and 3–8 short concept descriptions, pasted in (designers may have brainstormed them with other AI tools).

Flow:
1. The system proposes 3–5 engineering axes specific to this brief (e.g., cost, complexity, durability). The designer confirms or edits them.
2. The LLM estimates each concept on each axis as a range (low/likely/high) with a one-line justification.
3. The designer adds qualitative axes and rates concepts on them, with a quick pairwise-comparison mode as an alternative to direct ratings.
4. The designer can set hard qualitative boundaries (e.g., "must feel handmade ≥ 4"). Show which concepts are excluded and what each boundary costs.
5. Show a 2D trade-off plot with switchable axes and ranges drawn as error bars or boxes. Mark concepts as "clearly dominated" vs. "overlapping, can't tell."
6. Highlight empty regions of the frontier and prompt the designer to imagine a concept there, or suggest a hybrid of two existing concepts.

Keep the tone exploratory: this is for reflection, not ranking.
```

---

## Prototype 3: Intent-to-requirement translation with micro-simulations

**Stage:** developing one chosen concept.

```
Build prototype 3: intent-to-requirement translation with micro-simulations, for developing one chosen concept.

Input: the design brief, a concept description, and 1–3 qualitative goals from the designer (e.g., "feels open," "approachable," "feels sturdy").

Flow:
1. For each goal, generate a chain: qualitative goal → human-factors mechanism (why it produces that feeling or experience) → candidate measurable requirements. Display it as an editable chain where the designer can accept, edit, or reject each item and add a rationale note.
2. For accepted requirements, have the LLM return a structured JSON model spec: variables with units and ranges, simple formulas, outputs, and explicitly stated assumptions. Don't generate executable code; render the spec generically as sliders plus live outputs.
3. Show every assumption and let the designer edit it. If no meaningful quantitative model exists, say so instead of forcing one. Models can be non-physical (e.g., throughput, coverage, maintenance cost).
4. Export the requirements with their linked intent, mechanism, and rationale for engineers.

Label all numbers as rough estimates.
```

---

## Prototype 4: "What engineers will ask you"

**Stage:** preparing a chosen concept for engineering review.

```
Build prototype 4: a pre-review rehearsal tool that prepares a designer for an engineering conversation.

Input: the design brief plus a text description of the designer's concept, with an optional reference image. No sketching interface.

Flow:
1. The system proposes which review lenses apply to this concept (e.g., structural, safety, regulatory, materials, manufacturing, operations, cost, accessibility standards). The designer can add or remove lenses.
2. For each lens, use web search across relevant standards, materials, manufacturing processes, prior art, and similar products to generate a short, prioritized list of questions an engineer would likely ask, separating showstoppers from details. Each question shows: why it's asked, which part of the design intent it risks, sources, confidence, and what the designer would need to prepare.
3. Flag any conflict with constraints stated in the brief.
4. The designer marks each question "can answer / needs exploration / out of scope" and can type a draft response.
5. Export a prepared brief for the engineer, containing the questions, the designer's responses, and open items.

Frame everything as preparation for a conversation, not a verdict. Never cite a standard without a source. For accessibility topics, point to published guidelines and flag where testing with real users is needed; don't simulate users with disabilities.
```
