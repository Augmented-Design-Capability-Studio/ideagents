import { useEffect, useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { developOutcome, generateRoot, generateSketch, runDebate } from "./api";
import { NodePanel } from "./components/NodePanel";
import { TreeView } from "./components/TreeView";
import {
  DEBATER_PAIRS,
  MAX_AUTOPLAY_PLIES,
  MAX_CONCURRENT_SKETCHES,
  MAX_RADICALITY,
  MIN_RADICALITY,
  RADICALITY_LABELS,
  SAMPLES,
  debaterPair,
} from "./config";
import { outcomePreference, pathTo, type NodeMap } from "./tree";
import type { IdeaNode, Outcome } from "./types";

let nodeCounter = 0;
function nextId(): string {
  nodeCounter += 1;
  return `n${nodeCounter}-${Date.now().toString(36)}`;
}

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [problem, setProblem] = useState(SAMPLES[0].problem);
  const [seed, setSeed] = useState(SAMPLES[0].seed);
  const [nodes, setNodes] = useState<NodeMap>({});
  const [rootId, setRootId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A request for the canvas to bring a node into view; the nonce lets the
  // same node be re-focused.
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);

  const [radicality, setRadicality] = useState(3);
  const [pairId, setPairId] = useState(DEBATER_PAIRS[1].id);
  const [autoSketch, setAutoSketch] = useState(true);

  const [startStatus, setStartStatus] = useState<"idle" | "loading" | "error">("idle");
  const [startError, setStartError] = useState<string | null>(null);
  const [autoplaying, setAutoplaying] = useState(false);

  const selected = selectedId ? nodes[selectedId] : null;

  // Anything in flight anywhere, for the activity bar.
  const busy =
    startStatus === "loading" ||
    autoplaying ||
    Object.values(nodes).some(
      (n) => n.status === "debating" || n.developing !== null || n.imageStatus === "loading"
    );

  const patchNode = (id: string, patch: Partial<IdeaNode>) => {
    setNodes((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  };

  const handleStart = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setStartStatus("loading");
    setStartError(null);
    try {
      const { ideaSummary, consideration } = await generateRoot(
        apiKey,
        problem.trim(),
        seed.trim(),
        radicality
      );
      const id = nextId();
      const root: IdeaNode = {
        id,
        parentId: null,
        depth: 0,
        fromOutcome: null,
        ideaState: seed.trim(),
        ideaSummary: ideaSummary || seed.trim(),
        carriedForward: "",
        whatChanged: "",
        consideration,
        debate: null,
        status: "ready",
        error: null,
        winner: null,
        childByOutcome: {},
        developing: null,
        note: "",
        image: null,
        imageStatus: "idle",
        imageError: null,
      };
      setNodes({ [id]: root });
      setRootId(id);
      setSelectedId(id);
      setFocus(null);
      setStartStatus("idle");
      void ensureDebate(id, { [id]: root });
    } catch (err) {
      setStartStatus("error");
      setStartError(err instanceof Error ? err.message : String(err));
    }
  };

  // Debates are generated once and cached on the node — selecting a node you've
  // already visited costs nothing.
  const ensureDebate = async (id: string, snapshot?: NodeMap): Promise<IdeaNode | null> => {
    const map = snapshot ?? nodes;
    const node = map[id];
    if (!node || node.debate || node.status === "debating") return node ?? null;

    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return null;
    }
    patchNode(id, { status: "debating", error: null });
    try {
      const debate = await runDebate(
        apiKey,
        problem.trim(),
        node,
        pathTo(map, id),
        radicality,
        pairId
      );
      patchNode(id, { debate, status: "ready" });
      return { ...node, debate, status: "ready" };
    } catch (err) {
      patchNode(id, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  };

  const focusNode = (id: string) => setFocus({ id, nonce: Date.now() });

  // Selecting is free: browsing the tree to read nodes shouldn't spend calls.
  // The debate fires on the paths where intent is unambiguous — the "+" button
  // and auto-play — or from the panel's explicit button.
  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // Develops one outcome into a child node and keeps it. Calling this for a
  // second outcome on the same node does NOT replace the first — both persist,
  // which is what makes changing the winner free. Developing never marks a
  // winner; that's always the designer's explicit call.
  const handleDevelop = async (
    nodeId: string,
    outcome: Outcome,
    snapshot?: NodeMap
  ): Promise<IdeaNode | null> => {
    const map = snapshot ?? nodes;
    const node = map[nodeId];
    if (!node) return null;

    const existing = node.childByOutcome[outcome];
    if (existing) return map[existing] ?? null;

    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return null;
    }

    const withDebate = node.debate ? node : await ensureDebate(nodeId, map);
    if (!withDebate?.debate) return null;

    patchNode(nodeId, { developing: outcome });
    try {
      const result = await developOutcome(
        apiKey,
        problem.trim(),
        withDebate,
        pathTo(map, nodeId),
        outcome,
        radicality
      );
      const childId = nextId();
      const child: IdeaNode = {
        id: childId,
        parentId: nodeId,
        depth: node.depth + 1,
        fromOutcome: outcome,
        ideaState: result.ideaState,
        ideaSummary: result.ideaSummary || result.ideaState,
        carriedForward: result.carriedForward,
        whatChanged: result.whatChanged,
        consideration: result.consideration,
        debate: null,
        status: "ready",
        error: null,
        winner: null,
        childByOutcome: {},
        developing: null,
        note: "",
        image: null,
        imageStatus: "idle",
        imageError: null,
      };

      setNodes((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          developing: null,
          childByOutcome: { ...prev[nodeId].childByOutcome, [outcome]: childId },
        },
        [childId]: child,
      }));
      return child;
    } catch (err) {
      patchNode(nodeId, {
        developing: null,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  };

  // The "+" on a node: develop the marked winner, or the debate's suggested
  // winner if none is marked yet — or go to it if it already exists.
  const handleDevelopNext = async (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;
    const withDebate = node.debate ? node : await ensureDebate(nodeId);
    if (!withDebate?.debate) return;

    const outcome = outcomePreference(withDebate)[0];

    const existing = withDebate.childByOutcome[outcome];
    if (existing) {
      setSelectedId(existing);
      focusNode(existing);
      void ensureDebate(existing);
      return;
    }
    const child = await handleDevelop(nodeId, outcome);
    if (child) {
      setSelectedId(child.id);
      focusNode(child.id);
      void ensureDebate(child.id);
    }
  };

  // Sketching is always explicit — it's an extra call, and not every node is
  // worth a picture.
  const handleVisualize = async (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node || node.imageStatus === "loading") return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    patchNode(nodeId, { imageStatus: "loading", imageError: null });
    try {
      const parentImage = node.parentId ? nodes[node.parentId]?.image ?? null : null;
      const image = await generateSketch(apiKey, problem.trim(), node, parentImage);
      patchNode(nodeId, { image, imageStatus: "idle" });
    } catch (err) {
      patchNode(nodeId, {
        imageStatus: "error",
        imageError: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Draws any node that doesn't have a sketch yet. This runs entirely beside
  // the develop/debate pipeline — nodes and their arguments never wait on a
  // drawing — and several drawings can be in flight at once.
  //
  // The one ordering rule: a child's sketch is conditioned on its parent's
  // image to keep a branch visually continuous, so a node only becomes
  // eligible once its parent has settled (has an image, or failed to get one —
  // otherwise a failed parent would strand its whole subtree).
  useEffect(() => {
    if (!autoSketch) return;
    const all = Object.values(nodes);
    const inFlight = all.filter((n) => n.imageStatus === "loading").length;
    const slots = MAX_CONCURRENT_SKETCHES - inFlight;
    if (slots <= 0) return;

    const ready = all
      .filter((n) => !n.image && n.imageStatus === "idle" && !n.imageError)
      .filter((n) => {
        if (!n.parentId) return true;
        const parent = nodes[n.parentId];
        return !parent || Boolean(parent.image) || Boolean(parent.imageError);
      })
      .sort((a, b) => a.depth - b.depth)
      .slice(0, slots);

    for (const node of ready) void handleVisualize(node.id);
    // handleVisualize is recreated each render; keying on it would re-fire the
    // effect constantly, and the guards above already make it idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, autoSketch]);

  const handleAutoplay = async () => {
    if (!selectedId) return;
    setAutoplaying(true);
    try {
      // A local mirror of the tree. State updates from this loop don't land in
      // `nodes` until React re-renders, so reading `nodes` for the node we just
      // created would miss it — which is why this used to stop after one ply.
      let map: NodeMap = nodes;
      let currentId: string | null = selectedId;

      for (let ply = 0; ply < MAX_AUTOPLAY_PLIES && currentId; ply++) {
        let node: IdeaNode | undefined = map[currentId];
        if (!node) break;

        if (!node.debate) {
          const debated = await ensureDebate(currentId, map);
          if (!debated?.debate) break;
          node = debated;
          map = { ...map, [currentId]: debated };
        }

        // Take the most preferred outcome (marked winner, then suggested
        // winner) that hasn't been developed yet, so every ply CREATES a node
        // from where you are. Taking the top pick outright would just walk down
        // branches that already exist, which made auto-play look like it ran
        // from the frontier rather than from the node you selected. If all
        // three exist there is nothing to create, so it follows the top pick.
        // It never marks a winner — that stays the designer's call.
        const ranked = outcomePreference(node);
        const pick: Outcome = ranked.find((o) => !node.childByOutcome[o]) ?? ranked[0];
        const existingId: string | undefined = node.childByOutcome[pick];
        let child: IdeaNode | null = existingId ? map[existingId] ?? null : null;

        if (!child) {
          child = await handleDevelop(currentId, pick, map);
          if (!child) break;
          map = {
            ...map,
            [currentId]: {
              ...node,
              childByOutcome: { ...node.childByOutcome, [pick]: child.id },
            },
            [child.id]: child,
          };
        }

        setSelectedId(child.id);
        focusNode(child.id);

        // Debate the new node now so the next ply can rule on it — and so the
        // tree is left with every node argued rather than a bare leaf.
        const debatedChild = await ensureDebate(child.id, map);
        if (debatedChild) map = { ...map, [child.id]: debatedChild };

        currentId = child.id;
      }
    } finally {
      setAutoplaying(false);
    }
  };

  const loadSample = (label: string) => {
    const sample = SAMPLES.find((s) => s.label === label);
    if (!sample) return;
    setProblem(sample.problem);
    setSeed(sample.seed);
  };

  return (
    <main className="app p8-app">
      <header className="app-header">
        <h1>Prototype 8: Idea Development Game</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <section className="p8-section">
        <div className="section-header">
          <h2>Problem and seed idea</h2>
          <select value="" onChange={(e) => loadSample(e.target.value)}>
            <option value="">Load a sample…</option>
            {SAMPLES.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <label className="p8-field">
          Problem
          <textarea rows={2} value={problem} onChange={(e) => setProblem(e.target.value)} />
        </label>
        <label className="p8-field">
          Seed idea
          <textarea rows={2} value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>

        <div className="p8-row">
          <button
            onClick={() => void handleStart()}
            disabled={!problem.trim() || !seed.trim() || startStatus === "loading"}
          >
            {startStatus === "loading" ? "Opening…" : rootId ? "Start over" : "Start the game"}
          </button>
        </div>
        {startError && <p className="p8-error">{startError}</p>}
      </section>

      <section className="p8-section p8-controls">
        <div className="section-header p8-controls-header">
          <h2>Setup</h2>
          {!rootId && (
            <span className="p8-hint">
              These shape the very first consideration and debate — set them before you start.
            </span>
          )}
        </div>

        <div className="p8-control-group">
            <label className="p8-radicality">
              <span>
                Radicality <strong>{radicality}</strong>/5 — {RADICALITY_LABELS[radicality]}
              </span>
              <input
                type="range"
                min={MIN_RADICALITY}
                max={MAX_RADICALITY}
                value={radicality}
                onChange={(e) => setRadicality(Number(e.target.value))}
              />
            </label>
            <p className="p8-hint">
              Shifts how deep each consideration cuts and how far the Proponent pushes.
            </p>
          </div>

          <div className="p8-control-group p8-control-wide">
            <label className="p8-debaters">
              <span>Who is arguing</span>
              <select value={pairId} onChange={(e) => setPairId(e.target.value)}>
                {DEBATER_PAIRS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="p8-hint">
              {pairId === "auto"
                ? "The model picks a stakeholder for the Skeptic each time."
                : `${debaterPair(pairId).con.role} ${debaterPair(pairId).con.stance}.`}{" "}
              Switch pairs partway through to re-argue a later node from a different lens and
              compare the two branches.
            </p>
            <label className="p8-checkbox">
              <input
                type="checkbox"
                checked={autoSketch}
                onChange={(e) => setAutoSketch(e.target.checked)}
              />
              Sketch every node automatically
              <span className="p8-hint">
                One extra call per node. Nodes appear straight away and the drawing fills in.
              </span>
            </label>
          </div>
      </section>

      <div className={`p8-progress ${busy ? "p8-progress-on" : ""}`} aria-hidden="true">
        <span />
      </div>

      {rootId && (
        <div className="p8-board">
          <TreeView
            nodes={nodes}
            rootId={rootId}
            selectedId={selectedId}
            focus={focus}
            onSelect={handleSelect}
            onDevelopNext={(id) => void handleDevelopNext(id)}
            onVisualize={(id) => void handleVisualize(id)}
            onAutoplay={() => void handleAutoplay()}
            autoplaying={autoplaying}
            canAutoplay={Boolean(selectedId)}
          />

          {selected && (
            <NodePanel
              nodes={nodes}
              node={selected}
              onWinnerChange={(winner) => patchNode(selected.id, { winner })}
              onDevelop={(outcome) => void handleDevelop(selected.id, outcome)}
              onGoTo={(id) => {
                handleSelect(id);
                focusNode(id);
              }}
              onRunDebate={() => void ensureDebate(selected.id)}
              onVisualize={() => void handleVisualize(selected.id)}
              onNoteChange={(note) => patchNode(selected.id, { note })}
            />
          )}
        </div>
      )}

      {agentOpen && (
        <AgentDialog
          connection={connection}
          onConnectionChanged={() => void refreshConnection()}
          onClose={() => setAgentOpen(false)}
        />
      )}
    </main>
  );
}
