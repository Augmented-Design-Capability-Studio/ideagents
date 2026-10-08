import { useEffect, useRef } from "react";
import { expert } from "../config";
import { RESOLUTION_COLORS, RESOLUTION_LABELS, type Round } from "../types";

interface Props {
  rounds: Round[];
  children?: React.ReactNode;
}

const PROVENANCE_LABEL: Record<string, string> = {
  typed: "you wrote this",
  selected: "you picked this",
  proxy: "your proxy",
};

export function ChatView({ rounds, children }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rounds]);

  return (
    <div className="q-chat">
      {rounds.map((round) => (
        <section className="q-round" id={`round-${round.id}`} key={round.id}>
          <div className="q-round-head">
            <span className="q-expert-tag">{expert(round.expertId).role}</span>
            <strong>{round.consideration.title}</strong>
            {round.reopenedFrom && <span className="q-return-tag">taken up again</span>}
          </div>
          {round.reopenedFrom && (
            <p className="q-return-note">
              Back to a point left{" "}
              <a href={`#round-${round.reopenedFrom}`}>
                {RESOLUTION_LABELS[
                  rounds.find((r) => r.id === round.reopenedFrom)?.resolution ?? "insist"
                ].toLowerCase()}ed earlier
              </a>{" "}
              — against the idea as it now stands.
            </p>
          )}
          <p className="q-consideration">{round.consideration.text}</p>

          {round.turns.map((turn) => (
            <div
              className={`q-turn ${turn.speaker === "you" ? "q-turn-you" : "q-turn-expert"}`}
              key={turn.id}
            >
              <div className="q-turn-who">
                {turn.speaker === "you" ? "You" : expert(round.expertId).role}
                {turn.provenance && (
                  <span className="q-provenance">{PROVENANCE_LABEL[turn.provenance]}</span>
                )}
              </div>
              <p>{turn.text}</p>
            </div>
          ))}

          {round.status === "thinking" && (
            <p className="q-waiting">
              <span className="q-dot-spinner" aria-hidden="true" />
              {expert(round.expertId).role} is thinking…
            </p>
          )}
          {round.status === "resolving" && (
            <p className="q-waiting">
              <span className="q-dot-spinner" aria-hidden="true" />
              Working out what that does to the idea…
            </p>
          )}
          {round.error && <p className="q-error">{round.error}</p>}

          {round.resolution && (
            <div
              className="q-resolution"
              style={{ borderColor: RESOLUTION_COLORS[round.resolution] }}
            >
              <span
                className="q-resolution-tag"
                style={{ background: RESOLUTION_COLORS[round.resolution] }}
              >
                You {RESOLUTION_LABELS[round.resolution].toLowerCase()}ed
              </span>
              {round.whatChanged && <p className="q-what-changed">{round.whatChanged}</p>}
              {round.summaryAfter && (
                <p className="q-idea-update">The idea is now: {round.summaryAfter}</p>
              )}
            </div>
          )}
        </section>
      ))}

      {children}
      <div ref={endRef} />
    </div>
  );
}
