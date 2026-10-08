import { OUTCOMES, type IdeaNode, type Outcome } from "./types";

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
// and auto-play): the marked winner first, else the debate's suggested
// winner, then the rest. Synthesis leads the rest because it's the move that
// keeps both sides.
const OPEN_ORDER: Outcome[] = ["synthesis", "proponent", "skeptic"];

export function outcomePreference(node: IdeaNode): Outcome[] {
  const first = node.winner ?? node.debate?.suggestedWinner ?? null;
  if (first === null) return OPEN_ORDER;
  return [first, ...OPEN_ORDER.filter((o) => o !== first)];
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

// Vertical layout: the tree grows downward, so depth sets y and siblings
// spread across x. Leaves take the next horizontal slot and each internal node
// centres over its children.
const X_SPACING = 268;
// Clear space between the tallest node in a row and the next row, for the edge
// and its label.
const ROW_GAP = 86;
const FALLBACK_HEIGHT = 150;

// Rows are sized to their own tallest node rather than a fixed pitch, because
// node height varies — a node with a sketch is far taller than one without,
// and a uniform pitch made tall nodes collide with the row below.
export function layoutTree(
  nodes: NodeMap,
  rootId: string | null,
  heights: Record<string, number> = {}
): { positions: Record<string, { x: number; y: number }>; width: number; height: number } {
  const positions: Record<string, { x: number; y: number }> = {};
  if (!rootId || !nodes[rootId]) return { positions, width: 0, height: 0 };

  const tallestInRow: number[] = [];
  const measure = (id: string, depth: number) => {
    tallestInRow[depth] = Math.max(tallestInRow[depth] ?? 0, heights[id] ?? FALLBACK_HEIGHT);
    for (const kid of childrenOf(nodes, nodes[id])) measure(kid.id, depth + 1);
  };
  measure(rootId, 0);

  const rowY: number[] = [0];
  for (let d = 1; d < tallestInRow.length; d++) {
    rowY[d] = rowY[d - 1] + tallestInRow[d - 1] + ROW_GAP;
  }

  let nextLeafSlot = 0;

  const place = (id: string, depth: number): number => {
    const node = nodes[id];
    const kids = childrenOf(nodes, node);

    let x: number;
    if (kids.length === 0) {
      x = nextLeafSlot * X_SPACING;
      nextLeafSlot += 1;
    } else {
      const xs = kids.map((k) => place(k.id, depth + 1));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }

    positions[id] = { x, y: rowY[depth] };
    return x;
  };

  place(rootId, 0);

  const lastRow = tallestInRow.length - 1;
  return {
    positions,
    width: Math.max(1, nextLeafSlot) * X_SPACING,
    height: rowY[lastRow] + (tallestInRow[lastRow] ?? FALLBACK_HEIGHT),
  };
}
