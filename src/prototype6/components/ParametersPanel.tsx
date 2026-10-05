import type { Parameter } from "../../massing/types";

interface Props {
  parameters: Parameter[];
  values: Record<string, number>;
  setValue: (id: string, v: number) => void;
  onReset: () => void;
}

export function ParametersPanel({ parameters, values, setValue, onReset }: Props) {
  if (parameters.length === 0) return null;

  return (
    <section className="p6-section">
      <div className="section-header">
        <h2>2. Parameters</h2>
        <button onClick={onReset}>Reset</button>
      </div>
      <p className="p6-hint">
        The model's dimensions are its weakest output — these are here to be corrected.
      </p>

      <div className="p6-sliders">
        {parameters.map((p) => (
          <label className="p6-slider-row" key={p.id}>
            <span>
              {p.name} <span className="p6-hint">({p.unit})</span>
            </span>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={(p.max - p.min) / 100 || 1}
              value={values[p.id] ?? p.default}
              onChange={(e) => setValue(p.id, Number(e.target.value))}
            />
            <span className="p6-slider-value">{(values[p.id] ?? p.default).toFixed(1)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
