import { useDeferredValue, useMemo, useRef, useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { buildScene } from "../massing/geometry";
import {
  evaluateConstraints,
  geometryRows,
  modelRows,
  type ConstraintResult,
  type ImplicationRow,
} from "../massing/implications";
import { material } from "../massing/materials";
import type { CameraState } from "../massing/SceneView";
import type { GeometryStats, SceneSpec } from "../massing/types";
import { generateConfiguredScene } from "./api";
import { ComparisonTable } from "./components/ComparisonTable";
import { ConfigPanel } from "./components/ConfigPanel";
import { MAX_CONFIGS, SAMPLES } from "./config";
import { useScrollOverflow } from "./layout";
import type { ComparisonRow, Configuration } from "./types";

interface BuiltConfig {
  group: ReturnType<typeof buildScene>["group"];
  stats: GeometryStats;
  rows: ImplicationRow[];
  constraints: ConstraintResult[];
  costUsd: number;
}

// Applies a configuration's material overrides so each panel builds its own
// variant of the shared spec.
function specForConfig(spec: SceneSpec, config: Configuration): SceneSpec {
  if (Object.keys(config.materials).length === 0) return spec;
  return {
    ...spec,
    nodes: spec.nodes.map((n) =>
      config.materials[n.id] ? { ...n, materialId: config.materials[n.id] } : n
    ),
  };
}

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [concept, setConcept] = useState(SAMPLES[0].text);
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const [configs, setConfigs] = useState<Configuration[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-framing is per panel so toggling one view doesn't reset the cameras of
  // panels that aren't linked to it.
  const [frameKeys, setFrameKeys] = useState<Record<string, number>>({});
  const [linkedCamera, setLinkedCamera] = useState<CameraState | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Geometry rebuilds for every panel whenever any slider moves, so it runs on
  // the deferred copy to keep the handles responsive.
  const deferredConfigs = useDeferredValue(configs);

  const built = useMemo(() => {
    const map: Record<string, BuiltConfig> = {};
    if (!spec) return map;
    for (const config of deferredConfigs) {
      const configSpec = specForConfig(spec, config);
      const { group, stats } = buildScene(configSpec, config.values, 0);
      const costUsd = stats.perNode.reduce((sum, part) => {
        const node = configSpec.nodes.find((n) => n.id === part.id);
        return sum + (node ? part.massKg * material(node.materialId).costPerKg : 0);
      }, 0);
      map[config.id] = {
        group,
        stats,
        rows: [...geometryRows(stats), ...modelRows(configSpec, config.values, stats, {})],
        constraints: evaluateConstraints(configSpec, config.values, stats),
        costUsd,
      };
    }
    return map;
  }, [spec, deferredConfigs]);

  const comparisonRows: ComparisonRow[] = useMemo(() => {
    if (!spec || configs.length === 0) return [];

    const anyOpenArea = Object.values(built).some((b) => b.stats.openAreaRatio !== null);

    const defs: {
      id: string;
      label: string;
      unit: string;
      betterWhen: ComparisonRow["betterWhen"];
      pick: (b: BuiltConfig) => number | null;
      warn?: (b: BuiltConfig) => string | null;
    }[] = [
      { id: "mass", label: "Mass", unit: "kg", betterWhen: "lower", pick: (b) => b.stats.massKg },
      {
        id: "cost",
        label: "Material cost",
        unit: "$",
        betterWhen: "lower",
        pick: (b) => b.costUsd,
      },
      ...(anyOpenArea
        ? [
            {
              id: "openArea",
              label: "Open area",
              unit: "%",
              betterWhen: "none" as const,
              pick: (b: BuiltConfig) =>
                b.stats.openAreaRatio === null ? null : b.stats.openAreaRatio * 100,
            },
          ]
        : []),
      ...spec.implications.map((imp) => ({
        id: imp.id,
        label: imp.label,
        unit: imp.unit,
        betterWhen: (imp.betterWhen ?? "none") as ComparisonRow["betterWhen"],
        pick: (b: BuiltConfig) => b.rows.find((r) => r.id === imp.id)?.value ?? null,
        warn: (b: BuiltConfig) => b.rows.find((r) => r.id === imp.id)?.warning ?? null,
      })),
    ];

    return defs.map((def) => {
      const raw = configs.map((c) => {
        const b = built[c.id];
        return {
          configId: c.id,
          value: b ? def.pick(b) : null,
          warning: b && def.warn ? def.warn(b) : null,
        };
      });

      let bestValue: number | null = null;
      if (def.betterWhen !== "none") {
        const numbers = raw.map((r) => r.value).filter((v): v is number => v !== null);
        if (numbers.length > 1) {
          bestValue =
            def.betterWhen === "lower" ? Math.min(...numbers) : Math.max(...numbers);
        }
      }

      return {
        id: def.id,
        label: def.label,
        unit: def.unit,
        betterWhen: def.betterWhen,
        cells: raw.map((r) => ({ ...r, best: bestValue !== null && r.value === bestValue })),
      };
    });
  }, [spec, configs, built]);

  const gridRef = useRef<HTMLDivElement>(null);
  const overflow = useScrollOverflow(gridRef, [configs.length, spec]);
  const provocationCount = configs.filter((c) => c.intent === "provocation").length;
  const allExpanded = configs.length > 0 && configs.every((c) => c.expanded);

  const scrollGrid = (direction: 1 | -1) => {
    const el = gridRef.current;
    if (el) el.scrollBy({ top: direction * el.clientHeight * 0.8, behavior: "smooth" });
  };

  const handleGenerate = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await generateConfiguredScene(apiKey, concept.trim(), null);
      setSpec(result.spec);
      setConfigs(result.configurations);
      setLinkedCamera(null);
      setDriverId(null);
      setFrameKeys(Object.fromEntries(result.configurations.map((c) => [c.id, 1])));
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateConfig = (id: string, patch: Partial<Configuration>) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const duplicateConfig = (id: string) => {
    setConfigs((prev) => {
      if (prev.length >= MAX_CONFIGS) return prev;
      const source = prev.find((c) => c.id === id);
      if (!source) return prev;
      const copy: Configuration = {
        ...source,
        id: `config-${Date.now()}`,
        name: `${source.name} copy`,
        values: { ...source.values },
        materials: { ...source.materials },
      };
      const index = prev.findIndex((c) => c.id === id);
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  };

  const bumpFrames = (ids: string[]) => {
    setFrameKeys((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
  };

  // Toggling the view on a linked panel takes the rest of the linked group
  // with it — a linked group showing a mix of inside and outside views while
  // sharing one camera would be incoherent.
  const toggleInterior = (configId: string) => {
    const source = configs.find((c) => c.id === configId);
    if (!source) return;
    const target = !source.interior;
    const affected = source.linked
      ? configs.filter((c) => c.linked).map((c) => c.id)
      : [configId];

    setConfigs((prev) =>
      prev.map((c) => (affected.includes(c.id) ? { ...c, interior: target } : c))
    );
    bumpFrames(affected);
  };

  const toggleLinked = (configId: string, linked: boolean) => {
    updateConfig(configId, { linked });
    // A panel rejoining the group adopts the shared camera on its next change;
    // re-frame it now so it isn't left pointing somewhere unrelated.
    if (linked) bumpFrames([configId]);
  };

  const handleCameraChange = (configId: string, camera: CameraState) => {
    const source = configs.find((c) => c.id === configId);
    if (!source?.linked) return;
    setDriverId(configId);
    setLinkedCamera(camera);
  };

  return (
    <main className="app p7-app">
      <header className="app-header">
        <h1>Prototype 7: Configuration Comparison</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <section className="p7-section">
        <div className="section-header">
          <h2>Concept</h2>
          <select
            value=""
            onChange={(e) => {
              const sample = SAMPLES.find((s) => s.label === e.target.value);
              if (sample) setConcept(sample.text);
            }}
          >
            <option value="">Load a sample…</option>
            {SAMPLES.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="p7-concept"
          rows={3}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />

        <div className="p7-row">
          <button onClick={() => void handleGenerate()} disabled={!concept.trim() || status === "loading"}>
            {status === "loading" ? "Generating configurations…" : "Generate configurations"}
          </button>
        </div>
        {error && <p className="p7-error">{error}</p>}
        {spec && <p className="p7-hint">{spec.kindReason}</p>}
      </section>

      {spec && configs.length > 0 && (
        <>
          <div className="p7-grid-bar">
            <h2>Configurations</h2>
            <span className="p7-hint">
              {configs.length} configurations · {provocationCount} provocations ·{" "}
              {MAX_CONFIGS - configs.length} free slots
            </span>
            <button
              className="p7-expand-all"
              onClick={() => setConfigs((prev) => prev.map((c) => ({ ...c, expanded: !allExpanded })))}
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          </div>

          <div className="p7-grid-wrap">
            <div className="p7-grid" ref={gridRef}>
              {configs.map((config) => {
                const b = built[config.id];
                if (!b) return null;
                return (
                  <ConfigPanel
                    key={config.id}
                    spec={spec}
                    config={config}
                    group={b.group}
                    stats={b.stats}
                    rows={b.rows}
                    constraints={b.constraints}
                    frameKey={frameKeys[config.id] ?? 0}
                    camera={config.linked && driverId !== config.id ? linkedCamera : null}
                    onCameraChange={(cam) => handleCameraChange(config.id, cam)}
                    onRename={(name) => updateConfig(config.id, { name })}
                    onChangeValue={(paramId, v) =>
                      updateConfig(config.id, { values: { ...config.values, [paramId]: v } })
                    }
                    onChangeMaterial={(nodeId, materialId) =>
                      updateConfig(config.id, {
                        materials: { ...config.materials, [nodeId]: materialId },
                      })
                    }
                    onToggleInterior={() => toggleInterior(config.id)}
                    onToggleLinked={(linked) => toggleLinked(config.id, linked)}
                    onToggleExpanded={() =>
                      updateConfig(config.id, { expanded: !config.expanded })
                    }
                    onDuplicate={() => duplicateConfig(config.id)}
                    onRemove={() => setConfigs((prev) => prev.filter((c) => c.id !== config.id))}
                    canRemove={configs.length > 1}
                  />
                );
              })}
            </div>

            <div
              className={`p7-fade p7-fade-top ${overflow.canScrollUp ? "p7-fade-on" : ""}`}
              aria-hidden
            />
            <div
              className={`p7-fade p7-fade-bottom ${overflow.canScrollDown ? "p7-fade-on" : ""}`}
              aria-hidden
            />
            {overflow.canScrollUp && (
              <button className="p7-scroll-pill p7-scroll-pill-top" onClick={() => scrollGrid(-1)}>
                ↑ Back up
              </button>
            )}
            {overflow.canScrollDown && (
              <button className="p7-scroll-pill p7-scroll-pill-bottom" onClick={() => scrollGrid(1)}>
                ↓{" "}
                {overflow.hiddenBelow > 0
                  ? `${overflow.hiddenBelow} more configuration${overflow.hiddenBelow === 1 ? "" : "s"} below`
                  : "Scroll for more"}
              </button>
            )}
          </div>

          <ComparisonTable
            rows={comparisonRows}
            configs={configs}
            constraints={spec.constraints}
            constraintsByConfig={Object.fromEntries(
              Object.entries(built).map(([id, b]) => [id, b.constraints])
            )}
          />
        </>
      )}

      {agentOpen && (
        <AgentDialog
          connection={connection}
          onConnectionChanged={() => void refreshConnection()}
          onClose={() => setAgentOpen(false)}
        />
      )}
    </main>
  );
}
