import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FUTURE_STEPS } from "../config";
import { activeChild, childrenOf, isTerminal, layoutTree, pathTo, type NodeMap } from "../tree";
import {
  LEVEL_LABELS,
  OUTCOMES,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  STOP_COLORS,
  STOP_LABELS,
  STOP_SYMBOLS,
  type Outcome,
} from "../types";

interface Props {
  nodes: NodeMap;
  rootId: string | null;
  selectedId: string | null;
  // Bumped by the parent to bring a node into view — the nonce makes a repeat
  // request for the same node still fire.
  focus: { id: string; nonce: number } | null;
  onSelect: (id: string) => void;
  // Clicking empty canvas clears the selection, and with it the lineage fade.
  onClearSelection: () => void;
  onDevelopNext: (id: string) => void;
  onPort: (id: string, outcome: Outcome) => void;
  onVisualize: (id: string) => void;
  onPlayFutures: () => void;
  playing: boolean;
  canPlay: boolean;
}

// A quarter-arc that spins — used wherever a node is waiting on a call.
function Spinner({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const circumference = 2 * Math.PI * r;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className="p8-spinner"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray={`${circumference * 0.28} ${circumference * 0.72}`}
    />
  );
}

// Small picture glyph, drawn rather than set as a text character so it stays
// crisp at this size and doesn't depend on font coverage.
function PictureGlyph() {
  return (
    <g className="p8-icon-glyph">
      <rect x={4.5} y={5.5} width={11} height={9} rx={1.5} fill="none" strokeWidth={1.3} />
      <circle cx={7.6} cy={8.6} r={1.1} strokeWidth={0} />
      <path
        d="M5.5 13.2 L9 9.8 L11.6 12.4 L13.2 10.9 L14.5 12.2"
        fill="none"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </g>
  );
}

const NODE_W = 238;
const TITLE_CHARS = 30;
const TITLE_MAX_LINES = 3;
const IDEA_CHARS = 34;
const IDEA_MAX_LINES = 3;
const TITLE_LINE_H = 15;
const IDEA_LINE_H = 13;

// Vertical anatomy of a node: the idea on top, the debate below it.
const PAD_TOP = 18;
const SECTION_LABEL_H = 13;
const DIVIDER_GAP = 11;
// Clear space under the last title line for the output dots, which straddle
// the bottom edge.
const PAD_BOTTOM = 14;
// A stopped node's banner is taller than the section label it replaces.
const STOP_BANNER_EXTRA = 6;
const THUMB_H = 84;

// One output port per outcome along the bottom edge, in the same left-to-right
// order the layout places the children (skeptic, synthesis, proponent), so the
// connectors fan out without crossing.
const PORT_SPACING = 40;
const PORT_HIT_R = 12;
const PORT_X: Record<Outcome, number> = {
  skeptic: NODE_W / 2 - PORT_SPACING,
  synthesis: NODE_W / 2,
  proponent: NODE_W / 2 + PORT_SPACING,
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

// Text is shown in full rather than truncated, so it wraps — which means node
// height varies and edges have to read each node's own height.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines && lines.join(" ").length < text.length - 1) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines.length > 0 ? lines : [text];
}

export function TreeView({
  nodes,
  rootId,
  selectedId,
  focus,
  onSelect,
  onClearSelection,
  onDevelopNext,
  onPort,
  onVisualize,
  onPlayFutures,
  playing,
  canPlay,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // x/y are screen-space translation, k is zoom. The transform is applied as
  // translate-then-scale, so drag deltas stay 1:1 with the pointer at any zoom.
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  // Distinguishes a drag from a click, so panning across a node doesn't
  // select it.
  const movedRef = useRef(false);

  // Nudges the designer has applied by dragging nodes. They sit on top of the
  // computed layout, so the tree structure is untouched — edges just follow.
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Heights must be known before layout, since rows are sized to their tallest
  // node.
  const titleLines: Record<string, string[]> = {};
  const ideaLines: Record<string, string[]> = {};
  const dividerY: Record<string, number> = {};
  const heights: Record<string, number> = {};
  for (const node of Object.values(nodes)) {
    ideaLines[node.id] = wrap(node.ideaSummary || node.ideaState, IDEA_CHARS, IDEA_MAX_LINES);
    // A stopped node shows why it stopped in place of the point it would have
    // been argued on.
    titleLines[node.id] = wrap(
      isTerminal(node) && node.stop
        ? node.stop.note || STOP_LABELS[node.stop.reason]
        : node.consideration.title,
      TITLE_CHARS,
      TITLE_MAX_LINES
    );
    dividerY[node.id] =
      PAD_TOP +
      SECTION_LABEL_H +
      ideaLines[node.id].length * IDEA_LINE_H +
      (node.image || node.imageStatus === "loading" ? THUMB_H + 6 : 0) +
      DIVIDER_GAP / 2;
    heights[node.id] =
      dividerY[node.id] +
      DIVIDER_GAP / 2 +
      SECTION_LABEL_H +
      titleLines[node.id].length * TITLE_LINE_H +
      (isTerminal(node) ? STOP_BANNER_EXTRA : 0) +
      PAD_BOTTOM;
  }

  const { positions } = layoutTree(nodes, rootId, heights);

  // Laid-out position plus any manual nudge.
  const at = (id: string): { x: number; y: number } => {
    const base = positions[id];
    const off = offsets[id];
    return off ? { x: base.x + off.x, y: base.y + off.y } : base;
  };

  // A nudge is an offset from where the layout put a node, so it only means
  // anything while that base position holds. When a new outcome re-flows the
  // tree, nudged nodes would otherwise stay pinned and the new node would land
  // on top of them — so a nudge is dropped the moment its node is moved by the
  // layout, and kept when the layout left it alone.
  const prevPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const positionKey = JSON.stringify(positions);
  useEffect(() => {
    const previous = prevPositionsRef.current;
    prevPositionsRef.current = positions;
    setOffsets((current) => {
      const kept: Record<string, { x: number; y: number }> = {};
      let dropped = false;
      for (const [id, offset] of Object.entries(current)) {
        const before = previous[id];
        const now = positions[id];
        if (before && now && before.x === now.x && before.y === now.y) kept[id] = offset;
        else dropped = true;
      }
      // Returning the same object when nothing changed avoids a render loop.
      return dropped ? kept : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  // The root's x moves as the tree grows (it centres over its children), so
  // recentering has to read the current layout rather than one captured when
  // the callback was created.
  const rootPosRef = useRef<{ x: number; y: number } | null>(null);
  rootPosRef.current = rootId ? positions[rootId] ?? null : null;

  // Also drops any manual node nudges, so there's always a way back to the
  // clean laid-out tree.
  const resetView = useCallback(() => {
    setOffsets({});
    const container = containerRef.current;
    const root = rootPosRef.current;
    if (!container || !root) return;
    setView({ x: container.clientWidth / 2 - (root.x + NODE_W / 2), y: 28, k: 1 });
  }, []);

  // Zoom about a fixed screen point: the content under that point stays put.
  const zoomAbout = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  }, []);

  const zoomFromButton = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    zoomAbout(container.clientWidth / 2, container.clientHeight / 2, factor);
  };

  // React attaches wheel listeners passively, so preventDefault there is
  // ignored and the page scrolls instead of the canvas zooming. Bind it
  // directly with passive: false.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      zoomAbout(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomAbout]);

  // Glide the canvas so a given node lands in the middle — used by "Go to
  // branch" and whenever a freshly developed node is selected, since the tree
  // grows downward off-screen.
  useEffect(() => {
    if (!focus) return;
    const container = containerRef.current;
    const pos = positions[focus.id];
    if (!container || !pos) return;

    const off = offsets[focus.id] ?? { x: 0, y: 0 };
    const cx = pos.x + off.x + NODE_W / 2;
    const cy = pos.y + off.y + (heights[focus.id] ?? 150) / 2;

    const from = { ...view };
    const to = {
      k: from.k,
      x: container.clientWidth / 2 - from.k * cx,
      y: container.clientHeight / 2 - from.k * cy,
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setView(to);
      return;
    }

    const started = performance.now();
    const DURATION = 280;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setView({
        k: from.k,
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      });
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Deliberately keyed on the focus request only: `view` is captured once as
    // the tween's starting point, and re-running on every frame would restart it.
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Centre on the root when a new game starts — not on every expansion, which
  // would yank the canvas back while the designer is exploring.
  useLayoutEffect(() => {
    resetView();
  }, [rootId, resetView]);

  if (!rootId) return null;

  const list = Object.values(nodes).filter((n) => positions[n.id]);
  const pathIds = new Set(pathTo(nodes, selectedId).map((n) => n.id));

  // The selected node's lineage: its path back to the root plus everything
  // that grew from it. Everything else fades, so the trace stands out.
  const lineage = new Set(pathIds);
  if (selectedId && nodes[selectedId]) {
    const stack = [nodes[selectedId]];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const kid of childrenOf(nodes, current)) {
        lineage.add(kid.id);
        stack.push(kid);
      }
    }
  }
  const outsideLineage = (id: string) => selectedId !== null && !lineage.has(id);
  // Selected node paints last so it sits above anything it overlaps.
  const paintOrder = [...list].sort(
    (a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)
  );

  // Dragging a node nudges only that node; its children stay put and the edges
  // stretch, so nothing is detached and the structure stays intact.
  const onNodePointerDown = (e: React.PointerEvent<SVGGElement>, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    const base = offsets[id] ?? { x: 0, y: 0 };
    const zoom = view.k;
    movedRef.current = false;

    const onMove = (ev: PointerEvent) => {
      // Screen pixels divided by zoom gives content-space movement, so the node
      // keeps up with the cursor at any scale.
      const dx = (ev.clientX - start.x) / zoom;
      const dy = (ev.clientY - start.y) / zoom;
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 4) {
        movedRef.current = true;
      }
      setOffsets((prev) => ({ ...prev, [id]: { x: base.x + dx, y: base.y + dy } }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Panning tracks on window rather than via setPointerCapture: capturing the
  // pointer on the <svg> retargets the subsequent click to the capture element,
  // which swallows clicks on the nodes themselves.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY, panX: view.x, panY: view.y };
    movedRef.current = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
      setView((v) => ({ ...v, x: start.panX + dx, y: start.panY + dy }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // A click only counts if the canvas wasn't dragged between down and up.
  const clickIfNotDragging = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movedRef.current) return;
    fn();
  };

  return (
    <section className="p8-tree-wrap">
      <div className="section-header p8-header-row">
        <h2>Idea tree</h2>
        <div className="p8-tree-actions">
          <span className="p8-hint">
            {list.length} node{list.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={onPlayFutures}
            disabled={playing || !canPlay}
            title={`From the selected node, play out all three outcomes ${FUTURE_STEPS} steps ahead, branching into the suggested winner and a contrasting outcome at every step. Every node is developed and debated on its own; nothing is marked as a winner for you.`}
          >
            {playing ? "Playing out…" : "Play out futures"}
          </button>
          <span className="p8-action-divider" aria-hidden="true" />
          <button onClick={() => zoomFromButton(1 / 1.25)} title="Zoom out">
            −
          </button>
          <span className="p8-zoom-value">{Math.round(view.k * 100)}%</span>
          <button onClick={() => zoomFromButton(1.25)} title="Zoom in">
            +
          </button>
          <button onClick={resetView} title="Recenter the view and undo any nodes you have dragged">
            Recenter
          </button>
        </div>
      </div>

      <div className="p8-canvas" ref={containerRef}>
        <svg
          ref={svgRef}
          className="p8-tree"
          width="100%"
          height="100%"
          role="img"
          aria-label={`Idea development tree, ${list.length} nodes`}
          onPointerDown={onPointerDown}
          // Nodes, dots and buttons stop propagation, so this only fires on
          // empty canvas — and not at the end of a pan.
          onClick={() => {
            if (!movedRef.current) onClearSelection();
          }}
        >
          <defs>
            <filter id="p8-selected-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1a1a1a" floodOpacity="0.2" />
            </filter>
          </defs>
          <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
            {/* The selected node's path from the root, drawn as a soft band
                under the edges, so you can trace how the idea got here. */}
            {list.map((node) => {
              if (!pathIds.has(node.id) || !node.parentId || !pathIds.has(node.parentId)) {
                return null;
              }
              const parent = nodes[node.parentId];
              const from = at(parent.id);
              const to = at(node.id);
              const x1 = from.x + (node.fromOutcome ? PORT_X[node.fromOutcome] : NODE_W / 2);
              const y1 = from.y + heights[parent.id];
              const x2 = to.x + NODE_W / 2;
              const midY = (y1 + to.y) / 2;
              return (
                <path
                  key={`trace-${node.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${to.y}`}
                  className="p8-trace"
                />
              );
            })}

            {list.map((node) => {
              const from = at(node.id);
              const active = activeChild(nodes, node);
              const hasWinner = node.winner !== null;
              return childrenOf(nodes, node).map((child) => {
                const to = at(child.id);
                if (!to) return null;
                const isActive = active?.id === child.id;
                // Until a winner is marked no branch is ruled against, so all
                // read as plain solid edges.
                const ruledOut = hasWinner && !isActive;
                const color = child.fromOutcome ? OUTCOME_COLORS[child.fromOutcome] : "#aaa";
                const x1 = from.x + (child.fromOutcome ? PORT_X[child.fromOutcome] : NODE_W / 2);
                const y1 = from.y + heights[node.id];
                const x2 = to.x + NODE_W / 2;
                const y2 = to.y;
                const midY = (y1 + y2) / 2;
                return (
                  <g
                    key={`${node.id}-${child.id}`}
                    className={
                      outsideLineage(node.id) || outsideLineage(child.id) ? "p8-faded" : ""
                    }
                  >
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? 3 : 1.75}
                      strokeOpacity={ruledOut ? 0.4 : 1}
                      strokeDasharray={ruledOut ? "4 3" : undefined}
                    />
                    <text
                      x={x2}
                      y={y2 - 8}
                      textAnchor="middle"
                      className="p8-edge-label"
                      fill={color}
                      fillOpacity={ruledOut ? 0.5 : 1}
                    >
                      {isActive ? "★ " : ""}
                      {child.fromOutcome ? OUTCOME_LABELS[child.fromOutcome] : ""}
                      {/* Moving down a level is marked where it happens. */}
                      {child.level !== node.level ? ` · ↓ ${LEVEL_LABELS[child.level]}` : ""}
                    </text>
                  </g>
                );
              });
            })}

            {paintOrder.map((node) => {
              const pos = at(node.id);
              const selected = node.id === selectedId;
              const h = heights[node.id];
              const lines = titleLines[node.id];
              // A branch whose parent marked a different winner: kept,
              // dimmed, and still explorable.
              const parent = node.parentId !== null ? nodes[node.parentId] : null;
              const abandoned =
                Boolean(parent) &&
                parent!.winner !== null &&
                parent!.winner !== node.fromOutcome;
              const busy =
                node.status === "debating" ||
                node.developing.length > 0 ||
                node.imageStatus === "loading";
              const stopped = isTerminal(node) && node.stop ? node.stop : null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={`p8-node ${abandoned ? "p8-node-abandoned" : ""} ${
                    selected ? "p8-node-selected" : ""
                  } ${busy ? "p8-node-busy" : ""} ${
                    stopped ? `p8-node-stopped p8-stop-${stopped.reason}` : ""
                  } ${outsideLineage(node.id) ? "p8-faded" : ""}`}
                  style={
                    stopped ? ({ "--stop": STOP_COLORS[stopped.reason] } as CSSProperties) : undefined
                  }
                  onPointerDown={(e) => onNodePointerDown(e, node.id)}
                  onClick={clickIfNotDragging(() => onSelect(node.id))}
                >
                  {selected && (
                    <rect
                      x={-5}
                      y={-5}
                      width={NODE_W + 10}
                      height={h + 10}
                      rx={9}
                      className="p8-node-halo"
                    />
                  )}
                  <rect
                    width={NODE_W}
                    height={h}
                    rx={6}
                    className="p8-node-box"
                    // A stopped node's fill and border come from CSS (--stop).
                    stroke={selected ? "#1a1a1a" : "#ccc"}
                    strokeWidth={selected ? 2.5 : 1}
                    filter={selected ? "url(#p8-selected-shadow)" : undefined}
                  />
                  <rect
                    width={NODE_W}
                    height={4}
                    rx={2}
                    // Which case produced this node, matching its incoming edge.
                    fill={node.fromOutcome ? OUTCOME_COLORS[node.fromOutcome] : "#ccc"}
                  />
                  {/* Top half: the idea as it currently stands. */}
                  <text x={13} y={PAD_TOP} className="p8-node-section">
                    IDEA · {LEVEL_LABELS[node.level].toUpperCase()}
                  </text>

                  <g
                    className="p8-node-icon"
                    transform={`translate(${NODE_W - 30}, 6)`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      movedRef.current = false;
                    }}
                    onClick={clickIfNotDragging(() => onVisualize(node.id))}
                  >
                    <title>{node.image ? "Redraw the sketch" : "Sketch this idea"}</title>
                    <circle cx={10} cy={10} r={9.5} className="p8-icon-circle" />
                    {node.imageStatus === "loading" ? (
                      <Spinner cx={10} cy={10} r={5} />
                    ) : (
                      <PictureGlyph />
                    )}
                  </g>
                  {ideaLines[node.id].map((line, i) => (
                    <text
                      key={`idea-${i}`}
                      x={13}
                      y={PAD_TOP + SECTION_LABEL_H + i * IDEA_LINE_H}
                      className="p8-node-idea"
                    >
                      {line}
                    </text>
                  ))}

                  {node.image ? (
                    <image
                      href={node.image}
                      x={13}
                      y={PAD_TOP + SECTION_LABEL_H + ideaLines[node.id].length * IDEA_LINE_H - 6}
                      width={NODE_W - 26}
                      height={THUMB_H}
                      preserveAspectRatio="xMidYMid slice"
                      className="p8-node-thumb"
                    />
                  ) : (
                    node.imageStatus === "loading" && (
                      <g
                        transform={`translate(13, ${
                          PAD_TOP + SECTION_LABEL_H + ideaLines[node.id].length * IDEA_LINE_H - 6
                        })`}
                      >
                        <rect
                          width={NODE_W - 26}
                          height={THUMB_H}
                          rx={3}
                          className="p8-thumb-placeholder"
                        />
                        <Spinner cx={(NODE_W - 26) / 2} cy={THUMB_H / 2 - 6} r={7} />
                        <text
                          x={(NODE_W - 26) / 2}
                          y={THUMB_H / 2 + 20}
                          textAnchor="middle"
                          className="p8-thumb-placeholder-label"
                        >
                          drawing…
                        </text>
                      </g>
                    )
                  )}

                  {stopped ? (
                    // A solid banner in the stop's colour, readable from across
                    // the canvas, with the one-line reason under it.
                    <>
                      <rect
                        x={8}
                        y={dividerY[node.id] - 2}
                        width={NODE_W - 16}
                        height={SECTION_LABEL_H + STOP_BANNER_EXTRA + 2}
                        rx={3}
                        className="p8-stop-banner"
                      />
                      <text
                        x={14}
                        y={dividerY[node.id] + SECTION_LABEL_H + 1}
                        className="p8-stop-banner-text"
                      >
                        {STOP_SYMBOLS[stopped.reason]} {STOP_LABELS[stopped.reason].toUpperCase()}
                      </text>
                    </>
                  ) : (
                    <>
                      <line
                        x1={13}
                        y1={dividerY[node.id]}
                        x2={NODE_W - 13}
                        y2={dividerY[node.id]}
                        className="p8-node-divider"
                      />
                      {/* Bottom half: what is being argued about it. */}
                      <text
                        x={13}
                        y={dividerY[node.id] + DIVIDER_GAP / 2 + SECTION_LABEL_H - 3}
                        className="p8-node-section"
                      >
                        UP FOR DEBATE
                      </text>
                    </>
                  )}
                  {lines.map((line, i) => (
                    <text
                      key={`title-${i}`}
                      x={13}
                      y={
                        dividerY[node.id] +
                        DIVIDER_GAP / 2 +
                        SECTION_LABEL_H +
                        11 +
                        (stopped ? STOP_BANNER_EXTRA : 0) +
                        i * TITLE_LINE_H
                      }
                      className="p8-node-title"
                    >
                      {line}
                    </text>
                  ))}

                  {/* A stopped branch has no ports or "+" — nothing grows from it
                      unless the designer chooses to keep going in the panel. */}
                  {!stopped && (
                    <>
                      {/* Output ports: filled where that case has been developed,
                          hollow where it's still open. The winner's port is larger;
                          the others fade once a winner is marked, like their edges.
                          Clicking one develops that case, or jumps to it. */}
                      {OUTCOMES.map((o) => {
                        const childId = node.childByOutcome[o];
                        const explored = Boolean(childId && nodes[childId]);
                        const isWinner = node.winner === o;
                        const ruledOut = node.winner !== null && !isWinner;
                        const developingThis = node.developing.includes(o);
                        return (
                          <g
                            key={`port-${o}`}
                            className={`p8-port ${explored ? "p8-port-explored" : "p8-port-open"}`}
                            transform={`translate(${PORT_X[o]}, ${h})`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              movedRef.current = false;
                            }}
                            onClick={clickIfNotDragging(() => {
                              if (!developingThis) onPort(node.id, o);
                            })}
                          >
                            <title>
                              {OUTCOME_LABELS[o]}
                              {isWinner ? " (winner)" : ""} —{" "}
                              {developingThis
                                ? "developing…"
                                : explored
                                  ? "click to go to this branch"
                                  : "click to develop this case"}
                            </title>
                            {/* Larger invisible target, so the dot is easy to hit. */}
                            <circle r={PORT_HIT_R} className="p8-port-hit" />
                            <circle
                              r={isWinner ? 8 : explored ? 7 : 6}
                              className="p8-port-dot"
                              fill={explored ? OUTCOME_COLORS[o] : "#fff"}
                              stroke={explored ? "#fff" : OUTCOME_COLORS[o]}
                              fillOpacity={explored && ruledOut ? 0.55 : 1}
                            />
                            {developingThis && <Spinner cx={0} cy={0} r={3.5} />}
                          </g>
                        );
                      })}

                      {/* Sits on the bottom-right corner, clear of the output ports
                          along the bottom edge. */}
                      <g
                        className="p8-node-add"
                        transform={`translate(${NODE_W - 11}, ${h - 11})`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          movedRef.current = false;
                        }}
                        onClick={clickIfNotDragging(() => onDevelopNext(node.id))}
                      >
                        <title>Develop the winner from this node — or the suggested winner if none is marked</title>
                        <circle cx={11} cy={11} r={10} className="p8-add-circle" />
                        {node.developing.length > 0 || node.status === "debating" ? (
                          <Spinner cx={11} cy={11} r={5.5} />
                        ) : (
                          <text x={11} y={15} textAnchor="middle" className="p8-add-plus">
                            +
                          </text>
                        )}
                      </g>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="p8-canvas-footer">
        <div className="p8-legend-row">
          <span className="p8-legend-label">Edges</span>
          {OUTCOMES.map((o) => (
            <span className="p8-legend-item" key={o}>
              <i className="p8-legend-swatch" style={{ background: OUTCOME_COLORS[o] }} />
              {OUTCOME_LABELS[o]}
            </span>
          ))}
          <span className="p8-legend-item">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="21" y2="4" stroke="#555" strokeWidth="3" />
            </svg>
            ★ Winner
          </span>
          <span className="p8-legend-item">
            <svg width="22" height="8" aria-hidden="true">
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke="#555"
                strokeWidth="1.75"
                strokeOpacity="0.4"
                strokeDasharray="4 3"
              />
            </svg>
            Didn't win
          </span>
        </div>

        <div className="p8-legend-row">
          <span className="p8-legend-label">Dots</span>
          <span className="p8-legend-item">
            <svg width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="5" fill="#555" />
            </svg>
            Developed — click to go
          </span>
          <span className="p8-legend-item">
            <svg width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="4.5" fill="#fff" stroke="#555" strokeWidth="1.5" />
            </svg>
            Open — click to develop
          </span>
          <span className="p8-legend-item">
            <svg width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="#555" />
            </svg>
            Winner
          </span>
        </div>

        <div className="p8-legend-row">
          <span className="p8-legend-label">Stops</span>
          {(["settled", "dead_end", "drifted", "circling", "depth_limit"] as const).map((reason) => (
            <span className="p8-legend-item" key={reason}>
              <i
                className="p8-legend-stop"
                style={{ "--stop": STOP_COLORS[reason] } as CSSProperties}
              >
                {STOP_SYMBOLS[reason]}
              </i>
              {STOP_LABELS[reason]}
            </span>
          ))}
        </div>

        <div className="p8-legend-row">
          <span className="p8-legend-label">Controls</span>
          <span className="p8-legend-item">
            <kbd>Drag node</kbd> nudge
          </span>
          <span className="p8-legend-item">
            <kbd>Drag canvas</kbd> pan
          </span>
          <span className="p8-legend-item">
            <kbd>Scroll</kbd> zoom
          </span>
          <span className="p8-legend-item">
            <kbd>Select</kbd> highlight its path and everything below it
          </span>
        </div>
      </div>
    </section>
  );
}
