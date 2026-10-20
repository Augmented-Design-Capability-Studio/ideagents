import type { CSSProperties } from "react";
import { FUTURE_NODES, FUTURE_STEPS } from "../config";
import { isTerminal, type NodeMap } from "../tree";
import {
  LEVEL_FOCUS,
  LEVEL_LABELS,
  OUTCOMES,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  STOP_COLORS,
  STOP_LABELS,
  STOP_SYMBOLS,
  type IdeaNode,
  type Outcome,
  type Side,
} from "../types";

interface Props {
  nodes: NodeMap;
  node: IdeaNode;
  // Root to this node, inclusive — for the "How it got here" trace.
  path: IdeaNode[];
  playing: boolean;
  onPlayFutures: () => void;
  onResume: () => void;
  onWinnerChange: (winner: Outcome | null) => void;
  onDevelop: (outcome: Outcome) => void;
  onGoTo: (id: string) => void;
  onRunDebate: () => void;
  onVisualize: () => void;
  onNoteChange: (text: string) => void;
}

// The claim is what you rule on; the full argument and the falsifier are
// there when you want them, collapsed when you don't.
function SideCard({ side, role, tone }: { side: Side; role: string; tone: "pro" | "con" }) {
  return (
    <div className={`p8-side p8-side-${tone}`}>
      <div className="p8-side-head">
        <strong>{role}</strong>
        <span className="p8-hint">{side.speaker}</span>
      </div>
      <p className="p8-claim">{side.claim}</p>
      <details className="p8-side-detail">
        <summary>Argument</summary>
        <p className="p8-argument">{side.argument}</p>
        <p className="p8-falsifier">
          <strong>Would change its mind:</strong> {side.wouldChangeMyMind}
        </p>
      </details>
    </div>
  );
}

export function NodePanel({
  nodes,
  node,
  path,
  playing,
  onPlayFutures,
  onResume,
  onWinnerChange,
  onDevelop,
  onGoTo,
  onRunDebate,
  onVisualize,
  onNoteChange,
}: Props) {
  const suggested = node.debate?.suggestedWinner ?? null;
  const terminal = isTerminal(node);

  return (
    <aside className="p8-panel">
      <div className="section-header p8-panel-header">
        <h2>Node properties</h2>
        <span className="p8-hint">
          Depth {node.depth}
          {node.fromOutcome ? ` · via ${OUTCOME_LABELS[node.fromOutcome].toLowerCase()}` : " · root"}
        </span>
      </div>

      <p className="p8-level">
        <strong>{LEVEL_LABELS[node.level]} level</strong> — {LEVEL_FOCUS[node.level]}
      </p>

      {node.stop && (
        <div
          className="p8-stop"
          style={{ "--stop": STOP_COLORS[node.stop.reason] } as CSSProperties}
        >
          <strong>
            {STOP_SYMBOLS[node.stop.reason]} {node.resumed ? "Was stopped" : "Branch stopped"}:{" "}
            {STOP_LABELS[node.stop.reason]}
          </strong>
          {node.stop.note && <p>{node.stop.note}</p>}
          {node.resumed ? (
            <p className="p8-hint">You chose to keep going.</p>
          ) : (
            <button onClick={onResume}>Keep going anyway</button>
          )}
        </div>
      )}

      <h3 className="p8-node-heading">{node.consideration.title}</h3>
      <p className="p8-consideration">{node.consideration.text}</p>

      <h3>Idea at this node</h3>
      <p className="p8-idea-state">{node.ideaState}</p>
      {node.carriedForward && (
        <p className="p8-carried">
          <strong>Carried forward:</strong> {node.carriedForward}
        </p>
      )}
      {node.whatChanged && (
        <p className="p8-what-changed">
          <strong>What this move changed:</strong> {node.whatChanged}
        </p>
      )}

      {path.length > 1 && (
        <details className="p8-trace-list" open>
          <summary>How it got here ({path.length - 1} step{path.length === 2 ? "" : "s"})</summary>
          <ol>
            {path.map((step, i) => {
              const before = i > 0 ? path[i - 1] : null;
              return (
                <li key={step.id} className={step.id === node.id ? "p8-trace-current" : ""}>
                  {before && step.fromOutcome && (
                    <span
                      className="p8-trace-move"
                      style={{ color: OUTCOME_COLORS[step.fromOutcome] }}
                    >
                      {OUTCOME_LABELS[step.fromOutcome]} on “{before.consideration.title}”
                      {step.level !== before.level && ` · ↓ ${LEVEL_LABELS[step.level]}`}
                    </span>
                  )}
                  <button className="p8-trace-step" onClick={() => onGoTo(step.id)}>
                    <span className="p8-trace-level">{LEVEL_LABELS[step.level]}</span>
                    {step.ideaSummary}
                  </button>
                </li>
              );
            })}
          </ol>
        </details>
      )}

      <div className="p8-sketch-head">
        <h3>Sketch</h3>
        <button onClick={onVisualize} disabled={node.imageStatus === "loading"}>
          {node.imageStatus === "loading"
            ? "Sketching…"
            : node.image
              ? "Redraw"
              : "Sketch this idea"}
        </button>
      </div>
      {node.imageError && <p className="p8-error">{node.imageError}</p>}
      {node.imageStatus === "loading" && (
        <div className="p8-sketch-placeholder">
          <span className="p8-dot-spinner" aria-hidden="true" />
          Drawing…
        </div>
      )}
      {node.image ? (
        <img className="p8-sketch" src={node.image} alt={`Concept sketch: ${node.ideaSummary}`} />
      ) : (
        node.imageStatus !== "loading" && (
          <p className="p8-hint">
            {node.parentId
              ? "Builds on the nearest sketched node above it, so the branch reads as one idea evolving."
              : "A loose concept sketch of the idea, to think with — not a render."}
          </p>
        )
      )}

      <h3>Debate</h3>
      {node.status === "debating" && (
        <p className="p8-waiting">
          <span className="p8-dot-spinner" aria-hidden="true" />
          Agents are arguing…
        </p>
      )}
      {node.error && <p className="p8-error">{node.error}</p>}
      {terminal ? (
        <p className="p8-hint">Not debated — this branch stopped here.</p>
      ) : (
        !node.debate &&
        node.status !== "debating" && <button onClick={onRunDebate}>Run the debate</button>
      )}

      {node.debate && (
        <>
          <SideCard side={node.debate.pro} role="You · for the idea" tone="pro" />
          <SideCard side={node.debate.con} role="Opponent" tone="con" />

          <h3>Outcomes</h3>
          {suggested && (
            <p className="p8-suggestion">
              <strong>Suggested winner: {OUTCOME_LABELS[suggested]}.</strong>{" "}
              {node.debate.suggestionReason}
            </p>
          )}
          <p className="p8-hint">
            Developing a case and marking the winner are separate. Every developed branch is kept;
            the winner is the live one, and changing it throws nothing away.
          </p>
          <div className="p8-outcomes">
            {OUTCOMES.map((outcome) => {
              const childId = node.childByOutcome[outcome];
              const child = childId ? nodes[childId] : null;
              const isWinner = node.winner === outcome;
              return (
                <div
                  className={`p8-outcome ${isWinner ? "p8-outcome-current" : ""}`}
                  // Same colour as this outcome's edges and dot on the canvas.
                  style={{ "--outcome": OUTCOME_COLORS[outcome] } as CSSProperties}
                  key={outcome}
                >
                  <div className="p8-outcome-head">
                    <strong>{OUTCOME_LABELS[outcome]}</strong>
                    {isWinner && <span className="p8-live-tag">winner</span>}
                    {suggested === outcome && !isWinner && (
                      <span className="p8-suggested-tag">suggested</span>
                    )}
                    <button
                      className={`p8-winner-toggle ${isWinner ? "p8-winner-on" : ""}`}
                      onClick={() => onWinnerChange(isWinner ? null : outcome)}
                      aria-pressed={isWinner}
                      title={isWinner ? "Unmark as winner" : "Mark this case as the winner"}
                    >
                      {isWinner ? "★ Winner" : "☆ Mark winner"}
                    </button>
                  </div>
                  {child ? (
                    <div className="p8-outcome-body">
                      <span className="p8-hint">Developed — {child.consideration.title}</span>
                      <button onClick={() => onGoTo(child.id)}>Go to branch</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDevelop(outcome)}
                      disabled={node.developing.includes(outcome)}
                    >
                      {node.developing.includes(outcome) ? "Developing…" : "Develop this outcome"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p8-futures">
            <button onClick={onPlayFutures} disabled={playing || terminal}>
              {playing ? "Playing out futures…" : "Play out futures from here"}
            </button>
            <p className="p8-hint">
              Plays all three outcomes {FUTURE_STEPS} steps ahead, branching into two outcomes at
              every step — the suggested winner and a contrasting one. Each node is developed and
              debated on its own: up to {FUTURE_NODES} nodes, ~{FUTURE_NODES * 2} calls. Branches
              end early if they stop.
            </p>
          </div>
        </>
      )}

      <h3>Note</h3>
      <textarea
        className="p8-note"
        rows={2}
        value={node.note}
        placeholder="Why this case won…"
        onChange={(e) => onNoteChange(e.target.value)}
      />
    </aside>
  );
}
