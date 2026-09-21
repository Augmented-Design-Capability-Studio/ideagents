# Multi-Agent Ideation Prototype

A minimal web prototype for exploring how different multi-agent discussion
mechanisms shape ideation outcomes. Enter a seed idea, then run any of four
mechanisms side by side and compare the results:

- Consensus: agents agree with and refine an emerging idea.
- Amplification: agents find an unusual aspect and push it further.
- Constructive Disagreement: agents challenge assumptions and develop alternatives.
- Independent Exploration: isolated agents explore separately, then a curator synthesizes.

This is a research prototype for internal exploration, not a production app.

## Running locally

```
npm install
npm run dev
```

Open the printed URL and click into "Prototype 1" from the home page (or go
directly to `/prototype1/`). Click Agent, and paste a Gemini API key. The key is stored
in the browser's local storage only and is sent only to the Gemini API. The Agent
dialog also selects the model and shows the connection status; the Settings
dialog holds experiment parameters (rounds per run).

## Editing the experiment

- Prompts for all four mechanisms are plain-text files in `src/prototype1/prompts/`.
  All mechanisms share `system.txt`; only the mechanism instruction differs.
  Edit these files directly to change agent behavior.
- The model is selected in the Agent dialog (default: gemini-3.5-flash-lite) and
  rounds in the Settings dialog. The list of offered models, temperature, agent
  counts, and defaults are in `src/prototype1/config.ts`.
- Orchestration logic (turn order, transcript assembly) is in `src/prototype1/mechanisms.ts`.

## Notes

- All mechanisms use 4 agents and run for the same number of rounds (set in
  Settings, default 2). In conversational mechanisms, agents take turns on a
  shared transcript each round. In Independent Exploration, each explorer deepens
  its own idea each round without seeing the others, and the curator sees only
  final-round proposals. Every condition therefore costs 4 x rounds + 1 API calls. Running all four panels at once makes many requests quickly;
  free-tier API keys may hit rate limits, which appear as errors in the panel.
- Results are kept on screen until that panel is run again. Nothing is persisted.
