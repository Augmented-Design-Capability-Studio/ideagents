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

Prototypes are registered in `src/prototypes.ts` (title, description, path)
so they show up on the home page.

## Adding a new prototype

1. Create `src/prototypeN/` for its source and `prototypeN/index.html` for
   its entry HTML (copy `prototype1/index.html` as a starting point, pointing
   `<script src>` at `/src/prototypeN/main.tsx`).
2. Add an entry to `src/prototypes.ts`.
3. Add its HTML file to the `build.rollupOptions.input` map in
   `vite.config.ts` so `npm run build` picks it up.
