import type { CSSProperties } from "react";
import { isTerminal, type NodeMap } from "../tree";
import {
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
  onResume: () => void;
  onWinnerChange: (winner: Outcome | null) => void;
  onDevelop: (outcome: Outcome) => void;
  onGoTo: (id: string) => void;
  onRunDebate: () => void;
}

// One side's core claim; the full argument and its falsifier stay collapsed.
function SideCard({ side, role, tone }: { side: Side; role: string; tone: "pro" | "con" }) {
  return (
    <div className={`p8-side p8-side-${tone}`}>
      <div className="p8-side-head">
        <strong>{role}</strong>
        <span className="p8-hint">{side.speaker}</span>
      </div>
      <p className="p8-claim">{side.claim}</p>
      <details className="p8-side-detail">
        <summary>Full argument</summary>
        <p className="p8-argument">{side.argument}</p>
        <p className="p8-falsifier">
          <strong>Would change its mind:</strong> {side.wouldChangeMyMind}
        </p>
      </details>
    </div>
  );
}

// Kept deliberately short: the sketch, the debate topic with its outcome, and
// the two sides' core claims. Everything else about a node is on the canvas.
export function NodePanel({
  nodes,
  node,
  onResume,
  onWinnerChange,
  onDevelop,
  onGoTo,
  onRunDebate,
}: Props) {
  const suggested = node.debate?.suggestedWinner ?? null;
  const stopped = isTerminal(node) && node.stop ? node.stop : null;
  const raisedBy = node.consideration.raisedBy || node.debate?.con.speaker || "";

  return (
    <aside className="p8-panel">
      <h2 className="p8-panel-title">{node.ideaSummary}</h2>

      {node.image ? (
        <img className="p8-sketch" src={node.image} alt={`Concept sketch: ${node.ideaSummary}`} />
      ) : (
        node.imageStatus === "loading" && (
          <div className="p8-sketch-placeholder">
            <span className="p8-dot-spinner" aria-hidden="true" />
            Drawing…
          </div>
        )
      )}

      <section className="p8-panel-part">
        <p className="p8-part-label">
          Debate topic{raisedBy && <span> · raised by {raisedBy}</span>}
        </p>
        <h3 className="p8-topic-title">{node.consideration.title}</h3>
        <p className="p8-topic-text">{node.consideration.text}</p>

        <p className="p8-part-label">Outcome</p>
        {stopped ? (
          <div
            className="p8-stop"
            style={{ "--stop": STOP_COLORS[stopped.reason] } as CSSProperties}
          >
            <strong>
              {STOP_SYMBOLS[stopped.reason]} {STOP_LABELS[stopped.reason]}
            </strong>
            {stopped.note && <p>{stopped.note}</p>}
            <button onClick={onResume}>Keep going anyway</button>
          </div>
        ) : node.status === "debating" ? (
          <p className="p8-waiting">
            <span className="p8-dot-spinner" aria-hidden="true" />
            Agents are arguing…
          </p>
        ) : !node.debate ? (
          <>
            {node.error && <p className="p8-error">{node.error}</p>}
            <button onClick={onRunDebate}>Run the debate</button>
          </>
        ) : (
          <div className="p8-outcomes">
            {node.error && <p className="p8-error">{node.error}</p>}
            {OUTCOMES.map((outcome) => {
              const childId = node.childByOutcome[outcome];
              const child = childId ? nodes[childId] : null;
              const isWinner = node.winner === outcome;
              const developing = node.developing.includes(outcome);
              return (
                <div
                  key={outcome}
                  className={`p8-outcome ${isWinner ? "p8-outcome-current" : ""}`}
                  // Same colour as this outcome's edges and dot on the canvas.
                  style={{ "--outcome": OUTCOME_COLORS[outcome] } as CSSProperties}
                >
                  <button
                    className={`p8-star ${isWinner ? "p8-star-on" : ""}`}
                    onClick={() => onWinnerChange(isWinner ? null : outcome)}
                    aria-pressed={isWinner}
                    title={isWinner ? "Unmark as winner" : "Mark as the winner"}
                  >
                    {isWinner ? "★" : "☆"}
                  </button>
                  <strong>{OUTCOME_LABELS[outcome]}</strong>
                  {suggested === outcome && !isWinner && (
                    <span className="p8-suggested-tag" title={node.debate?.suggestionReason}>
                      suggested
                    </span>
                  )}
                  {child ? (
                    <button className="p8-outcome-action" onClick={() => onGoTo(child.id)}>
                      Go to
                    </button>
                  ) : (
                    <button
                      className="p8-outcome-action"
                      onClick={() => onDevelop(outcome)}
                      disabled={developing}
                    >
                      {developing ? "Developing…" : "Develop"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {node.debate && (
        <section className="p8-panel-part">
          <p className="p8-part-label">Debate</p>
          <SideCard side={node.debate.pro} role="You" tone="pro" />
          <SideCard side={node.debate.con} role="Opponent" tone="con" />
        </section>
      )}
    </aside>
  );
}
