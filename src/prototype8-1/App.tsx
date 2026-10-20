import { useEffect, useRef, useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { developOutcome, generateRoot, generateSketch, runDebate } from "./api";
import { NodePanel } from "./components/NodePanel";
import { TreeView } from "./components/TreeView";
import {
  DEBATER_PAIRS,
  FUTURE_STEPS,
  MAX_CONCURRENT_CALLS,
  MAX_CONCURRENT_SKETCHES,
  MAX_RADICALITY,
  MIN_RADICALITY,
  RADICALITY_LABELS,
  SAMPLES,
  debaterPair,
} from "./config";
import { createLimiter } from "./limit";
import {
  futurePicks,
  isTerminal,
  nearestSketchedAncestor,
  outcomePreference,
  pathTo,
  wantsAutoSketch,
  type NodeMap,
} from "./tree";
import { OUTCOMES, type IdeaNode, type Outcome } from "./types";

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
  // The node futures are currently being played out from, if any.
  const [playingFrom, setPlayingFrom] = useState<string | null>(null);

  const selected = selectedId ? nodes[selectedId] : null;

  // Anything in flight anywhere, for the activity bar.
  const busy =
    startStatus === "loading" ||
    playingFrom !== null ||
    Object.values(nodes).some(
      (n) => n.status === "debating" || n.developing.length > 0 || n.imageStatus === "loading"
    );

  // Every develop and debate call goes through this, so a burst of them —
  // playing out futures fires many at once — queues instead of tripping the
  // API's rate limit.
  const limitRef = useRef(createLimiter(MAX_CONCURRENT_CALLS));

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
        radicality,
        pairId
      );
      const id = nextId();
      const root: IdeaNode = {
        id,
        parentId: null,
        depth: 0,
        level: "direction",
        stop: null,
        resumed: false,
        futureEnd: false,
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
        developing: [],
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
  //
  // A new node's debate starts the moment it's created, and "+" and playing out futures
  // also ask for it — so calls for a node already being argued share the one
  // in flight rather than starting a second debate.
  const debatesInFlight = useRef(new Map<string, Promise<IdeaNode | null>>());

  const ensureDebate = (id: string, snapshot?: NodeMap): Promise<IdeaNode | null> => {
    const pending = debatesInFlight.current.get(id);
    if (pending) return pending;
    const map = snapshot ?? nodes;
    const node = map[id];
    // A stopped branch isn't argued unless the designer chooses to keep going.
    if (!node || node.debate || node.status === "debating" || isTerminal(node)) {
      return Promise.resolve(node ?? null);
    }

    const promise = runDebateFor(id, map, node).finally(() => {
      debatesInFlight.current.delete(id);
    });
    debatesInFlight.current.set(id, promise);
    return promise;
  };

  const runDebateFor = async (
    id: string,
    map: NodeMap,
    node: IdeaNode
  ): Promise<IdeaNode | null> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return null;
    }
    patchNode(id, { status: "debating", error: null });
    try {
      const debate = await limitRef.current(() =>
        runDebate(apiKey, problem.trim(), node, pathTo(map, id), radicality, pairId)
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
  // Every node is debated as soon as it's created, so there's nothing to fetch
  // on select.
  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // Clicking one of a node's output dots: jump to that case's branch if it's
  // been developed, otherwise develop it.
  const handlePort = async (nodeId: string, outcome: Outcome) => {
    const node = nodes[nodeId];
    if (!node) return;
    const existing = node.childByOutcome[outcome];
    if (existing) {
      setSelectedId(existing);
      focusNode(existing);
      return;
    }
    if (isTerminal(node) || node.developing.includes(outcome)) return;
    const child = await handleDevelop(nodeId, outcome);
    if (child) {
      setSelectedId(child.id);
      focusNode(child.id);
    }
  };

  // Develops one outcome into a child node and keeps it. Calling this for a
  // second outcome on the same node does NOT replace the first — both persist,
  // which is what makes changing the winner free. Developing never marks a
  // winner; that's always the designer's explicit call.
  //
  // Like debates, a develop already in flight for the same node and outcome is
  // shared — a future being played out and a click on the same dot must not
  // create two children for one outcome.
  const developsInFlight = useRef(new Map<string, Promise<IdeaNode | null>>());

  const handleDevelop = (
    nodeId: string,
    outcome: Outcome,
    snapshot?: NodeMap
  ): Promise<IdeaNode | null> => {
    const key = `${nodeId}:${outcome}`;
    const pending = developsInFlight.current.get(key);
    if (pending) return pending;
    const promise = developFor(nodeId, outcome, snapshot ?? nodes).finally(() => {
      developsInFlight.current.delete(key);
    });
    developsInFlight.current.set(key, promise);
    return promise;
  };

  const setDeveloping = (nodeId: string, outcome: Outcome, on: boolean) => {
    setNodes((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      const rest = node.developing.filter((o) => o !== outcome);
      return { ...prev, [nodeId]: { ...node, developing: on ? [...rest, outcome] : rest } };
    });
  };

  const developFor = async (
    nodeId: string,
    outcome: Outcome,
    map: NodeMap
  ): Promise<IdeaNode | null> => {
    const node = map[nodeId];
    if (!node || isTerminal(node)) return null;

    const existing = node.childByOutcome[outcome];
    if (existing) return map[existing] ?? null;

    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return null;
    }

    const withDebate = node.debate ? node : await ensureDebate(nodeId, map);
    if (!withDebate?.debate) return null;

    setDeveloping(nodeId, outcome, true);
    try {
      const result = await limitRef.current(() =>
        developOutcome(
          apiKey,
          problem.trim(),
          withDebate,
          pathTo(map, nodeId),
          outcome,
          radicality,
          pairId
        )
      );
      const childId = nextId();
      const child: IdeaNode = {
        id: childId,
        parentId: nodeId,
        depth: node.depth + 1,
        level: result.level,
        stop: result.stop,
        resumed: false,
        futureEnd: false,
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
        developing: [],
        note: "",
        image: null,
        imageStatus: "idle",
        imageError: null,
      };

      setNodes((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          developing: prev[nodeId].developing.filter((o) => o !== outcome),
          childByOutcome: { ...prev[nodeId].childByOutcome, [outcome]: childId },
        },
        [childId]: child,
      }));
      // Argue the new node straight away, so it's ready to rule on by the time
      // the designer gets to it. A node that stopped its branch is skipped
      // (ensureDebate checks), which saves the call.
      void ensureDebate(childId, { ...map, [childId]: child });
      return child;
    } catch (err) {
      setDeveloping(nodeId, outcome, false);
      patchNode(nodeId, { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  // The "+" on a node: develop the marked winner, or the debate's suggested
  // winner if none is marked yet — or go to it if it already exists.
  const handleDevelopNext = async (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node || isTerminal(node)) return;
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
    }
  };

  // Sketches one node. It builds on the nearest sketched ancestor rather than
  // the direct parent, since with sparse sketching the parent usually has none.
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
      const reference = nearestSketchedAncestor(nodes, node)?.image ?? null;
      const image = await generateSketch(apiKey, problem.trim(), node, reference);
      patchNode(nodeId, { image, imageStatus: "idle" });
    } catch (err) {
      patchNode(nodeId, {
        imageStatus: "error",
        imageError: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Draws the root and the end of each played-out future — the points worth
  // comparing — and leaves every other node to an explicit request. This runs
  // entirely beside the develop/debate pipeline, so nodes never wait on a
  // drawing, and several drawings can be in flight at once.
  //
  // The one ordering rule: a sketch builds on the nearest sketched ancestor,
  // so a node only becomes eligible once every ancestor that is also due a
  // sketch has settled (has an image, or failed to get one — otherwise a
  // failed ancestor would strand everything below it).
  useEffect(() => {
    if (!autoSketch) return;
    const all = Object.values(nodes);
    const inFlight = all.filter((n) => n.imageStatus === "loading").length;
    const slots = MAX_CONCURRENT_SKETCHES - inFlight;
    if (slots <= 0) return;

    const settled = (n: IdeaNode) => Boolean(n.image) || Boolean(n.imageError);
    const ancestorsSettled = (n: IdeaNode) => {
      let current = n.parentId ? nodes[n.parentId] : undefined;
      while (current) {
        if (wantsAutoSketch(current) && !settled(current)) return false;
        current = current.parentId ? nodes[current.parentId] : undefined;
      }
      return true;
    };

    const ready = all
      .filter(wantsAutoSketch)
      .filter((n) => !n.image && n.imageStatus === "idle" && !n.imageError)
      .filter(ancestorsSettled)
      .sort((a, b) => a.depth - b.depth)
      .slice(0, slots);

    for (const node of ready) void handleVisualize(node.id);
    // handleVisualize is recreated each render; keying on it would re-fire the
    // effect constantly, and the guards above already make it idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, autoSketch]);

  // Plays out alternate futures from a node. All three of its outcomes are
  // developed, then every new node branches into FUTURE_BRANCHING outcomes —
  // its suggested winner and a contrasting one — for FUTURE_STEPS steps in
  // total, or until a branch stops. So both sides of each argument are played
  // forward, rather than one line of whichever side the judge favoured.
  //
  // Every node is developed and debated on its own, exactly as if the designer
  // had clicked through — nothing is written ahead knowing where the story
  // ends. Branches run in parallel (the call limiter queues the excess), and
  // nodes that already exist are reused rather than regenerated.
  const handlePlayFutures = async (fromId: string) => {
    const start = nodes[fromId];
    if (!start || isTerminal(start) || playingFrom) return;
    setPlayingFrom(fromId);
    try {
      const debated = start.debate ? start : await ensureDebate(fromId);
      if (!debated?.debate) return;
      const base: NodeMap = { ...nodes, [fromId]: debated };
      await Promise.all(
        OUTCOMES.map((outcome) => playOutFrom(base, fromId, outcome, FUTURE_STEPS, true))
      );
    } finally {
      setPlayingFrom(null);
    }
  };

  // Develops one outcome, then recurses into its picks. `mainLine` follows the
  // top pick at every step; only where that line ends is marked as a future's
  // end (and so sketched automatically) — sketching every leaf would cost an
  // image per leaf.
  const playOutFrom = async (
    base: NodeMap,
    parentId: string,
    outcome: Outcome,
    stepsLeft: number,
    mainLine: boolean
  ): Promise<void> => {
    // A local mirror of this branch of the tree: state updates don't land in
    // `nodes` until React re-renders, so each step reads from here.
    let map = base;
    const parent = map[parentId];
    const existingId = parent.childByOutcome[outcome];
    let child = existingId ? map[existingId] ?? null : null;
    if (!child) {
      child = await handleDevelop(parentId, outcome, map);
      if (!child) return;
      map = {
        ...map,
        [parentId]: { ...parent, childByOutcome: { ...parent.childByOutcome, [outcome]: child.id } },
        [child.id]: child,
      };
    }

    const markEnd = () => {
      if (mainLine && child) patchNode(child.id, { futureEnd: true });
    };
    if (stepsLeft <= 1 || isTerminal(child)) return markEnd();

    const debated = child.debate ? child : await ensureDebate(child.id, map);
    if (!debated?.debate) return markEnd();
    map = { ...map, [child.id]: debated };

    const picks = futurePicks(debated);
    await Promise.all(
      picks.map((pick, i) => playOutFrom(map, debated.id, pick, stepsLeft - 1, mainLine && i === 0))
    );
  };

  // Overrides a stop: the branch carries on, starting with the debate it
  // skipped.
  const handleResume = (id: string) => {
    const node = nodes[id];
    if (!node) return;
    const resumed = { ...node, resumed: true };
    patchNode(id, { resumed: true });
    void ensureDebate(id, { ...nodes, [id]: resumed });
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
              Shifts how deep each consideration cuts and how far your side pushes.
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
            <div className="p8-sides">
              <p>
                <strong>You</strong> <span className="p8-hint">(arguing for the idea)</span> —{" "}
                {pairId === "auto"
                  ? "a perspective the model chooses."
                  : `${debaterPair(pairId).pro.role}, who ${debaterPair(pairId).pro.stance}.`}
              </p>
              <p>
                <strong>Opponent</strong> <span className="p8-hint">(challenging it)</span> —{" "}
                {pairId === "auto"
                  ? "a stakeholder the model picks for each point."
                  : `${debaterPair(pairId).con.role}, who ${debaterPair(pairId).con.stance}.`}
              </p>
            </div>
            <p className="p8-hint">
              Each point up for debate is raised from inside the opponent's expertise. Switch
              pairs partway through to re-argue a later node from a different lens and compare the
              two branches.
            </p>
            <label className="p8-checkbox">
              <input
                type="checkbox"
                checked={autoSketch}
                onChange={(e) => setAutoSketch(e.target.checked)}
              />
              Sketch the root and the end of each future automatically
              <span className="p8-hint">
                One image call each. Any other node can be sketched on demand from its picture
                button.
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
            onClearSelection={() => setSelectedId(null)}
            onDevelopNext={(id) => void handleDevelopNext(id)}
            onPort={(id, outcome) => void handlePort(id, outcome)}
            onVisualize={(id) => void handleVisualize(id)}
            onPlayFutures={() => selectedId && void handlePlayFutures(selectedId)}
            playing={playingFrom !== null}
            canPlay={selected ? !isTerminal(selected) : false}
          />

          {selected && (
            <NodePanel
              nodes={nodes}
              node={selected}
              path={pathTo(nodes, selected.id)}
              playing={playingFrom !== null}
              onPlayFutures={() => void handlePlayFutures(selected.id)}
              onResume={() => handleResume(selected.id)}
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
