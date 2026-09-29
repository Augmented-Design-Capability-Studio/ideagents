import { useMemo } from "react";
import { evaluateFormula } from "../formula";
import type { ModelSpec } from "../types";

interface Props {
  model: ModelSpec;
  values: Record<string, number>;
  setValues: (v: Record<string, number>) => void;
  assumptions: string[];
  setAssumptions: (v: string[]) => void;
}

export function ModelViewer({ model, values, setValues, assumptions, setAssumptions }: Props) {
  const results = useMemo(() => {
    const out: Record<string, { value: number | null; error: string | null }> = {};
    for (const output of model.outputs) {
      const formula = model.formulas.find((f) => f.outputId === output.id);
      if (!formula) {
        out[output.id] = { value: null, error: "No formula for this output." };
        continue;
      }
      try {
        out[output.id] = { value: evaluateFormula(formula.expression, values), error: null };
      } catch (err) {
        out[output.id] = {
          value: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return out;
  }, [model, values]);

  if (model.notApplicable) {
    return (
      <div className="p3-model p3-model-na">
        <p>
          <strong>No quantitative model:</strong> {model.notApplicableReason}
        </p>
      </div>
    );
  }

  return (
    <div className="p3-model">
      <p className="p3-hint">Rough micro-simulation — every number here is a rough estimate.</p>

      <div className="p3-sliders">
        {model.variables.map((v) => (
          <label className="p3-slider-row" key={v.id}>
            <span>
              {v.name} ({v.unit || "unitless"})
            </span>
            <input
              type="range"
              min={v.min}
              max={v.max}
              step={(v.max - v.min) / 100 || 1}
              value={values[v.id] ?? v.default}
              onChange={(e) => setValues({ ...values, [v.id]: Number(e.target.value) })}
            />
            <span className="p3-slider-value">{(values[v.id] ?? v.default).toFixed(2)}</span>
          </label>
        ))}
      </div>

      <div className="p3-outputs">
        {model.outputs.map((o) => {
          const r = results[o.id];
          return (
            <div className="p3-output" key={o.id}>
              <span>{o.name}:</span>{" "}
              {r?.error ? (
                <span className="p3-error">{r.error}</span>
              ) : (
                <strong>
                  {r?.value?.toFixed(2)} {o.unit}
                </strong>
              )}
            </div>
          );
        })}
      </div>

      <div className="p3-assumptions">
        <strong>Assumptions (edit freely):</strong>
        {assumptions.map((a, i) => (
          <div className="p3-assumption-row" key={i}>
            <input
              value={a}
              onChange={(e) => {
                const next = [...assumptions];
                next[i] = e.target.value;
                setAssumptions(next);
              }}
            />
            <button onClick={() => setAssumptions(assumptions.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => setAssumptions([...assumptions, ""])}>+ Add assumption</button>
      </div>
    </div>
  );
}
