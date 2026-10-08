import { useRef } from "react";
import type * as THREE from "three";
import { SceneView, type CameraState } from "../../massing/SceneView";
import {
  formatNumber,
  formatValue,
  type ConstraintResult,
  type ImplicationRow,
} from "../../massing/implications";
import { MATERIALS, material } from "../../massing/materials";
import type { GeometryStats, SceneSpec } from "../../massing/types";
import { useMasonrySpan } from "../layout";
import type { Configuration } from "../types";

interface Props {
  spec: SceneSpec;
  config: Configuration;
  group: THREE.Group;
  stats: GeometryStats;
  rows: ImplicationRow[];
  constraints: ConstraintResult[];
  frameKey: number;
  camera: CameraState | null;
  onCameraChange: (c: CameraState) => void;
  onRename: (name: string) => void;
  onChangeValue: (paramId: string, v: number) => void;
  onChangeMaterial: (nodeId: string, materialId: string) => void;
  onToggleInterior: () => void;
  onToggleLinked: (linked: boolean) => void;
  onToggleExpanded: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function ConfigPanel({
  spec,
  config,
  group,
  stats,
  rows,
  constraints,
  frameKey,
  camera,
  onCameraChange,
  onRename,
  onChangeValue,
  onChangeMaterial,
  onToggleInterior,
  onToggleLinked,
  onToggleExpanded,
  onDuplicate,
  onRemove,
  canRemove,
}: Props) {
  const warnings = rows.filter((r) => r.warning);
  const broken = constraints.filter((c) => !c.satisfied);
  // Whether it's *currently* breaking something, which can differ from the
  // model's stated intent once the designer starts dragging sliders.
  const isBreaking = broken.length > 0;

  const ref = useRef<HTMLElement>(null);
  useMasonrySpan(ref);

  const detailCount =
    spec.parameters.length + (broken.length > 0 ? 1 : 0) + config.designImplications.length;

  return (
    <section
      ref={ref}
      className={`p7-panel ${isBreaking ? "p7-panel-breaking" : ""} ${
        config.expanded ? "p7-panel-expanded" : ""
      }`}
    >
      <div className="p7-panel-head">
        <input
          className="p7-name"
          value={config.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Configuration name"
        />
        <div className="p7-panel-actions">
          <button onClick={onDuplicate} title="Duplicate this configuration">
            Duplicate
          </button>
          <button onClick={onRemove} disabled={!canRemove} title="Remove this configuration">
            ✕
          </button>
        </div>
      </div>

      {config.intent === "provocation" && (
        <p className="p7-provocation-tag" title="Deliberately breaks a constraint">
          Provocation
        </p>
      )}

      {config.rationale && (
        <p className="p7-rationale" title={config.expanded ? undefined : config.rationale}>
          {config.rationale}
        </p>
      )}

      <div className="p7-view-controls">
        <button onClick={onToggleInterior}>
          {config.interior ? "View from outside" : "View from inside"}
        </button>
        <label className="p7-link-toggle" title="Linked panels share a camera and view mode">
          <input
            type="checkbox"
            checked={config.linked}
            onChange={(e) => onToggleLinked(e.target.checked)}
          />{" "}
          Linked
        </label>
      </div>

      <SceneView
        group={group}
        interior={config.interior}
        eyeHeightMm={spec.eyeHeight ?? 1100}
        frameKey={frameKey}
        aspect={0.72}
        camera={camera}
        onCameraChange={onCameraChange}
      />

      <div className="p7-key-figures">
        <div className="p7-figure">
          <span className="p7-hint">Mass</span>
          <strong>{stats.massKg.toFixed(2)} kg</strong>
        </div>
        {rows
          .filter((r) => r.source === "model" && !r.error)
          .slice(0, 3)
          .map((r) => (
            <div className="p7-figure" key={r.id}>
              <span className="p7-hint">{r.label}</span>
              <strong className={r.warning ? "p7-warn-value" : ""}>{formatValue(r)}</strong>
            </div>
          ))}
      </div>

      {constraints.length > 0 && (
        <div className="p7-constraints">
          {constraints.map((c) => (
            <span
              className={`p7-constraint-chip ${c.satisfied ? "" : "p7-constraint-broken"}`}
              key={c.constraint.id}
              title={`${c.constraint.label} ${c.constraint.operator} ${c.constraint.limit} ${c.constraint.unit} — ${c.constraint.source}. ${c.constraint.rationale}`}
            >
              {c.constraint.label}:{" "}
              {c.satisfied
                ? formatNumber(c.value, c.constraint.unit)
                : `${formatNumber(c.value, c.constraint.unit)} — past the limit by ${c.overByPct?.toFixed(0)}%`}
            </span>
          ))}
        </div>
      )}

      <button
        className="p7-expand"
        onClick={onToggleExpanded}
        aria-expanded={config.expanded}
      >
        {config.expanded
          ? "▴ Hide controls & notes"
          : `▾ Adjust & read notes (${detailCount})`}
      </button>

      {config.expanded && (
        <div className="p7-panel-details">
          <div className="p7-sliders">
            {spec.parameters.map((p) => (
              <label className="p7-slider-row" key={p.id}>
                <span>
                  {p.name} <span className="p7-hint">({p.unit})</span>
                </span>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={(p.max - p.min) / 100 || 1}
                  value={config.values[p.id] ?? p.default}
                  onChange={(e) => onChangeValue(p.id, Number(e.target.value))}
                />
                <span className="p7-slider-value">
                  {(config.values[p.id] ?? p.default).toFixed(0)}
                </span>
              </label>
            ))}
          </div>

          <details className="p7-materials">
            <summary>Materials ({spec.nodes.length} parts)</summary>
            {spec.nodes.map((n) => {
              const id = config.materials[n.id] ?? n.materialId;
              return (
                <label className="p7-material-row" key={n.id}>
                  <span className="p7-swatch" style={{ background: material(id).color }} />
                  <span className="p7-material-label">{n.label}</span>
                  <select value={id} onChange={(e) => onChangeMaterial(n.id, e.target.value)}>
                    {MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </details>

          {broken.length > 0 && (
            <div className="p7-breaking-note">
              <strong>
                Breaks {broken.map((b) => b.constraint.label).join(", ")}
              </strong>
              {broken.map((b) => (
                <p className="p7-hint" key={b.constraint.id}>
                  {b.constraint.label} must be {b.constraint.operator === ">=" ? "at least" : "at most"}{" "}
                  {b.constraint.limit} {b.constraint.unit} ({b.constraint.source}).{" "}
                  {b.constraint.rationale}
                </p>
              ))}
              {config.provocation && <p className="p7-provocation-text">{config.provocation}</p>}
            </div>
          )}

          {config.designImplications.length > 0 && (
            <details className="p7-design-implications" open={config.intent === "provocation"}>
              <summary>Design implications ({config.designImplications.length})</summary>
              <ul>
                {config.designImplications.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </details>
          )}

          {warnings.map((w) => (
            <p className="p7-warning" key={w.id}>
              {w.label}: {w.warning}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
