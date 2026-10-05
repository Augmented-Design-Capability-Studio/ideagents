import { useDeferredValue, useMemo, useRef, useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { generateScene, renderView } from "../massing/api";
import { ConceptForm, type SketchImage } from "./components/ConceptForm";
import { ImplicationsPanel } from "./components/ImplicationsPanel";
import { MaterialsPanel } from "./components/MaterialsPanel";
import { ParametersPanel } from "./components/ParametersPanel";
import { RenderPane } from "./components/RenderPane";
import { SceneView } from "../massing/SceneView";
import { MATERIALS, material } from "../massing/materials";
import { buildScene } from "../massing/geometry";
import { geometryRows, modelRows } from "../massing/implications";
import type { RenderedImage, SceneSpec } from "../massing/types";

const KIND_LABELS: Record<SceneSpec["kind"], string> = {
  part: "Part — an object you look at",
  space: "Space — a volume you're inside",
  material: "Material — the form is given, the finish is the question",
  mechanism: "Mechanism — it moves between states",
};

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [concept, setConcept] = useState("");
  const [sketch, setSketch] = useState<SketchImage | null>(null);
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const [specStatus, setSpecStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [specError, setSpecError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, number>>({});
  const [stateBlend, setStateBlend] = useState(0);
  const [assumptionOverrides, setAssumptionOverrides] = useState<Record<string, string[]>>({});

  const [interiorView, setInteriorView] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

  const [renders, setRenders] = useState<RenderedImage[]>([]);
  const [renderStatus, setRenderStatus] = useState<"idle" | "loading" | "error">("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pendingMaterialId, setPendingMaterialId] = useState(MATERIALS[0].id);

  const snapshotRef = useRef<(() => string | null) | null>(null);

  // Geometry is rebuilt here rather than inside the viewport so the stats it
  // produces can feed the implications panel without a render-loop cycle.
  // Deferred because re-triangulating a plate with hundreds of holes costs far
  // more than a slider tick — the handle stays responsive, geometry catches up.
  const deferredValues = useDeferredValue(values);
  const built = useMemo(
    () => (spec ? buildScene(spec, deferredValues, stateBlend) : null),
    [spec, deferredValues, stateBlend]
  );

  const rows = useMemo(() => {
    if (!spec || !built) return [];
    return [
      ...geometryRows(built.stats),
      ...modelRows(spec, deferredValues, built.stats, assumptionOverrides),
    ];
  }, [spec, built, deferredValues, assumptionOverrides]);

  const handleGenerate = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setSpecStatus("loading");
    setSpecError(null);
    try {
      const next = await generateScene(apiKey, concept.trim(), sketch);
      const initial: Record<string, number> = {};
      for (const p of next.parameters) initial[p.id] = p.default;
      setSpec(next);
      setValues(initial);
      setStateBlend(0);
      setAssumptionOverrides({});
      setInteriorView(next.kind === "space");
      setRenders([]);
      setFrameKey((k) => k + 1);
      setSpecStatus("done");
    } catch (err) {
      setSpecStatus("error");
      setSpecError(err instanceof Error ? err.message : String(err));
    }
  };

  const resetValues = () => {
    if (!spec) return;
    const initial: Record<string, number> = {};
    for (const p of spec.parameters) initial[p.id] = p.default;
    setValues(initial);
  };

  const changeMaterial = (nodeId: string, materialId: string) => {
    setSpec((prev) =>
      prev
        ? { ...prev, nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, materialId } : n)) }
        : prev
    );
  };

  const editAssumption = (rowId: string, index: number, text: string) => {
    setAssumptionOverrides((prev) => {
      const current =
        prev[rowId] ?? spec?.implications.find((i) => i.id === rowId)?.assumptions ?? [];
      const next = [...current];
      next[index] = text;
      return { ...prev, [rowId]: next };
    });
  };

  const handleRender = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const dataUrl = snapshotRef.current?.();
    if (!dataUrl) {
      setRenderStatus("error");
      setRenderError("Couldn't capture the viewport.");
      return;
    }
    setRenderStatus("loading");
    setRenderError(null);
    try {
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const image = await renderView(apiKey, base64, pendingMaterialId);
      setRenders((prev) => [
        ...prev,
        {
          materialId: pendingMaterialId,
          materialName: material(pendingMaterialId).name,
          dataUrl: image,
        },
      ]);
      setRenderStatus("idle");
    } catch (err) {
      setRenderStatus("error");
      setRenderError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleCamera = () => {
    setInteriorView((v) => !v);
    setFrameKey((k) => k + 1);
  };

  return (
    <main className="app p6-app">
      <header className="app-header">
        <h1>Prototype 6: Massing Model &amp; Implications</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <div className={`p6-columns ${spec ? "p6-columns-3" : "p6-columns-1"}`}>
        <div className="p6-col">
          <ConceptForm
            concept={concept}
            setConcept={setConcept}
            sketch={sketch}
            setSketch={setSketch}
            onGenerate={() => void handleGenerate()}
            status={specStatus}
            error={specError}
          />

          {spec && (
            <ParametersPanel
              parameters={spec.parameters}
              values={values}
              setValue={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
              onReset={resetValues}
            />
          )}

          {spec && built && (
            <MaterialsPanel
              nodes={spec.nodes}
              stats={built.stats}
              onChangeMaterial={changeMaterial}
            />
          )}
        </div>

        {spec && built && (
          <div className="p6-col">
            <section className="p6-section">
              <div className="section-header">
                <h2>{spec.title}</h2>
                <button onClick={toggleCamera}>
                  {interiorView ? "View from outside" : "View from inside"}
                </button>
              </div>
              <p className="p6-hint">
                <span className="p6-kind-badge">{KIND_LABELS[spec.kind]}</span>{" "}
                {spec.kindReason}
              </p>

              <SceneView
                group={built.group}
                interior={interiorView}
                eyeHeightMm={spec.eyeHeight ?? 1100}
                frameKey={frameKey}
                snapshotRef={snapshotRef}
              />

              {spec.states.length === 2 && (
                <label className="p6-state-slider">
                  <span>
                    {spec.states[0].label} → {spec.states[1].label}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={stateBlend}
                    onChange={(e) => setStateBlend(Number(e.target.value))}
                  />
                </label>
              )}

              <p className="p6-hint">
                Crude massing model — recognisable and measurable, not surface-accurate. Drag to
                orbit.
              </p>
            </section>

            <RenderPane
              renders={renders}
              status={renderStatus}
              error={renderError}
              pendingMaterialId={pendingMaterialId}
              setPendingMaterialId={setPendingMaterialId}
              onRender={() => void handleRender()}
              onClear={() => setRenders([])}
            />
          </div>
        )}

        {spec && built && (
          <div className="p6-col">
            <ImplicationsPanel
              rows={rows}
              onEditAssumption={editAssumption}
              notes={spec.notes}
            />
          </div>
        )}
      </div>

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
