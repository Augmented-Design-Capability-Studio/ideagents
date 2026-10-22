import { FUTURE_BRANCHING } from "./config";
import { LEVEL_LABELS, LEVELS, OUTCOMES, type IdeaNode, type Level, type Outcome } from "./types";

export type NodeMap = Record<string, IdeaNode>;

export function childrenOf(nodes: NodeMap, node: IdeaNode): IdeaNode[] {
  return OUTCOMES.map((o) => node.childByOutcome[o])
    .filter((id): id is string => Boolean(id))
    .map((id) => nodes[id])
    .filter(Boolean);
}

// The developed child of the winning outcome, if the designer has marked one
// and it has been developed.
export function activeChild(nodes: NodeMap, node: IdeaNode): IdeaNode | null {
  if (node.winner === null) return null;
  const id = node.childByOutcome[node.winner];
  return id ? nodes[id] ?? null : null;
}

// The order to try outcomes in when the designer asks for "the next one" ("+"
// and playing out futures): the marked winner first, else the debate's suggested
// winner, then the rest. Synthesis leads the rest because it's the move that
// keeps both sides.
const OPEN_ORDER: Outcome[] = ["synthesis", "proponent", "skeptic"];

export function outcomePreference(node: IdeaNode): Outcome[] {
  const first = node.winner ?? node.debate?.suggestedWinner ?? null;
  if (first === null) return OPEN_ORDER;
  return [first, ...OPEN_ORDER.filter((o) => o !== first)];
}

// The outcomes a played-out future branches into from a node: the top pick
// (marked winner, else suggested winner) plus the outcome that contrasts with
// it most, so both sides of an argument get played forward. Synthesis pairs
// with the Proponent, since a future of nothing but bounded versions is the
// failure this is meant to avoid.
const CONTRAST: Record<Outcome, Outcome> = {
  skeptic: "proponent",
  proponent: "skeptic",
  synthesis: "proponent",
};

export function futurePicks(node: IdeaNode): Outcome[] {
  const first = outcomePreference(node)[0];
  const rest = [CONTRAST[first], ...OUTCOMES.filter((o) => o !== first && o !== CONTRAST[first])];
  return [first, ...rest].slice(0, FUTURE_BRANCHING);
}

// A stopped branch stays stopped until the designer chooses to keep going.
export function isTerminal(node: IdeaNode): boolean {
  return node.stop !== null && !node.resumed;
}

// Which levels the next node on a path may take: stay at the current level,
// or — once the idea is viable there — move down exactly one. countAtLevel is
// how many rounds this path has already spent at the current level (the root,
// being the original idea, doesn't count).
export function levelOptions(path: IdeaNode[]): {
  current: Level;
  next: Level | null;
  countAtLevel: number;
} {
  const last = path[path.length - 1];
  const current = last?.level ?? "concept";
  let countAtLevel = 0;
  for (let i = path.length - 1; i >= 0 && path[i].level === current && path[i].parentId; i--) {
    countAtLevel++;
  }
  const index = LEVELS.indexOf(current);
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
  return { current, next, countAtLevel };
}

// The horizontal band a node is drawn in: 0 for the original idea, then one
// per level.
export function bandOf(node: IdeaNode): number {
  return node.parentId === null ? 0 : 1 + LEVELS.indexOf(node.level);
}

export const BAND_LABELS = ["Original idea", ...LEVELS.map((l) => LEVEL_LABELS[l])];

// How many nodes above this one, on its own path, sit in the same band — so a
// series of concept nodes stacks down inside the concept band.
function runInBand(nodes: NodeMap, node: IdeaNode): number {
  let run = 0;
  let current = node.parentId ? nodes[node.parentId] : undefined;
  while (current && bandOf(current) === bandOf(node)) {
    run++;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return run;
}

// The closest ancestor with a sketch. With sparse sketching the direct parent
// usually has none, so a branch's drawing builds on the nearest one that does.
export function nearestSketchedAncestor(nodes: NodeMap, node: IdeaNode): IdeaNode | null {
  let current = node.parentId ? nodes[node.parentId] : undefined;
  while (current) {
    if (current.image) return current;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return null;
}

// Only the root and the ends of played-out futures are drawn automatically.
export function wantsAutoSketch(node: IdeaNode): boolean {
  return node.parentId === null || node.futureEnd;
}

export function pathTo(nodes: NodeMap, id: string | null): IdeaNode[] {
  const path: IdeaNode[] = [];
  let current = id;
  while (current && nodes[current]) {
    path.unshift(nodes[current]);
    current = nodes[current].parentId;
  }
  return path;
}

// Vertical layout: the tree grows downward through horizontal bands — the
// original idea, then concept, embodiment, detail — so a node's band is its
// level and no label is needed on the node. Inside a band, a series of nodes
// at the same level stacks into rows. Siblings spread across x: leaves take the
// next horizontal slot and each internal node centres over its children.
const X_SPACING = 268;
// Clear space between rows inside a band, and the larger gap between bands
// (where the band divider sits).
const ROW_GAP = 40;
const BAND_GAP = 72;
const FALLBACK_HEIGHT = 150;

export interface Band {
  band: number;
  label: string;
  // Content-space y of the band's first row top and last row bottom.
  top: number;
  bottom: number;
}

// Rows are sized to their own tallest node rather than a fixed pitch, because
// node height varies — a node with a sketch is far taller than one without.
// The spacing is a parameter so the overview can lay the same tree out far
// more tightly than the detailed view.
export function layoutTree(
  nodes: NodeMap,
  rootId: string | null,
  heights: Record<string, number> = {},
  spacing: { x: number; rowGap: number; bandGap: number } = {
    x: X_SPACING,
    rowGap: ROW_GAP,
    bandGap: BAND_GAP,
  }
): {
  positions: Record<string, { x: number; y: number }>;
  bands: Band[];
  width: number;
} {
  const positions: Record<string, { x: number; y: number }> = {};
  if (!rootId || !nodes[rootId]) return { positions, bands: [], width: 0 };

  // Every reachable node's row: its band, and its place in that band's run.
  const rowOf: Record<string, { band: number; run: number }> = {};
  const tallest = new Map<string, number>(); // "band:run" → tallest node
  const visit = (id: string) => {
    const node = nodes[id];
    const row = { band: bandOf(node), run: runInBand(nodes, node) };
    rowOf[id] = row;
    const key = `${row.band}:${row.run}`;
    tallest.set(key, Math.max(tallest.get(key) ?? 0, heights[id] ?? FALLBACK_HEIGHT));
    for (const kid of childrenOf(nodes, node)) visit(kid.id);
  };
  visit(rootId);

  // Stack the rows: band by band, run by run.
  const keys = [...tallest.keys()]
    .map((k) => k.split(":").map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const rowY = new Map<string, number>();
  const bands: Band[] = [];
  let y = 0;
  keys.forEach(([band, run], i) => {
    if (i > 0) y += keys[i - 1][0] === band ? spacing.rowGap : spacing.bandGap;
    const key = `${band}:${run}`;
    rowY.set(key, y);
    const last = bands[bands.length - 1];
    if (last?.band === band) last.bottom = y + (tallest.get(key) ?? 0);
    else bands.push({ band, label: BAND_LABELS[band], top: y, bottom: y + (tallest.get(key) ?? 0) });
    y += tallest.get(key) ?? 0;
  });

  let nextLeafSlot = 0;
  const place = (id: string): number => {
    const kids = childrenOf(nodes, nodes[id]);
    let x: number;
    if (kids.length === 0) {
      x = nextLeafSlot * spacing.x;
      nextLeafSlot += 1;
    } else {
      const xs = kids.map((k) => place(k.id));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
    const row = rowOf[id];
    positions[id] = { x, y: rowY.get(`${row.band}:${row.run}`) ?? 0 };
    return x;
  };
  place(rootId);

  return { positions, bands, width: Math.max(1, nextLeafSlot) * spacing.x };
}
