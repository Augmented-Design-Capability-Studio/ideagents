import type { ConstraintResult } from "../../massing/implications";
import type { Constraint } from "../../massing/types";
import type { Configuration, ComparisonRow } from "../types";

interface Props {
  rows: ComparisonRow[];
  configs: Configuration[];
  constraints: Constraint[];
  constraintsByConfig: Record<string, ConstraintResult[]>;
}

function format(value: number | null, unit: string): string {
  if (value === null) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

export function ComparisonTable({ rows, configs, constraints, constraintsByConfig }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="p7-section">
      <div className="section-header">
        <h2>Compare configurations</h2>
      </div>
      <p className="p7-hint">
        Best value is highlighted only where the model said which direction is better — a blank
        highlight means it's a neutral fact, not a tie.
      </p>

      <div className="p7-table-scroll">
        <table className="p7-table">
          <thead>
            <tr>
              <th>Metric</th>
              {configs.map((c) => (
                <th key={c.id}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.label}
                  {row.betterWhen !== "none" && (
                    <span className="p7-hint"> ({row.betterWhen} is better)</span>
                  )}
                </td>
                {configs.map((c) => {
                  const cell = row.cells.find((x) => x.configId === c.id);
                  return (
                    <td
                      key={c.id}
                      className={`${cell?.best ? "p7-best" : ""} ${
                        cell?.warning ? "p7-cell-warn" : ""
                      }`}
                      title={cell?.warning ?? undefined}
                    >
                      {format(cell?.value ?? null, row.unit)}
                    </td>
                  );
                })}
              </tr>
            ))}

            {constraints.length > 0 && (
              <tr className="p7-table-divider">
                <td colSpan={configs.length + 1}>
                  Constraints — a configuration past a limit isn't invalid, it's showing you what
                  sits on the other side of it
                </td>
              </tr>
            )}

            {constraints.map((constraint) => (
              <tr key={constraint.id}>
                <td>
                  {constraint.label}{" "}
                  <span className="p7-hint">
                    ({constraint.operator} {constraint.limit} {constraint.unit} · {constraint.source}
                    )
                  </span>
                </td>
                {configs.map((c) => {
                  const result = constraintsByConfig[c.id]?.find(
                    (r) => r.constraint.id === constraint.id
                  );
                  if (!result) return <td key={c.id}>—</td>;
                  return (
                    <td
                      key={c.id}
                      className={result.satisfied ? "" : "p7-cell-breaking"}
                      title={result.satisfied ? undefined : constraint.rationale}
                    >
                      {format(result.value, constraint.unit)}
                      {!result.satisfied && (
                        <span className="p7-over-by"> +{result.overByPct?.toFixed(0)}%</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
