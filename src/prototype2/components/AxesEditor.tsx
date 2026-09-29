import type { Axis } from "../types";

interface Props {
  axes: Axis[];
  setAxes: (v: Axis[]) => void;
  onEstimate: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  locked: boolean;
}

export function AxesEditor({ axes, setAxes, onEstimate, status, error, locked }: Props) {
  if (axes.length === 0) return null;

  const update = (id: string, patch: Partial<Axis>) => {
    setAxes(axes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const remove = (id: string) => {
    setAxes(axes.filter((a) => a.id !== id));
  };

  return (
    <section className="p2-section">
      <h2>2. Engineering axes</h2>
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
    </section>
  );
}
