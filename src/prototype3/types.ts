export interface Goal {
  id: string;
  text: string;
}

export type ChainStatus = "pending" | "accepted" | "rejected";

// One reasoning link for a goal: why a mechanism produces the feeling, and
// a candidate measurable requirement that follows from it. Each goal
// generates a few of these in parallel (different plausible paths), and the
// designer accepts/edits/rejects each independently.
export interface ChainItem {
  id: string;
  goalId: string;
  mechanism: string;
  requirement: string;
  rationale: string;
  status: ChainStatus;
}

export interface Variable {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

export interface Output {
  id: string;
  name: string;
  unit: string;
}

export interface Formula {
  outputId: string;
  expression: string;
}

export interface ModelSpec {
  chainItemId: string;
  notApplicable: boolean;
  notApplicableReason: string | null;
  variables: Variable[];
  formulas: Formula[];
  outputs: Output[];
  assumptions: string[];
}
