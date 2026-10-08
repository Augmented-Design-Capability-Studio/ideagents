export const TEMPERATURE = 0.8;

// How many of your own turns the proxy is shown when writing as you. Enough to
// pick up your register; not so many that the prompt is mostly history.
export const PROXY_TURN_WINDOW = 8;

export interface Expert {
  id: string;
  role: string;
  concerns: string;
}

// The opposition roster. You pick who's in the room at setup; considerations
// are raised by whoever is most relevant, cycling so you hear from all of them.
export const EXPERTS: Expert[] = [
  {
    id: "manufacturing",
    role: "Manufacturing engineer",
    concerns: "tooling, tolerances, cycle time, and what the line can actually hold",
  },
  {
    id: "safety",
    role: "Safety and compliance assessor",
    concerns: "failure modes, standards, and the worst case rather than the normal one",
  },
  {
    id: "cost",
    role: "Cost accountant",
    concerns: "unit cost, tooling amortisation, and margin at the volumes actually forecast",
  },
  {
    id: "service",
    role: "Service technician",
    concerns: "repair, disassembly, spares, and what the thing is like after three years",
  },
  {
    id: "user",
    role: "End-user advocate",
    concerns: "what the people it is for actually need, and would notice day to day",
  },
  {
    id: "commercial",
    role: "Commercial lead",
    concerns: "who pays, what it displaces, and whether it earns its place in the range",
  },
  {
    id: "sustainability",
    role: "Sustainability lead",
    concerns: "materials, end-of-life, repairability, and embodied impact",
  },
  {
    id: "supply",
    role: "Supply chain manager",
    concerns: "sourcing risk, lead times, supplier qualification, and logistics",
  },
  {
    id: "accessibility",
    role: "Accessibility advocate",
    concerns: "the people currently excluded, and what including them would require",
  },
  {
    id: "brand",
    role: "Design director",
    concerns: "whether it reads as the brand, and what it signals next to the rest of the range",
  },
];

export function expert(id: string): Expert {
  return EXPERTS.find((e) => e.id === id) ?? EXPERTS[0];
}

export const DEFAULT_EXPERT_IDS = ["manufacturing", "user", "cost"];

export const MIN_EXPERTS = 1;
export const MAX_EXPERTS = 5;

// Picked rather than typed — the point of this variant is to argue, not to
// fill in a questionnaire about yourself.
export const VOICE_TRAITS = [
  "blunt and concrete",
  "asks questions back",
  "argues from the user's experience",
  "argues from first principles",
  "leans on precedent and examples",
  "concedes small points to win big ones",
  "stubborn about the core intent",
  "pragmatic about constraints",
  "reaches for the ambitious reading",
  "cares most about who gets left out",
];

export interface Sample {
  label: string;
  seed: string;
}

export const SAMPLES: Sample[] = [
  {
    label: "Vehicle rear cabin",
    seed: "Enlarge the side glazing and slim the front seat backs so rear passengers feel less boxed in, without touching the roofline.",
  },
  {
    label: "Museum access",
    seed: "A handheld guide for visually impaired museum visitors that pulses stronger haptics as they turn toward the next exhibit.",
  },
  {
    label: "Stove controls",
    seed: "Large lever-style stove knobs that turn with a push-and-rotate motion instead of a pinch grip, for users with limited hand strength.",
  },
];
