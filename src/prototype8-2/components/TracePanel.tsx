import { expert } from "../config";
import { RESOLUTION_COLORS, RESOLUTION_LABELS, type IdeaVersion, type Round } from "../types";

interface Props {
  versions: IdeaVersion[];
  rounds: Round[];
  onRedraw: () => void;
  onReopen: (roundId: string) => void;
  canReopen: boolean;
}

export function TracePanel({ versions, rounds, onRedraw, onReopen, canReopen }: Props) {
  const current = versions[versions.length - 1];
  const resolved = rounds.filter((r) => r.resolution);

  return (
    <aside className="q-rail">
      {/* Pinned, because if the idea only lives in the chat scrollback you lose
          sight of what you're actually arguing about. */}
      <section className="q-rail-section q-idea">
        <div className="section-header">
          <h2>The idea</h2>
          <div className="q-idea-head">
            <span className="q-hint">v{current?.version ?? 1}</span>
            <button onClick={onRedraw} disabled={current?.imageStatus === "loading"}>
              {current?.imageStatus === "loading" ? "Drawing…" : "Redraw"}
            </button>
          </div>
        </div>

        {current?.image ? (
          <img className="q-idea-sketch" src={current.image} alt={`Sketch of ${current.summary}`} />
        ) : (
          current?.imageStatus === "loading" && (
            <div className="q-idea-sketch-placeholder">
              <span className="q-dot-spinner" aria-hidden="true" />
              drawing…
            </div>
          )
        )}
        {current?.imageError && <p className="q-hint">Sketch failed: {current.imageError}</p>}

        <p className="q-idea-text">{current?.text}</p>
      </section>

      <section className="q-rail-section">
        <div className="section-header">
          <h2>Argued so far</h2>
          <span className="q-hint">
            {resolved.length} of {rounds.length}
          </span>
        </div>
        {resolved.length === 0 ? (
          <p className="q-hint">Nothing settled yet.</p>
        ) : (
          <ol className="q-trace">
            {resolved.map((round) => {
              const returnedTo = rounds.find((r) => r.reopenedFrom === round.id);
              return (
              <li className="q-trace-item" key={round.id}>
                <a href={`#round-${round.id}`}>
                  <div className="q-trace-head">
                    <strong>{round.consideration.title}</strong>
                    {round.resolution && (
                      <span
                        className="q-trace-tag"
                        style={{ background: RESOLUTION_COLORS[round.resolution] }}
                      >
                        {RESOLUTION_LABELS[round.resolution]}
                      </span>
                    )}
                  </div>
                  <span className="q-hint">
                    {expert(round.expertId).role} ·{" "}
                    {round.turns.filter((t) => t.speaker === "you").length} from you
                  </span>
                  {round.carriedForward && (
                    <p className="q-trace-carried">Kept: {round.carriedForward}</p>
                  )}
                </a>
                {/* Not a rewind — the point comes back against the current
                    version, and this round stays exactly as it was. */}
                {returnedTo ? (
                  <a className="q-trace-returned" href={`#round-${returnedTo.id}`}>
                    ↩ taken up again later
                  </a>
                ) : (
                  <button
                    className="q-trace-reopen"
                    disabled={!canReopen}
                    onClick={() => onReopen(round.id)}
                    title="Put this point back on the table against the idea as it now stands"
                  >
                    Take it up again
                  </button>
                )}
              </li>
              );
            })}
          </ol>
        )}
      </section>

    </aside>
  );
}
