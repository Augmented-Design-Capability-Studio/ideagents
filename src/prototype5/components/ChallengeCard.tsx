import { dialLevelInfo } from "../config";
import type { Challenge, Rating, RatingValue } from "../types";
import { IntensityDial } from "./IntensityDial";

// The dial auto-advances as soon as a challenge loads, so the dial and the
// challenge on screen are usually at different levels — this labels the one
// you're actually reading.
function LevelBadge({ level }: { level: number }) {
  const info = dialLevelInfo(level);
  return (
    <span className="p5-level-badge" style={{ background: info.color }} title={info.description}>
      Level {info.level} · {info.label}
    </span>
  );
}

interface Props {
  dialLevel: number;
  setDialLevel: (v: number) => void;
  dialEditable: boolean;
  challenge: Challenge | null;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  rating: Rating;
  onSetRatingValue: (v: RatingValue) => void;
  onSetRatingReason: (v: string) => void;
  onRespond: () => void;
  onSkip: () => void;
  onRegenerate: () => void;
  sessionEnded: boolean;
}

export function ChallengeCard({
  dialLevel,
  setDialLevel,
  dialEditable,
  challenge,
  status,
  error,
  rating,
  onSetRatingValue,
  onSetRatingReason,
  onRespond,
  onSkip,
  onRegenerate,
  sessionEnded,
}: Props) {
  const canAct = status === "done" && rating.value !== null && !sessionEnded;

  return (
    <section className="p5-col p5-section">
      <h2>Challenge</h2>

      <IntensityDial level={dialLevel} onChange={setDialLevel} editable={dialEditable} />

      {sessionEnded && <p className="p5-ended">Session has ended.</p>}

      {!sessionEnded && status === "loading" && <p className="p5-hint">Thinking of a challenge…</p>}
      {!sessionEnded && error && <p className="p5-error">{error}</p>}

      {!sessionEnded && challenge && status === "done" && (
        <div className="p5-challenge-box">
          <LevelBadge level={challenge.dialLevel} />
          <p className="p5-challenge-text">{challenge.text}</p>

          {challenge.evidence.length > 0 && (
            <details className="p5-reasonable">
              <summary>Why this is reasonable</summary>
              <ul>
                {challenge.evidence.map((e, i) => (
                  <li key={i}>
                    {e.text}
                    {e.link && (
                      <>
                        {" "}
                        <a href={e.link} target="_blank" rel="noopener noreferrer">
                          source
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="p5-rating">
            <span className="p5-hint">Rate this challenge (required before continuing):</span>
            <div className="p5-row">
              <button
                className={rating.value === "up" ? "p5-active" : ""}
                onClick={() => onSetRatingValue("up")}
              >
                👍 Useful
              </button>
              <button
                className={rating.value === "down" ? "p5-active" : ""}
                onClick={() => onSetRatingValue("down")}
              >
                👎 Not useful
              </button>
            </div>
            <input
              placeholder="Optional one-line reason"
              value={rating.reason}
              onChange={(e) => onSetRatingReason(e.target.value)}
            />
          </div>

          {rating.value === "down" && (
            <div className="p5-row">
              <button onClick={onRegenerate} disabled={!canAct}>
                Get a different challenge
              </button>
              <span className="p5-hint">
                Uses your reason (if any) and the current slider level.
              </span>
            </div>
          )}

          <div className="p5-row">
            <button onClick={onRespond} disabled={!canAct}>
              Respond &amp; revise
            </button>
            <button onClick={onSkip} disabled={!canAct}>
              Skip
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
