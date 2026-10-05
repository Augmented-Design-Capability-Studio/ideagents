import { formatValue, type ImplicationRow } from "../../massing/implications";

interface Props {
  rows: ImplicationRow[];
  onEditAssumption: (rowId: string, index: number, text: string) => void;
  notes: string[];
}

export function ImplicationsPanel({ rows, onEditAssumption, notes }: Props) {
  const geometry = rows.filter((r) => r.source === "geometry");
  const model = rows.filter((r) => r.source === "model");

  return (
    <section className="p6-section">
      <div className="section-header">
        <h2>4. Engineering implications</h2>
      </div>

      <h3>Measured from the geometry</h3>
      <p className="p6-hint">Computed from the model you're looking at — no LLM involved.</p>
      <ul className="p6-implications">
        {geometry.map((row) => (
          <li className="p6-implication" key={row.id}>
            <div className="p6-implication-head">
              <span>{row.label}</span>
              <strong>{formatValue(row)}</strong>
            </div>
            {row.warning && <p className="p6-warning">{row.warning}</p>}
            {row.assumptions.map((a, i) => (
              <p className="p6-hint" key={i}>
                {a}
              </p>
            ))}
          </li>
        ))}
      </ul>

      {model.length > 0 && (
        <>
          <h3>Estimated by the model</h3>
          <p className="p6-hint">
            Formulas the model supplied, evaluated here. Edit the assumptions — they are the part
            most likely to be wrong.
          </p>
          <ul className="p6-implications">
            {model.map((row) => (
              <li className="p6-implication" key={row.id}>
                <div className="p6-implication-head">
                  <span>{row.label}</span>
                  <strong className={row.warning ? "p6-value-warn" : ""}>
                    {row.error ? "—" : formatValue(row)}
                  </strong>
                </div>
                {row.error && <p className="p6-error">{row.error}</p>}
                {row.warning && <p className="p6-warning">{row.warning}</p>}
                {row.assumptions.map((a, i) => (
                  <input
                    className="p6-assumption"
                    key={i}
                    value={a}
                    onChange={(e) => onEditAssumption(row.id, i, e.target.value)}
                  />
                ))}
              </li>
            ))}
          </ul>
        </>
      )}

      {notes.length > 0 && (
        <details className="p6-notes">
          <summary>Model notes on this interpretation</summary>
          <ul>
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
