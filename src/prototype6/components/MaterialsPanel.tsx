import { MATERIALS, material } from "../../massing/materials";
import type { GeometryStats, SceneNode } from "../../massing/types";

interface Props {
  nodes: SceneNode[];
  stats: GeometryStats;
  onChangeMaterial: (nodeId: string, materialId: string) => void;
}

export function MaterialsPanel({ nodes, stats, onChangeMaterial }: Props) {
  if (nodes.length === 0) return null;

  const totalCost = nodes.reduce((sum, n) => {
    const def = material(n.materialId);
    const part = stats.perNode.find((p) => p.id === n.id);
    return sum + (part ? part.massKg * def.costPerKg : 0);
  }, 0);

  return (
    <section className="p6-section">
      <div className="section-header">
        <h2>3. Materials (CMF)</h2>
      </div>
      <p className="p6-hint">
        Each choice carries density, cost and process with it — so changing a finish moves the
        numbers, not just the colour.
      </p>

      <div className="p6-materials">
        {nodes.map((n) => {
          const def = material(n.materialId);
          const part = stats.perNode.find((p) => p.id === n.id);
          return (
            <div className="p6-material-row" key={n.id}>
              <div className="p6-material-head">
                <span className="p6-swatch" style={{ background: def.color }} />
                <strong>{n.label}</strong>
              </div>
              <select
                value={n.materialId}
                onChange={(e) => onChangeMaterial(n.id, e.target.value)}
              >
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="p6-hint">
                {part ? `${(part.massKg * 1000).toFixed(0)} g · ` : ""}
                {def.processes.join(", ")}
              </p>
            </div>
          );
        })}
      </div>

      <p className="p6-material-total">
        Material cost (stock only): <strong>${totalCost.toFixed(2)}</strong>
      </p>
    </section>
  );
}
