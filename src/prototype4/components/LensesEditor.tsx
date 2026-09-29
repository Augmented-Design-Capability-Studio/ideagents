import { useState } from "react";
import type { Lens } from "../types";

interface Props {
  lenses: Lens[];
  setLenses: (v: Lens[]) => void;
}

let nextId = 0;

export function LensesEditor({ lenses, setLenses }: Props) {
  const [draft, setDraft] = useState("");

  if (lenses.length === 0) return null;

  const remove = (id: string) => setLenses(lenses.filter((l) => l.id !== id));

  const add = () => {
    if (!draft.trim()) return;
    nextId += 1;
    setLenses([...lenses, { id: `lens-${nextId}-${Date.now()}`, name: draft.trim() }]);
    setDraft("");
  };

  return (
    <>
      <p className="p4-hint">Proposed for this concept. Add or remove before generating questions.</p>
      <div className="p4-lenses">
        {lenses.map((l) => (
          <span className="p4-lens-chip" key={l.id}>
            {l.name}
            <button onClick={() => remove(l.id)} title="Remove lens">
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="p4-row">
        <input
          placeholder="Add a lens"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add} disabled={!draft.trim()}>
          + Add
        </button>
      </div>
    </>
  );
}
