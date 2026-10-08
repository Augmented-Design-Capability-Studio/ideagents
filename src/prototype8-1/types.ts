// The three outcomes a judgment can produce. The ruling is one of exactly
// these — an earlier continuous slider was a false affordance, since every
// reader of the verdict bucketed it into these three anyway.
export type Outcome = "skeptic" | "synthesis" | "proponent";

export const OUTCOMES: Outcome[] = ["skeptic", "synthesis", "proponent"];

export const OUTCOME_LABELS: Record<Outcome, string> = {
  skeptic: "Skeptic wins",
  synthesis: "Synthesis",
  proponent: "Proponent wins",
};

// Edges are coloured by who won, matching the two debate cards in the panel.
// Synthesis gets its own colour rather than a blend, because holding both is a
// distinct move and not a halfway house.
export const OUTCOME_COLORS: Record<Outcome, string> = {
  skeptic: "#c62828",
  synthesis: "#7b4fb5",
  proponent: "#2e9e44",
};

export interface Side {
  // The Skeptic speaks as a named stakeholder; a disembodied objection is too
  // easy to wave away.
  speaker: string;
  claim: string;
  argument: string;
  // Forcing each side to name its own falsifier is what stops the debate
  // collapsing into two symmetrical paragraphs of nothing.
  wouldChangeMyMind: string;
}

export interface Debate {
  pro: Side;
  con: Side;
  // A neutral judge's pick, returned with the debate. Only ever shown as a
  // suggestion and used to order "+" and auto-play — it never marks the
  // winner, which stays the designer's call.
  suggestedWinner: Outcome;
  suggestionReason: string;
}

export interface Consideration {
  title: string;
  text: string;
  // "perspective" | "improvement" | "tension" | "assumption" — free-form, used
  // only as a label.
  kind: string;
}

export type NodeStatus = "ready" | "debating" | "error";

export interface IdeaNode {
  id: string;
  parentId: string | null;
  depth: number;
  // How this node came to exist: the outcome its parent's judgment produced.
  fromOutcome: Outcome | null;
  // The idea as it stands at this point in the path — a complete restatement,
  // not a diff from the parent.
  ideaState: string;
  // A one-line version of the same thing, for the node on the canvas. Asked
  // for explicitly rather than truncating ideaState, which cuts mid-sentence.
  ideaSummary: string;
  // What survived from the previous version. Asked for before whatChanged so
  // the model has to commit to continuity first — if it can't name anything
  // substantial here, it has replaced the idea rather than developed it.
  carriedForward: string;
  // What this move committed to and what it closed off. Kept separate from the
  // designer's own note so it can't be overwritten.
  whatChanged: string;
  // The provocation raised against that idea state.
  consideration: Consideration;
  debate: Debate | null;
  status: NodeStatus;
  error: string | null;
  // The outcome the designer marked as the winner. Separate from developing:
  // any outcome can be developed whether or not it won, and marking a winner
  // costs no call. Null until the designer picks one.
  winner: Outcome | null;
  // Children keyed by the outcome that produced them. This is the cache that
  // makes changing the winner non-destructive: it just changes which child is
  // the live one, and switching back costs nothing.
  childByOutcome: Partial<Record<Outcome, string>>;
  // Set while an outcome is being developed, so the button can show progress.
  developing: Outcome | null;
  // Designer's note on this node.
  note: string;
  // A concept sketch of the idea at this node, as a data URL. Generated on
  // demand — never automatically, since it's an extra call per node.
  image: string | null;
  imageStatus: "idle" | "loading" | "error";
  imageError: string | null;
}

export interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
}
