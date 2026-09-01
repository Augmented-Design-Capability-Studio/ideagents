# Build a minimal multi-agent ideation prototype

Build a very small web-based prototype for exploring **multi-agent ideation**.

The goal is to test a concept with my research group, so prioritize **simplicity, clarity, and fast iteration** over production-quality architecture or visual polish.

## Core interaction

The app should have:

1. A text input where the user enters a **seed idea / design question**.
2. Four panels representing four different multi-agent discussion mechanisms:
   - **Consensus** — agents agree and refine an emerging idea.
   - **Amplification** — agents identify an unusual aspect and exaggerate/push it further.
   - **Constructive Disagreement** — agents challenge assumptions and develop alternatives.
   - **Independent Exploration** — multiple agents independently explore the seed, followed by a curator that synthesizes their ideas.
3. Each panel should have its own **Run** button.
4. Clicking Run on multiple panels should allow them to **run in parallel**.
5. Each panel should show a simple loading/running state while its agents are working.
6. When finished, display the resulting idea/conversation outcome inside that panel.

For now, do not build a sophisticated conversation viewer. A simple text representation of the agent progress and final result is sufficient.

## Gemini API key

Add a small **Settings** button/dialog.

The dialog should allow the user to:

- paste their Gemini API key
- save it locally in the browser
- clear/remove the saved key
- see whether a key is currently configured

Use browser local storage for this. Do not create a user account or database.

The API key should never be committed to the repository.

If possible, make the UI clearly communicate that the key is stored locally in the browser.

## Agent behavior

Create separate, easy-to-edit prompts/functions for the four mechanisms.

Use the same basic system prompt/agent role across conditions and vary primarily the **interaction mechanism**.

Conceptually:

### Consensus
Agents see previous contributions and:
- identify promising ideas
- agree and build upon them
- refine existing ideas
- resolve disagreements
- gradually converge on one coherent idea

### Amplification
Agents see previous contributions and:
- look for unusual, surprising, or unconventional aspects
- select something interesting
- push/exaggerate/extend it
- continue building on increasingly unusual directions
- prioritize novelty over immediate feasibility

### Constructive Disagreement
Agents see previous contributions and:
- identify assumptions
- challenge those assumptions
- explain alternative perspectives
- propose alternatives
- respond constructively to other agents
- eventually develop a promising direction

### Independent Exploration
Use four independent agents.

Each receives the same seed but does NOT see the other agents' responses.

After the four independent explorations finish, send their outputs to a fifth **curator** agent.

The curator should synthesize the most promising/complementary elements into one final idea, without introducing a fundamentally new concept that wasn't present in the independent proposals.

## Initial UI

Keep the visual design extremely minimal.

Think:

- white/light background
- simple typography
- subtle borders
- generous whitespace
- no unnecessary animations
- no elaborate landing page
- no marketing copy
- no gradients
- no complex navigation

Suggested structure:

    Multi-Agent Ideation

    [ Seed idea / question __________________________ ]

    ┌─────────────────┐ ┌─────────────────┐
    │ Consensus       │ │ Amplification   │
    │                 │ │                 │
    │ [Run]           │ │ [Run]           │
    │                 │ │                 │
    │ Output...       │ │ Output...       │
    └─────────────────┘ └─────────────────┘

    ┌─────────────────┐ ┌─────────────────┐
    │ Constructive    │ │ Independent     │
    │ Disagreement    │ │ Exploration     │
    │                 │ │                 │
    │ [Run]           │ │ [Run]           │
    │                 │ │                 │
    │ Output...       │ │ Output...       │
    └─────────────────┘ └─────────────────┘

    [Settings]

The exact layout can be adjusted for responsiveness.

## Technical preferences

Use a lightweight modern web stack.

Prefer:

- React
- TypeScript
- Vite

Keep dependencies to a minimum.

Structure the code so that the following can be easily modified later:

- agent prompts
- number of agents
- number of turns
- model name
- output formatting
- individual interaction mechanisms

Avoid introducing an agent framework unless it is genuinely necessary. Simple API calls and orchestration code are preferable for this prototype.

## Important implementation details

- The four Run buttons should be independent.
- Running one condition should not block the others.
- Use async/await and Promise-based concurrency appropriately.
- Clearly distinguish the four conditions in the UI.
- Preserve the generated result until the user runs that condition again.
- Handle API errors gracefully and display them inside the relevant panel.
- Disable a Run button only while that particular condition is running.
- If no Gemini API key is configured, prompt the user to configure one through Settings.
- Do not hard-code an API key.
- Put configuration such as the Gemini model name in one easy-to-find place.

## What NOT to build yet

Do not build:

- authentication
- database
- user accounts
- study management
- participant IDs
- analytics dashboard
- elaborate agent visualization
- persistent conversation history
- complicated animations
- polished production UI

This is a research prototype intended to help us explore the concept with a research group.

Before implementing, briefly inspect the project structure and then build the smallest working version possible.