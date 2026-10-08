import type { NodeMap } from "../tree";
import { OUTCOMES, OUTCOME_LABELS, type IdeaNode, type Outcome, type Side } from "../types";

interface Props {
  nodes: NodeMap;
  node: IdeaNode;
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
  onWinnerChange,
  onDevelop,
  onGoTo,
  onRunDebate,
  onVisualize,
  onNoteChange,
}: Props) {
  const suggested = node.debate?.suggestedWinner ?? null;

  return (
    <aside className="p8-panel">
      <div className="section-header p8-panel-header">
        <h2>Node properties</h2>
        <span className="p8-hint">
          Depth {node.depth}
          {node.fromOutcome ? ` · via ${OUTCOME_LABELS[node.fromOutcome].toLowerCase()}` : " · root"}
        </span>
      </div>

      <h3 className="p8-node-heading">{node.consideration.title}</h3>
      <p className="p8-kind-badge">{node.consideration.kind}</p>
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
              ? "Draws from the parent's sketch, so the branch reads as one idea evolving."
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
      {!node.debate && node.status !== "debating" && (
        <button onClick={onRunDebate}>Run the debate</button>
      )}

      {node.debate && (
        <>
          <SideCard side={node.debate.pro} role="Proponent" tone="pro" />
          <SideCard side={node.debate.con} role="Skeptic" tone="con" />

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
                      disabled={node.developing !== null}
                    >
                      {node.developing === outcome ? "Developing…" : "Develop this outcome"}
                    </button>
                  )}
                </div>
              );
            })}
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
