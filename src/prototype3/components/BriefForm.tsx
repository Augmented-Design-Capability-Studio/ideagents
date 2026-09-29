import { MAX_GOALS, MIN_GOALS } from "../config";
import type { Goal } from "../types";

interface Props {
  brief: string;
  setBrief: (v: string) => void;
  concept: string;
  setConcept: (v: string) => void;
  goals: Goal[];
  setGoals: (v: Goal[]) => void;
  locked: boolean;
  onFillSample: () => void;
}

let nextId = 0;
export function newGoal(): Goal {
  nextId += 1;
  return { id: `goal-${nextId}-${Date.now()}`, text: "" };
}

export function BriefForm({
  brief,
  setBrief,
  concept,
  setConcept,
  goals,
  setGoals,
  locked,
  onFillSample,
}: Props) {
  const updateGoal = (id: string, text: string) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, text } : g)));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  return (
    <section className="p3-section">
      <div className="section-header">
        <h2>1. Brief, concept, and goals</h2>
        {!locked && <button onClick={onFillSample}>Fill sample inputs</button>}
      </div>
      <label className="p3-field">
        Design brief
        <textarea
          rows={2}
          value={brief}
          disabled={locked}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Improve museum experience for visually impaired users"
        />
      </label>
      <label className="p3-field">
        Chosen concept description
        <textarea
          rows={2}
          value={concept}
          disabled={locked}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="The concept you've already chosen to develop"
        />
      </label>

      <div className="p3-goals">
        {goals.map((g, i) => (
          <div className="p3-goal-row" key={g.id}>
            <input
              placeholder={`Qualitative goal ${i + 1}, e.g. "feels open"`}
              value={g.text}
              disabled={locked}
              onChange={(e) => updateGoal(g.id, e.target.value)}
            />
            {!locked && goals.length > MIN_GOALS && (
              <button onClick={() => removeGoal(g.id)}>✕</button>
            )}
          </div>
        ))}
      </div>
      {!locked && (
        <div className="p3-row">
          <button
            onClick={() => setGoals([...goals, newGoal()])}
            disabled={goals.length >= MAX_GOALS}
          >
            + Add goal
          </button>
          <span className="p3-hint">
            {MIN_GOALS}-{MAX_GOALS} goals
          </span>
        </div>
      )}
    </section>
  );
}
