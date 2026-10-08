# Ideagents Prototypes

A collection of small research prototypes for exploring multi-agent
ideation. Running `npm run dev` serves a home page listing every prototype;
click one to open it.

## Running locally

```
npm install
npm run dev
```

## Structure

Each prototype is a self-contained Vite entry point:

- `index.html` + `src/home/` — the home page listing all prototypes.
- `prototype1/index.html` + `src/prototype1/` — [Prototype 1: Multi-Agent
  Ideation](prototype1/README.md).
- `prototype2/index.html` + `src/prototype2/` — [Prototype 2: Trade-off
  Explorer](prototype2/README.md).
- `prototype3/index.html` + `src/prototype3/` — [Prototype 3:
  Intent-to-Requirement Translation](prototype3/README.md).
- `prototype4/index.html` + `src/prototype4/` — [Prototype 4: What
  Engineers Will Ask You](prototype4/README.md).
- `prototype5/index.html` + `src/prototype5/` — [Prototype 5: Radical
  Tool](prototype5/README.md).
- `prototype6/index.html` + `src/prototype6/` — [Prototype 6: Massing Model
  & Implications](prototype6/README.md).
- `prototype7/index.html` + `src/prototype7/` — [Prototype 7: Configuration
  Comparison](prototype7/README.md).
- `prototype8-1/index.html` + `src/prototype8-1/` — [Prototype 8.1: Idea
  Development Game](prototype8-1/README.md) — you judge, two agents argue.
- `prototype8-2/index.html` + `src/prototype8-2/` — [Prototype 8.2: Argue For
  Your Idea](prototype8-2/README.md) — you argue, a room of experts pushes
  back.

Prototype 8 is a *family*: the home page shows it as a collapsible group of
variants on one premise, so further variants slot in beside these rather than
becoming prototypes 9 and 10.

Prototypes are registered in `src/prototypes.ts` (title, description, path)
so they show up on the home page. An entry with `children` and no `path` of
its own renders as a collapsible group instead of a link — that's how a
prototype grows variants without consuming the next whole number.

## Shared module

`src/shared/` holds everything every prototype needs for talking to
Gemini and isn't specific to any one prototype's flow: the API client
(`gemini.ts`, including grounded search and image generation), API-key/model
storage (`storage.ts`, `config.ts`), the connection-status type and
`useGeminiConnection` hook, the `AgentButton` + `AgentDialog` components (the
header "Agent" button and its key/model dialog), the restricted formula
evaluator (`formula.ts`, used by prototypes 3 and 6), and the base
layout/dialog/button CSS (`styles.css`, imported before each prototype's own
stylesheet). Add to it when a second prototype would otherwise duplicate
something prototype-agnostic — it started as just prototype 1's Agent button,
factored out once prototypes 2-4 needed the same thing.

## Massing module

`src/massing/` is the 3D massing engine shared by prototypes 6 and 7: the
parametric scene DSL (`types.ts`), the geometry builder (`geometry.ts`), the
implications engine (`implications.ts`), the material library
(`materials.ts`), the scene/render prompts, the scene-generation API
(`api.ts`), and the three.js viewport (`SceneView.tsx`). It's separate from
`src/shared/` because it isn't prototype-agnostic plumbing — it's one specific
capability that two prototypes happen to share. `three` is its only
dependency, and only those two entry points pay for it.

## Adding a new prototype

1. Create `src/prototypeN/` for its source and `prototypeN/index.html` for
   its entry HTML (copy `prototype1/index.html` as a starting point, pointing
   `<script src>` at `/src/prototypeN/main.tsx`).
2. Add an entry to `src/prototypes.ts`.
3. Add its HTML file to the `build.rollupOptions.input` map in
   `vite.config.ts` so `npm run build` picks it up.
