import { useState } from "react";
import type { Axis, Concept, QualitativeRatings } from "../types";

interface Props {
  concepts: Concept[];
  axes: Axis[];
  setAxes: (v: Axis[]) => void;
  ratings: QualitativeRatings;
  setRatings: (v: QualitativeRatings) => void;
  disabled: boolean;
}

interface PairwiseSession {
  pairs: [string, string][];
  index: number;
  results: Record<number, "a" | "b" | "tie">;
}

function allPairs(ids: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
  }
  return pairs;
}

let nextAxisId = 0;

export function QualitativeAxesPanel({
  concepts,
  axes,
  setAxes,
  ratings,
  setRatings,
  disabled,
}: Props) {
  const [newAxisName, setNewAxisName] = useState("");
  const [sessions, setSessions] = useState<Record<string, PairwiseSession>>({});

  const addAxis = () => {
    if (!newAxisName.trim()) return;
    nextAxisId += 1;
    const axis: Axis = {
      id: `qual-${nextAxisId}-${Date.now()}`,
      name: newAxisName.trim(),
      direction: "higher-better",
      source: "qualitative",
    };
    setAxes([...axes, axis]);
    setNewAxisName("");
  };

  const removeAxis = (id: string) => {
    setAxes(axes.filter((a) => a.id !== id));
    const rest = { ...ratings };
    delete rest[id];
    setRatings(rest);
  };

  const setRating = (axisId: string, conceptId: string, value: number) => {
    setRatings({
      ...ratings,
      [axisId]: { ...ratings[axisId], [conceptId]: value },
    });
  };

  const startPairwise = (axisId: string) => {
    setSessions({
      ...sessions,
      [axisId]: {
        pairs: allPairs(concepts.map((c) => c.id)),
        index: 0,
        results: {},
      },
    });
  };

  const answerPairwise = (axisId: string, answer: "a" | "b" | "tie") => {
    const session = sessions[axisId];
    if (!session) return;
    const results = { ...session.results, [session.index]: answer };
    const nextIndex = session.index + 1;

    if (nextIndex >= session.pairs.length) {
      // Score = 1 + 4 * win rate (ties count as half a win), so the range
      // stays within the same 1-5 scale as direct ratings.
      const wins: Record<string, number> = {};
      const played: Record<string, number> = {};
      for (const c of concepts) {
        wins[c.id] = 0;
        played[c.id] = 0;
      }
      session.pairs.forEach(([a, b], i) => {
        const r = results[i];
        played[a] += 1;
        played[b] += 1;
        if (r === "a") wins[a] += 1;
        else if (r === "b") wins[b] += 1;
        else {
          wins[a] += 0.5;
          wins[b] += 0.5;
        }
      });
      const newAxisRatings: Record<string, number> = {};
      for (const c of concepts) {
        const rate = played[c.id] > 0 ? wins[c.id] / played[c.id] : 0.5;
        newAxisRatings[c.id] = Math.round((1 + 4 * rate) * 2) / 2;
      }
      setRatings({ ...ratings, [axisId]: newAxisRatings });
      const rest = { ...sessions };
      delete rest[axisId];
      setSessions(rest);
    } else {
      setSessions({ ...sessions, [axisId]: { ...session, index: nextIndex, results } });
    }
  };

  return (
    <section className="p2-section">
      <h2>3. Qualitative axes</h2>
      <p className="p2-hint">
        Add axes the LLM wouldn't know about (e.g. "feels handmade") and rate concepts
        directly, or use pairwise comparisons instead.
      </p>

      {!disabled && (
        <div className="p2-row">
          <input
            placeholder="New qualitative axis, e.g. Feels handmade"
            value={newAxisName}
            onChange={(e) => setNewAxisName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAxis()}
          />
          <button onClick={addAxis} disabled={!newAxisName.trim()}>
            + Add axis
          </button>
        </div>
      )}

      {axes.map((axis) => {
        const session = sessions[axis.id];
        return (
          <div className="p2-qual-axis" key={axis.id}>
            <div className="p2-row">
              <strong>{axis.name}</strong>
              {!disabled && (
                <>
                  <button onClick={() => removeAxis(axis.id)}>Remove</button>
                  <button onClick={() => startPairwise(axis.id)} disabled={concepts.length < 2}>
                    Rate by pairwise comparison
                  </button>
                </>
              )}
            </div>

            {session ? (
              <PairwiseCompare
                concepts={concepts}
                session={session}
                onAnswer={(answer) => answerPairwise(axis.id, answer)}
              />
            ) : (
              <div className="p2-ratings">
                {concepts.map((c) => (
                  <label className="p2-rating-row" key={c.id}>
                    {c.name}
                    <select
                      disabled={disabled}
                      value={ratings[axis.id]?.[c.id] ?? ""}
                      onChange={(e) => setRating(axis.id, c.id, Number(e.target.value))}
                    >
                      <option value="" disabled>
                        rate 1-5
                      </option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function PairwiseCompare({
  concepts,
  session,
  onAnswer,
}: {
  concepts: Concept[];
  session: PairwiseSession;
  onAnswer: (answer: "a" | "b" | "tie") => void;
}) {
  const [aId, bId] = session.pairs[session.index];
  const a = concepts.find((c) => c.id === aId);
  const b = concepts.find((c) => c.id === bId);
  if (!a || !b) return null;

  return (
    <div className="p2-pairwise">
      <p className="p2-hint">
        Comparison {session.index + 1} of {session.pairs.length}
      </p>
      <div className="p2-pairwise-choices">
        <button onClick={() => onAnswer("a")}>{a.name}</button>
        <button onClick={() => onAnswer("tie")}>Tie</button>
        <button onClick={() => onAnswer("b")}>{b.name}</button>
      </div>
    </div>
  );
}
