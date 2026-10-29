import type { NodeMap } from "./tree";
import type {
  Consideration,
  Debate,
  IdeaNode,
  InputSide,
  Level,
  Outcome,
  StopReason,
} from "./types";

// Pre-built trees for demos: no API key, no calls, and the same shape a real
// game produces — a branch stays at a level until it's viable there, then moves
// down one step; "settled" only at detail; stopped nodes aren't debated
// (unless the designer chose to keep going); every point is raised from the
// opponent's expertise.
//
// Each demo stages one dead end that the designer's input unlocks: the branch
// is hidden until then and plays out, pre-scripted, once they add it. The data
// for each demo lives in demos/; this file is the shared engine.

const DESIGNER = "Designer";

export interface Spec {
  id: string;
  parent: string | null;
  from: Outcome | null;
  level: Level;
  idea: string;
  summary: string;
  carried?: string;
  changed?: string;
  // Who raised it is filled in by buildDemoTree unless given here.
  point: Omit<Consideration, "raisedBy">;
  by?: string;
  debate?: Debate;
  winner?: Outcome;
  stop?: { reason: StopReason; note: string };
  futureEnd?: boolean;
  note?: string;
  // Hidden until the staged dead end above it gets the designer's input.
  staged?: boolean;
  // On the staged dead end: what unlocks it.
  unlock?: Unlock;
}

export interface Unlock {
  // Offered in the "+" pop-up — the presenter can use it or say it their way.
  suggestedInput: { text: string; side: InputSide };
  // The debate this node gets once it's re-argued with the input.
  debate: Debate;
  winner: Outcome;
}

export interface DemoDef {
  id: string;
  label: string;
  problem: string;
  seed: string;
  pairId: string;
  rootId: string;
  specs: Spec[];
}

// Shorthand for a debate where "you" are the Designer.
export function debate(
  pro: [claim: string, argument: string, wouldChangeMyMind: string],
  con: [speaker: string, claim: string, argument: string, wouldChangeMyMind: string],
  suggestedWinner: Outcome,
  suggestionReason: string
): Debate {
  return {
    pro: { speaker: DESIGNER, claim: pro[0], argument: pro[1], wouldChangeMyMind: pro[2] },
    con: { speaker: con[0], claim: con[1], argument: con[2], wouldChangeMyMind: con[3] },
    suggestedWinner,
    suggestionReason,
  };
}

// What a staged dead end needs to play out once the designer adds input.
export interface DemoStage {
  suggestedInput: { text: string; side: InputSide };
  debate: Debate;
  winner: Outcome;
  // The hidden nodes, parents before children, with their links stripped —
  // they're re-linked one by one as the branch plays out.
  reveal: IdeaNode[];
}

// Fills in the bookkeeping a real node carries, and derives the tree links
// from each node's parent so they can't disagree. Staged nodes are held back
// in `stages`, keyed by the dead end that unlocks them.
export function buildDemoTree(def: DemoDef): {
  nodes: NodeMap;
  rootId: string;
  stages: Record<string, DemoStage>;
} {
  const SPECS = def.specs;
  const all: NodeMap = {};
  const specs: Record<string, Spec> = {};
  for (const spec of SPECS) {
    specs[spec.id] = spec;
    const parent = spec.parent ? all[spec.parent] : null;
    all[spec.id] = {
      id: spec.id,
      parentId: spec.parent,
      depth: parent ? parent.depth + 1 : 0,
      level: spec.level,
      stop: spec.stop ?? null,
      resumed: false,
      futureEnd: spec.futureEnd ?? false,
      fromOutcome: spec.from,
      ideaState: spec.idea,
      ideaSummary: spec.summary,
      carriedForward: spec.carried ?? "",
      whatChanged: spec.changed ?? "",
      // Raised by this node's opponent; a stopped node wasn't debated, so it
      // takes the opponent who argued its parent's point.
      consideration: {
        ...spec.point,
        raisedBy:
          spec.by ?? spec.debate?.con.speaker ?? parent?.debate?.con.speaker ?? "",
      },
      debate: spec.debate ?? null,
      status: "ready",
      error: null,
      winner: spec.winner ?? null,
      childByOutcome: {},
      developing: [],
      note: spec.note ?? "",
      inputs: [],
      image: null,
      imageStatus: "idle",
      imageError: null,
    };
  }

  const nodes: NodeMap = {};
  const stages: Record<string, DemoStage> = {};
  // The dead end a staged node hangs under.
  const triggerOf = (spec: Spec): string | null => {
    let current = spec.parent ? specs[spec.parent] : undefined;
    while (current) {
      if (current.unlock) return current.id;
      current = current.parent ? specs[current.parent] : undefined;
    }
    return null;
  };

  for (const spec of SPECS) {
    const node = all[spec.id];
    if (spec.unlock) stages[spec.id] = { ...spec.unlock, reveal: [] };
    if (spec.staged) {
      const trigger = triggerOf(spec);
      if (trigger) stages[trigger].reveal.push(node);
      continue;
    }
    nodes[spec.id] = node;
    if (spec.parent && spec.from) nodes[spec.parent].childByOutcome[spec.from] = spec.id;
  }

  return { nodes, rootId: def.rootId, stages };
}
