import { getLikely } from "../analysis";
import type { Axis, Boundary, Concept, EstimateTable, QualitativeRatings } from "../types";

interface Props {
  axes: Axis[];
  concepts: Concept[];
  estimates: EstimateTable;
  qualitativeRatings: QualitativeRatings;
  boundaries: Boundary[];
  setBoundaries: (v: Boundary[]) => void;
}

export function BoundariesPanel({
  axes,
  concepts,
  estimates,
  qualitativeRatings,
  boundaries,
  setBoundaries,
}: Props) {
  const setMin = (axisId: string, min: number | null) => {
    const rest = boundaries.filter((b) => b.axisId !== axisId);
    setBoundaries(min == null ? rest : [...rest, { axisId, min }]);
  };

  const excluded = concepts
    .map((concept) => {
      const reasons = boundaries
        .map((b) => {
          const axis = axes.find((a) => a.id === b.axisId);
          if (!axis) return null;
          const value = getLikely(axis, concept.id, estimates, qualitativeRatings);
          if (value == null) return null;
          // "min" is always in goodness terms as the designer sees the axis:
          // for a lower-better axis a smaller raw value is the "good" side,
          // so the boundary is phrased as a max on the raw number instead.
          const passes =
            axis.direction === "higher-better" ? value >= b.min : value <= b.min;
          return passes ? null : { axis, value };
        })
        .filter((r): r is { axis: Axis; value: number } => r !== null);
      return { concept, reasons };
    })
    .filter((e) => e.reasons.length > 0);

  return (
    <section className="p2-section">
      <h2>4. Hard boundaries (optional)</h2>
      <p className="p2-hint">
        Set a required threshold on any axis, e.g. "must feel handmade ≥ 4". Concepts that
        don't meet it are excluded below, with which boundary excluded them.
      </p>
      <div className="p2-boundaries">
        {axes.map((axis) => {
          const current = boundaries.find((b) => b.axisId === axis.id)?.min ?? null;
          return (
            <label className="p2-rating-row" key={axis.id}>
              {axis.name} {axis.direction === "higher-better" ? "≥" : "≤"}
              <input
                type="number"
                step={0.5}
                value={current ?? ""}
                placeholder="none"
                onChange={(e) =>
                  setMin(axis.id, e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
          );
        })}
      </div>

      {excluded.length > 0 && (
        <div className="p2-excluded">
          <strong>Excluded:</strong>
          <ul>
            {excluded.map(({ concept, reasons }) => (
              <li key={concept.id}>
                {concept.name} —{" "}
                {reasons
                  .map(
                    (r) =>
                      `${r.axis.name} is ${r.value.toFixed(1)}, needed ${
                        r.axis.direction === "higher-better" ? "≥" : "≤"
                      } ${boundaries.find((b) => b.axisId === r.axis.id)?.min}`
                  )
                  .join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
