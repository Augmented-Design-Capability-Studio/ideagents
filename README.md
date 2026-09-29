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

Prototypes are registered in `src/prototypes.ts` (title, description, path)
so they show up on the home page.

## Shared module

`src/shared/` holds everything every prototype needs for talking to
Gemini and isn't specific to any one prototype's flow: the API client
(`gemini.ts`), API-key/model storage (`storage.ts`, `config.ts`), the
connection-status type and `useGeminiConnection` hook, the `AgentButton` +
`AgentDialog` components (the header "Agent" button and its key/model
dialog), and the base layout/dialog/button CSS (`styles.css`, imported
before each prototype's own stylesheet). Add to it when a second prototype
would otherwise duplicate something prototype-agnostic — it started as
just prototype 1's Agent button, factored out once prototypes 2-4 needed
the same thing.

## Adding a new prototype

1. Create `src/prototypeN/` for its source and `prototypeN/index.html` for
   its entry HTML (copy `prototype1/index.html` as a starting point, pointing
   `<script src>` at `/src/prototypeN/main.tsx`).
2. Add an entry to `src/prototypes.ts`.
3. Add its HTML file to the `build.rollupOptions.input` map in
   `vite.config.ts` so `npm run build` picks it up.
