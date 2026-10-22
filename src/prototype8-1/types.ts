// The three outcomes a judgment can produce. The ruling is one of exactly
// these — an earlier continuous slider was a false affordance, since every
// reader of the verdict bucketed it into these three anyway.
export type Outcome = "skeptic" | "synthesis" | "proponent";

export const OUTCOMES: Outcome[] = ["skeptic", "synthesis", "proponent"];

// Worded from the designer's side: the Proponent argues for the idea ("you"),
// the Skeptic is the opponent. The ids keep the debate's own terms.
export const OUTCOME_LABELS: Record<Outcome, string> = {
  skeptic: "Opponent wins",
  synthesis: "Synthesis",
  proponent: "You win",
};

// Edges are coloured by who won, matching the two debate cards in the panel.
// Synthesis gets its own colour rather than a blend, because holding both is a
// distinct move and not a halfway house.
export const OUTCOME_COLORS: Record<Outcome, string> = {
  skeptic: "#c62828",
  synthesis: "#7b4fb5",
  proponent: "#2e9e44",
};

// The idea develops from broad to specific: argue the concept until it's
// viable, then its embodiment, then the detail — arguing tolerances before the
// concept holds up is the "over the top" failure. The root (the original idea)
// sits at concept level but is drawn in its own band.
export type Level = "concept" | "embodiment" | "detail";

export const LEVELS: Level[] = ["concept", "embodiment", "detail"];

export const LEVEL_LABELS: Record<Level, string> = {
  concept: "Concept",
  embodiment: "Embodiment",
  detail: "Detail",
};

// What a consideration at each level is about. Shown in the panel and passed
// to the prompts verbatim, so the UI and the model share one definition.
export const LEVEL_FOCUS: Record<Level, string> = {
  concept: "how it works — the main mechanism or principle, and whether it holds up at all — not its exact form",
  embodiment: "form, layout, materials, and how the parts fit together",
  detail: "manufacturing, cost, tolerances, edge cases, and failure modes",
};

// Why a branch stopped. Most come from the model's own judgement when it
// develops a node; drifted and depth_limit are also enforced in code.
export type StopReason = "settled" | "dead_end" | "drifted" | "circling" | "depth_limit";

export const STOP_LABELS: Record<StopReason, string> = {
  settled: "Settled",
  dead_end: "Dead end",
  drifted: "Drifted",
  circling: "Going in circles",
  depth_limit: "Depth limit",
};

// Kept clear of the three outcome colours, so a stop never reads as a ruling,
// and distinct from each other so each kind of ending reads from a distance.
export const STOP_COLORS: Record<StopReason, string> = {
  settled: "#0f7b6c",
  dead_end: "#37474f",
  drifted: "#c77700",
  circling: "#3f6fa0",
  depth_limit: "#9e9e9e",
};

// Paired with the colour so the kinds stay distinguishable zoomed out, in
// greyscale, or for anyone who can't separate the hues.
export const STOP_SYMBOLS: Record<StopReason, string> = {
  settled: "✓",
  dead_end: "✕",
  drifted: "↯",
  circling: "↻",
  depth_limit: "‖",
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
  // suggestion and used to order "+" and playing out futures — it never marks the
  // winner, which stays the designer's call.
  suggestedWinner: Outcome;
  suggestionReason: string;
}

// Something the designer adds to a node's debate from their own expertise —
// the way the game gathers what they know. It says which side it helps, so
// the debate can be re-argued with it: the side it supports must use it, the
// other must answer it. It also carries down the branch to every later call.
export type InputSide = "pro" | "con" | "context";

export const INPUT_SIDE_LABELS: Record<InputSide, string> = {
  pro: "Supports you",
  con: "Supports the opponent",
  context: "Just context",
};

export interface DesignerInput {
  id: string;
  text: string;
  side: InputSide;
}

export interface Consideration {
  // The debate topic, as a short question.
  title: string;
  // What the opponent is picking on, and why.
  text: string;
  // Who picked on it — the opponent's role. Empty when unknown.
  raisedBy: string;
  // "perspective" | "improvement" | "tension" | "assumption" — free-form, used
  // only as a label.
  kind: string;
}

export type NodeStatus = "ready" | "debating" | "error";

export interface IdeaNode {
  id: string;
  parentId: string | null;
  depth: number;
  level: Level;
  // Set when the branch should end here. A stopped node isn't debated and
  // can't be developed further unless the designer chooses to keep going
  // (resumed), which saves the calls a dead branch would otherwise spend.
  stop: { reason: StopReason; note: string } | null;
  resumed: boolean;
  // The last node of a played-out future. Only these (and the root) are
  // sketched automatically, so you compare where futures land without paying
  // for a drawing at every step.
  futureEnd: boolean;
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
  // Outcomes currently being developed from this node — several at once when
  // futures are played out in parallel.
  developing: Outcome[];
  // Designer's note on this node.
  note: string;
  // The designer's own input to this node's debate, oldest first.
  inputs: DesignerInput[];
  // A concept sketch of the idea at this node, as a data URL. Only the root and
  // the ends of played-out futures are sketched automatically; the rest are on
  // demand, since it's an extra (and slow) call per node.
  image: string | null;
  imageStatus: "idle" | "loading" | "error";
  imageError: string | null;
}

export interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
}
