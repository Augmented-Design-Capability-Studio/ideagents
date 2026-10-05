// A configuration is the same scene at a different settling of its
// parameters — same nodes, same implications, so the panels stay comparable.
export interface Configuration {
  id: string;
  name: string;
  rationale: string;
  values: Record<string, number>;
  materials: Record<string, string>;
  // View state travels with the configuration so duplicating or removing a
  // panel carries it along.
  interior: boolean;
  // Whether this panel is part of the linked group — linked panels share a
  // camera and switch between inside/outside together, so they stay
  // comparable. Unlink one to inspect it on its own.
  linked: boolean;
  // A "provocation" deliberately breaks a constraint. It's kept as an intent
  // rather than inferred from the numbers, because a configuration the
  // designer drags past a limit themselves is a different thing from one the
  // model proposed as a thought experiment.
  intent: "feasible" | "provocation";
  violates: string[];
  provocation: string;
  designImplications: string[];
}

export interface ComparisonCell {
  configId: string;
  value: number | null;
  best: boolean;
  warning: string | null;
}

export interface ComparisonRow {
  id: string;
  label: string;
  unit: string;
  betterWhen: "lower" | "higher" | "none";
  cells: ComparisonCell[];
}
