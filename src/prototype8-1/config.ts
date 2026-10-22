// Debate and development want some life in them; this isn't structured
// estimation like prototype 6.
export const TEMPERATURE = 0.8;

export const MIN_RADICALITY = 1;
export const MAX_RADICALITY = 5;

export const RADICALITY_LABELS: Record<number, string> = {
  1: "Conventional — argue the safe reading",
  2: "Careful",
  3: "Ambitious",
  4: "Bold",
  5: "Radical — argue the most far-reaching reading",
};

// Playing out futures from a node develops all three of its outcomes, then
// keeps branching for this many steps in total. Every later node develops
// FUTURE_BRANCHING outcomes (its suggested winner plus a contrasting one), so
// a future never collapses into a single line of one side winning.
export const FUTURE_STEPS = 3;
export const FUTURE_BRANCHING = 2;

// Nodes one "play out futures" can create: 3 at the first step, then
// ×FUTURE_BRANCHING per step. Each is developed and debated (2 calls).
export const FUTURE_NODES = Array.from(
  { length: FUTURE_STEPS },
  (_, step) => 3 * FUTURE_BRANCHING ** step
).reduce((a, b) => a + b, 0);

// Model calls allowed in flight at once, across the whole prototype.
export const MAX_CONCURRENT_CALLS = 4;

// A branch stays at a level for as many rounds as it takes to become viable
// there, and only then moves down one level. This many rounds at one level
// without becoming viable stops the branch as going in circles.
export const MAX_PER_LEVEL = 6;

// Hard cap on how deep any branch goes, whatever the model says.
export const MAX_DEPTH = 16;

// Sketches run beside the develop/debate pipeline, several at a time. Kept
// low because image calls are the slowest and most rate-limited of the three.
export const MAX_CONCURRENT_SKETCHES = 3;

// Letting the model invent a stakeholder each time produced speakers that felt
// arbitrary and drifted between nodes. Picking a pair up front makes the lens
// a deliberate choice — and switching it mid-game is a way to re-argue the same
// idea from somewhere else.
export interface DebaterPair {
  id: string;
  label: string;
  pro: { role: string; stance: string };
  con: { role: string; stance: string };
}

export const DEBATER_PAIRS: DebaterPair[] = [
  {
    id: "auto",
    label: "Let the model choose",
    pro: { role: "", stance: "" },
    con: { role: "", stance: "" },
  },
  {
    id: "designer-manufacturing",
    label: "Designer vs Manufacturing engineer",
    pro: {
      role: "Designer",
      stance: "argues from intent and experience — what the idea is trying to be for the person using it",
    },
    con: {
      role: "Manufacturing engineer",
      stance: "argues from tooling, tolerances, cycle time and what the line can actually hold",
    },
  },
  {
    id: "designer-packaging",
    label: "Designer vs Vehicle packaging engineer",
    pro: {
      role: "Designer",
      stance: "argues from intent and experience",
    },
    con: {
      role: "Vehicle packaging engineer",
      stance: "argues from where every part physically fits — volumes, clearances, and what has to move to make room",
    },
  },
  {
    id: "designer-safety",
    label: "Designer vs Safety assessor",
    pro: {
      role: "Designer",
      stance: "argues from intent and experience",
    },
    con: {
      role: "Safety and compliance assessor",
      stance: "argues from failure modes, standards and what happens in the worst case rather than the normal one",
    },
  },
  {
    id: "designer-cost",
    label: "Designer vs Cost accountant",
    pro: {
      role: "Designer",
      stance: "argues from intent and experience",
    },
    con: {
      role: "Cost accountant",
      stance: "argues from unit cost, tooling amortisation and margin at the volumes actually forecast",
    },
  },
  {
    id: "designer-service",
    label: "Designer vs Service technician",
    pro: {
      role: "Designer",
      stance: "argues from intent and experience",
    },
    con: {
      role: "Service technician",
      stance: "argues from repair, disassembly, spares and what the thing is like after three years in the field",
    },
  },
  {
    id: "user-business",
    label: "User advocate vs Business owner",
    pro: {
      role: "User advocate",
      stance: "argues from what the people it is for actually need and would notice",
    },
    con: {
      role: "Business owner",
      stance: "argues from viability — who pays, what it displaces, and whether it earns its place in the range",
    },
  },
  {
    id: "futurist-pragmatist",
    label: "Futurist vs Pragmatist",
    pro: {
      role: "Futurist",
      stance: "argues from where the context is heading in ten years, not where it is now",
    },
    con: {
      role: "Pragmatist",
      stance: "argues from what can be shipped with the team, budget and platform that exist today",
    },
  },
  {
    id: "access-volume",
    label: "Accessibility advocate vs Mass-market PM",
    pro: {
      role: "Accessibility advocate",
      stance: "argues from the people currently excluded and what inclusion would actually require",
    },
    con: {
      role: "Mass-market product manager",
      stance: "argues from the median user, the volume case and what complexity costs everyone else",
    },
  },
  {
    id: "sustainability-supply",
    label: "Sustainability lead vs Supply chain manager",
    pro: {
      role: "Sustainability lead",
      stance: "argues from materials, end-of-life, repairability and embodied impact",
    },
    con: {
      role: "Supply chain manager",
      stance: "argues from sourcing risk, lead times, supplier qualification and logistics",
    },
  },
];

export function debaterPair(id: string): DebaterPair {
  return DEBATER_PAIRS.find((p) => p.id === id) ?? DEBATER_PAIRS[0];
}

export interface Sample {
  label: string;
  problem: string;
  seed: string;
}

export const SAMPLES: Sample[] = [
  {
    label: "Targa roof",
    problem:
      "A Targa's fixed steel roll bar is its signature and part of its rollover protection, so it has to stay. But the roof between the windshield and the bar still needs to disappear for open-air driving — in a rear-engine 2+2 with almost no spare space.",
    seed: "Keep the fixed steel Targa bar, and make the roof section between the windshield and the bar retractable, so the car goes fully open-air without losing the bar.",
  },
  {
    label: "Vehicle rear cabin",
    problem:
      "Rear-seat passengers report the cabin feels claustrophobic, but the roofline is fixed by the existing platform and cannot change.",
    seed: "Enlarge the side glazing and slim the front seat backs to open up sightlines.",
  },
  {
    label: "Museum access",
    problem:
      "Visually impaired visitors can't navigate a museum independently; staffed tours are limited and scheduled.",
    seed: "A handheld guide with directional haptics that pulse more strongly as the visitor turns toward the next exhibit.",
  },
  {
    label: "Stove controls",
    problem:
      "Users with limited hand strength can't operate conventional stove knobs, which need a pinch grip and sustained torque.",
    seed: "Large lever-style knobs that turn with a push-and-rotate motion instead of a pinch grip.",
  },
];
