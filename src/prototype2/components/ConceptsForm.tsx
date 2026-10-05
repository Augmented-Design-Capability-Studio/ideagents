import { MAX_CONCEPTS, MIN_CONCEPTS } from "../config";
import type { Concept } from "../types";

interface Props {
  brief: string;
  setBrief: (v: string) => void;
  concepts: Concept[];
  setConcepts: (v: Concept[]) => void;
  onProposeAxes: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  locked: boolean;
  onFillSample: () => void;
  onEdit: () => void;
}

let nextId = 0;
function newConcept(): Concept {
  nextId += 1;
  return { id: `concept-${nextId}-${Date.now()}`, name: "", description: "" };
}

export function ConceptsForm({
  brief,
  setBrief,
  concepts,
  setConcepts,
  onProposeAxes,
  status,
  error,
  locked,
  onFillSample,
  onEdit,
}: Props) {
  const update = (id: string, patch: Partial<Concept>) => {
    setConcepts(concepts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const remove = (id: string) => {
    setConcepts(concepts.filter((c) => c.id !== id));
  };

  const add = () => {
    if (concepts.length >= MAX_CONCEPTS) return;
    setConcepts([...concepts, newConcept()]);
  };

  const readyConcepts = concepts.filter((c) => c.name.trim() && c.description.trim());
  const canPropose =
    !locked && brief.trim() && readyConcepts.length >= MIN_CONCEPTS && status !== "loading";

  return (
    <section className="p2-section">
      <div className="section-header">
        <h2>1. Brief and concepts</h2>
        {!locked && <button onClick={onFillSample}>Fill sample inputs</button>}
        {locked && <button onClick={onEdit}>Edit</button>}
      </div>
      <label className="p2-field">
        Design brief
        <textarea
          rows={2}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          disabled={locked}
          placeholder="e.g. Reduce claustrophobic feel in the rear cabin of a vehicle without changing the roofline"
        />
      </label>

      <div className="p2-concepts">
        {concepts.map((c, i) => (
          <div className="p2-concept-row" key={c.id}>
            <input
              placeholder={`Concept ${i + 1} name`}
              value={c.name}
              disabled={locked}
              onChange={(e) => update(c.id, { name: e.target.value })}
            />
            <input
              placeholder="Short description"
              value={c.description}
              disabled={locked}
              onChange={(e) => update(c.id, { description: e.target.value })}
            />
            {!locked && concepts.length > MIN_CONCEPTS && (
              <button onClick={() => remove(c.id)} title="Remove concept">
                ✕
              </button>
            )}
            {c.aiSuggested && <span className="p2-badge">AI-suggested</span>}
          </div>
        ))}
      </div>

      {!locked && (
        <div className="p2-row">
          <button onClick={add} disabled={concepts.length >= MAX_CONCEPTS}>
            + Add concept
          </button>
          <span className="p2-hint">
            {MIN_CONCEPTS}-{MAX_CONCEPTS} concepts
          </span>
        </div>
      )}

      {!locked && (
        <div className="p2-row">
          <button onClick={onProposeAxes} disabled={!canPropose}>
            {status === "loading" ? "Proposing axes…" : "Propose engineering axes"}
          </button>
        </div>
      )}
      {error && <p className="p2-error">{error}</p>}
    </section>
  );
}

export { newConcept };
