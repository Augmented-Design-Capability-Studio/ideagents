import type { Axis, Concept, EstimateTable } from "../types";

interface Props {
  axes: Axis[];
  setAxes: (v: Axis[]) => void;
  onEstimate: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  locked: boolean;
  onEdit: () => void;
  concepts: Concept[];
  estimates: EstimateTable;
}

export function AxesEditor({
  axes,
  setAxes,
  onEstimate,
  status,
  error,
  locked,
  onEdit,
  concepts,
  estimates,
}: Props) {
  if (axes.length === 0) return null;

  const update = (id: string, patch: Partial<Axis>) => {
    setAxes(axes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const remove = (id: string) => {
    setAxes(axes.filter((a) => a.id !== id));
  };

  return (
    <section className="p2-section">
      <div className="section-header">
        <h2>2. Engineering axes</h2>
        {locked && <button onClick={onEdit}>Edit</button>}
      </div>
      <p className="p2-hint">
        Proposed for this brief and these concepts. Confirm or edit before estimating.
      </p>
      <div className="p2-axes">
        {axes.map((a) => (
          <div className="p2-axis-row" key={a.id}>
            <input
              value={a.name}
              disabled={locked}
              onChange={(e) => update(a.id, { name: e.target.value })}
            />
            <select
              value={a.direction}
              disabled={locked}
              onChange={(e) =>
                update(a.id, { direction: e.target.value as Axis["direction"] })
              }
            >
              <option value="higher-better">higher is better</option>
              <option value="lower-better">lower is better</option>
            </select>
            {!locked && (
              <button onClick={() => remove(a.id)} title="Remove axis">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {!locked && (
        <div className="p2-row">
          <button onClick={onEstimate} disabled={status === "loading"}>
            {status === "loading" ? "Estimating…" : "Estimate concepts on these axes"}
          </button>
        </div>
      )}
      {error && <p className="p2-error">{error}</p>}

      {locked && (
        <div className="p2-estimates">
          <p className="p2-hint">
            Relative scores, 1 (worst) to 10 (best on that axis) — not physical units. Range is
            low-high with the best guess in parentheses; hover a cell for the model's
            justification. "—" means this concept hasn't been estimated on that axis yet.
          </p>
          <div className="p2-estimates-scroll">
            <table className="p2-estimates-table">
              <thead>
                <tr>
                  <th>Axis</th>
                  {concepts.map((c) => (
                    <th key={c.id}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {axes.map((axis) => (
                  <tr key={axis.id}>
                    <td>
                      {axis.name}
                      <span className="p2-hint"> ({axis.direction === "higher-better" ? "higher better" : "lower better"})</span>
                    </td>
                    {concepts.map((c) => {
                      const e = estimates[axis.id]?.[c.id];
                      return (
                        <td key={c.id} title={e?.justification}>
                          {e ? `${e.low}-${e.high} (${e.likely})` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
