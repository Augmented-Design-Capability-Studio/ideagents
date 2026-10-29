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
import { buildDemoTree, type DemoDef, type DemoStage } from "./demo";
import { DEMOS } from "./demos";
import { createLimiter } from "./limit";
import {
  futurePicks,
  isTerminal,
  nearestSketchedAncestor,
  pathTo,
  wantsAutoSketch,
  type NodeMap,
} from "./tree";
import { OUTCOMES, type DesignerInput, type IdeaNode, type Outcome } from "./types";

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
  // Whether the tree on screen is the pre-built demo rather than a live game.
  const [isDemo, setIsDemo] = useState(false);
  const [demoLabel, setDemoLabel] = useState("");
  // Bumped whenever a new tree is loaded or started, so the canvas starts
  // fresh (view, overview, dismissed demo hints) rather than carrying state
  // over from the previous tree.
  const [treeKey, setTreeKey] = useState(0);
  // The demo's staged dead ends, keyed by node: what the designer's input
  // unlocks there. Each plays out once and is then removed.
  const [demoStages, setDemoStages] = useState<Record<string, DemoStage>>({});

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
        level: "concept",
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
        inputs: [],
        image: null,
        imageStatus: "idle",
        imageError: null,
      };
      setNodes({ [id]: root });
      setTreeKey((k) => k + 1);
      setIsDemo(false);
      setDemoStages({});
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
        inputs: [],
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

  // The "+" on a node: open the input box for it in the panel, so the designer
  // can add what they know to that node's debate.
  const [composingFor, setComposingFor] = useState<string | null>(null);
  // Clicking "+" again on the same node closes the pop-up.
  const handleOpenInput = (nodeId: string) => {
    setSelectedId(nodeId);
    setComposingFor((current) => (current === nodeId ? null : nodeId));
  };

  // Stores the designer's input on a node, then optionally acts on it:
  // "reargue" reruns the node's debate with the input in it (the marked winner
  // and any developed branches are kept); "keep" overrides a stop and argues
  // it. Plain "add" spends no call — the input still reaches every later
  // debate and develop call on this branch.
  const handleAddInput = (
    nodeId: string,
    input: { text: string; side: DesignerInput["side"] },
    action: "add" | "reargue" | "keep"
  ) => {
    const node = nodes[nodeId];
    if (!node) return;
    const added: DesignerInput = { id: `in-${Date.now().toString(36)}`, ...input };
    if (action !== "add" && demoStages[nodeId]) {
      void playStage(nodeId, added);
      return;
    }
    const updated: IdeaNode = {
      ...node,
      inputs: [...node.inputs, added],
      ...(action === "reargue" ? { debate: null, status: "ready" as const, error: null } : {}),
      ...(action === "keep" ? { resumed: true, debate: null, status: "ready" as const } : {}),
    };
    setNodes((prev) =>
      prev[nodeId]
        ? {
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              inputs: updated.inputs,
              ...(action === "add" ? {} : { debate: null, status: "ready" as const, error: null }),
              ...(action === "keep" ? { resumed: true } : {}),
            },
          }
        : prev
    );
    setComposingFor(null);
    if (action !== "add") void ensureDebate(nodeId, { ...nodes, [nodeId]: updated });
  };

  // Plays out a staged demo dead end once the designer has added input there:
  // the node is re-argued with the input, then the hidden branch appears node
  // by node — developed, then debated — the way a live game would grow it,
  // with the canvas following its main line. Pre-scripted, so no calls.
  const playStage = async (nodeId: string, input: DesignerInput) => {
    const stage = demoStages[nodeId];
    if (!stage) return;
    setDemoStages((prev) => {
      const rest = { ...prev };
      delete rest[nodeId];
      return rest;
    });
    setComposingFor(null);
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    setNodes((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        inputs: [...prev[nodeId].inputs, input],
        resumed: true,
        status: "debating",
      },
    }));
    await wait(1200);
    patchNode(nodeId, { debate: stage.debate, winner: stage.winner, status: "ready" });

    const mainLine = new Set([nodeId]);
    for (const node of stage.reveal) {
      const parentId = node.parentId as string;
      const from = node.fromOutcome as Outcome;
      await wait(450);
      setDeveloping(parentId, from, true);
      await wait(800);
      setNodes((prev) => ({
        ...prev,
        [parentId]: {
          ...prev[parentId],
          developing: prev[parentId].developing.filter((o) => o !== from),
          childByOutcome: { ...prev[parentId].childByOutcome, [from]: node.id },
        },
        [node.id]: { ...node, debate: null, status: node.debate ? "debating" : "ready" },
      }));
      // Follow the line the designer would: each node's winner.
      const parentWinner =
        parentId === nodeId ? stage.winner : stage.reveal.find((n) => n.id === parentId)?.winner;
      if (mainLine.has(parentId) && parentWinner === from) {
        mainLine.add(node.id);
        setSelectedId(node.id);
        focusNode(node.id);
      }
      if (node.debate) {
        await wait(900);
        patchNode(node.id, { debate: node.debate, status: "ready" });
      }
    }
  };

  const handleRemoveInput = (nodeId: string, inputId: string) => {
    setNodes((prev) =>
      prev[nodeId]
        ? {
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              inputs: prev[nodeId].inputs.filter((i) => i.id !== inputId),
            },
          }
        : prev
    );
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
    // No key means no drawing — and no Agent dialog popping up on its own, which
    // is what loading the demo without a key would otherwise do.
    if (!autoSketch || !getApiKey()) return;
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
    // A staged demo dead end is unlocked by the designer's input, so "keep
    // going" there opens the input pop-up instead.
    if (demoStages[id]) {
      handleOpenInput(id);
      return;
    }
    const resumed = { ...node, resumed: true };
    patchNode(id, { resumed: true });
    void ensureDebate(id, { ...nodes, [id]: resumed });
  };

  // Loads a pre-built demo tree: no key and no calls needed to explore it.
  // It's an ordinary tree, so with a key any open node can be developed on.
  const loadDemo = (def: DemoDef) => {
    const demo = buildDemoTree(def);
    setProblem(def.problem);
    setSeed(def.seed);
    setPairId(def.pairId);
    setDemoLabel(def.label);
    setNodes(demo.nodes);
    setTreeKey((k) => k + 1);
    setDemoStages(demo.stages);
    setRootId(demo.rootId);
    setSelectedId(demo.rootId);
    setFocus(null);
    setStartError(null);
    setIsDemo(true);
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

      {/* Start / Load demo stay out in the open; the inputs that feed them
          are folded away so the canvas and panel get the screen. */}
      <div className="p8-actionbar">
        <button
          className="p8-primary-action"
          onClick={() => void handleStart()}
          disabled={!problem.trim() || !seed.trim() || startStatus === "loading"}
        >
          {startStatus === "loading" ? "Opening…" : rootId ? "Start over" : "Start the game"}
        </button>
        {DEMOS.map((def) => (
          <button
            key={def.id}
            onClick={() => loadDemo(def)}
            title={`A pre-built tree: ${def.label}. No API key or calls needed.`}
          >
            Demo: {def.label}
          </button>
        ))}
        {isDemo && (
          <span className="p8-demo-note">
            <strong>Demo — {demoLabel}</strong>: pre-built, no calls used. With an API key you can
            keep developing from any open node.
          </span>
        )}
        {startError && <span className="p8-error">{startError}</span>}
      </div>

      <div className="p8-folds">
        <details className="p8-fold">
          <summary>
            <strong>Problem and seed idea</strong>
            <span className="p8-fold-preview">{seed}</span>
          </summary>
          <div className="p8-fold-body">
            <select value="" onChange={(e) => loadSample(e.target.value)}>
              <option value="">Load a sample…</option>
              {SAMPLES.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="p8-field">
              Problem
              <textarea rows={2} value={problem} onChange={(e) => setProblem(e.target.value)} />
            </label>
            <label className="p8-field">
              Seed idea
              <textarea rows={2} value={seed} onChange={(e) => setSeed(e.target.value)} />
            </label>
          </div>
        </details>

        <details className="p8-fold">
          <summary>
            <strong>Setup</strong>
            <span className="p8-fold-preview">
              Radicality {radicality}/5 · {debaterPair(pairId).label}
            </span>
          </summary>
          <div className="p8-fold-body p8-controls">
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
          </div>
        </details>
      </div>

      <div className={`p8-progress ${busy ? "p8-progress-on" : ""}`} aria-hidden="true">
        <span />
      </div>

      {rootId && (
        <div className="p8-board">
          <TreeView
            key={treeKey}
            nodes={nodes}
            rootId={rootId}
            selectedId={selectedId}
            focus={focus}
            onSelect={handleSelect}
            onClearSelection={() => {
              setSelectedId(null);
              setComposingFor(null);
            }}
            composingFor={composingFor}
            inputHints={Object.fromEntries(
              Object.entries(demoStages).map(([id, stage]) => [id, stage.suggestedInput])
            )}
            onOpenInput={handleOpenInput}
            onCloseInput={() => setComposingFor(null)}
            onAddInput={handleAddInput}
            onRemoveInput={handleRemoveInput}
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
              onResume={() => handleResume(selected.id)}
              onWinnerChange={(winner) => patchNode(selected.id, { winner })}
              onDevelop={(outcome) => void handleDevelop(selected.id, outcome)}
              onGoTo={(id) => {
                handleSelect(id);
                focusNode(id);
              }}
              onRunDebate={() => void ensureDebate(selected.id)}
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
