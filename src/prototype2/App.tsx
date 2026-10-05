import { useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { estimateConcepts, proposeAxes } from "./api";
import { AxesEditor } from "./components/AxesEditor";
import { BoundariesPanel } from "./components/BoundariesPanel";
import { ConceptsForm, newConcept } from "./components/ConceptsForm";
import { QualitativeAxesPanel } from "./components/QualitativeAxesPanel";
import { TradeoffPlot } from "./components/TradeoffPlot";
import { MIN_CONCEPTS } from "./config";
import type {
  Axis,
  Boundary,
  Concept,
  EstimateTable,
  QualitativeRatings,
} from "./types";

type Status = "idle" | "loading" | "done" | "error";

const SAMPLE_CONCEPTS = [
  {
    name: "Panoramic glass roof",
    description: "Full-length glass roof panel over the rear seats to open up sightlines.",
  },
  {
    name: "Ambient light strip",
    description: "Backlit trim strip along the beltline that brightens as the cabin darkens.",
  },
  {
    name: "Slimmer seat backs",
    description: "Thinner front seat backs that free up knee room and forward visibility.",
  },
];

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [brief, setBrief] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>(
    Array.from({ length: MIN_CONCEPTS }, newConcept)
  );

  const [engineeringAxes, setEngineeringAxes] = useState<Axis[]>([]);
  const [axesStatus, setAxesStatus] = useState<Status>("idle");
  const [axesError, setAxesError] = useState<string | null>(null);

  const [estimates, setEstimates] = useState<EstimateTable>({});
  const [estimateStatus, setEstimateStatus] = useState<Status>("idle");
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const [qualitativeAxes, setQualitativeAxes] = useState<Axis[]>([]);
  const [qualitativeRatings, setQualitativeRatings] = useState<QualitativeRatings>({});

  const [boundaries, setBoundaries] = useState<Boundary[]>([]);

  const [plotX, setPlotX] = useState<string>("");
  const [plotY, setPlotY] = useState<string>("");
  const [showPlot, setShowPlot] = useState(false);
  const [editingConcepts, setEditingConcepts] = useState(false);

  const allAxes = [...engineeringAxes, ...qualitativeAxes];

  const handleProposeAxes = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setAxesStatus("loading");
    setAxesError(null);
    try {
      const readyConcepts = concepts.filter((c) => c.name.trim() && c.description.trim());
      const axes = await proposeAxes(apiKey, brief.trim(), readyConcepts);
      setEngineeringAxes(axes);
      setAxesStatus("done");
    } catch (err) {
      setAxesStatus("error");
      setAxesError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEstimate = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setEstimateStatus("loading");
    setEstimateError(null);
    try {
      const readyConcepts = concepts.filter((c) => c.name.trim() && c.description.trim());
      const table = await estimateConcepts(apiKey, brief.trim(), readyConcepts, engineeringAxes);
      setEstimates(table);
      setEstimateStatus("done");
      setEditingConcepts(false);
      if (engineeringAxes.length >= 2) {
        setPlotX(engineeringAxes[0].id);
        setPlotY(engineeringAxes[1].id);
      }
    } catch (err) {
      setEstimateStatus("error");
      setEstimateError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteConcept = (conceptId: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== conceptId));
  };

  // Adds an LLM-suggested concept (from the plot) and gets it real estimates on
  // EVERY engineering axis — not just the pair currently plotted — so it doesn't
  // vanish when the designer switches which axes are shown. Existing concepts'
  // estimates are sent along for context but never overwritten, only the new
  // concept's own column is merged in.
  const addSuggestedConcept = async (
    concept: Concept,
    hints: { axis: Axis; value: number }[]
  ): Promise<{ ok: boolean; warning?: string }> => {
    setConcepts((prev) => [...prev, concept]);

    for (const hint of hints) {
      if (hint.axis.source === "qualitative") {
        setQualitativeRatings((prev) => ({
          ...prev,
          [hint.axis.id]: { ...prev[hint.axis.id], [concept.id]: hint.value },
        }));
      }
    }

    if (engineeringAxes.length === 0) return { ok: true };
    const apiKey = getApiKey();
    if (!apiKey) return { ok: true };

    try {
      const readyConcepts = concepts.filter((c) => c.name.trim() && c.description.trim());
      const table = await estimateConcepts(
        apiKey,
        brief.trim(),
        [...readyConcepts, concept],
        engineeringAxes
      );
      setEstimates((prev) => {
        const next = { ...prev };
        for (const axis of engineeringAxes) {
          const cell = table[axis.id]?.[concept.id];
          if (cell) next[axis.id] = { ...next[axis.id], [concept.id]: cell };
        }
        return next;
      });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        warning: `Added "${concept.name}", but couldn't estimate it on the other axes (${
          err instanceof Error ? err.message : String(err)
        }). Use Edit on step 2 and re-run Estimate to fill it in.`,
      };
    }
  };

  const resetFromEstimates = () => {
    setEstimates({});
    setEstimateStatus("idle");
    setEstimateError(null);
    setBoundaries([]);
    setPlotX("");
    setPlotY("");
    setShowPlot(false);
  };

  const editConcepts = () => {
    if (
      !window.confirm(
        'Editing the brief or concepts invalidates the current estimates — re-run "Estimate concepts on these axes" afterward. Axes, qualitative ratings, and boundaries are kept. Continue?'
      )
    ) {
      return;
    }
    setEditingConcepts(true);
    setEstimates({});
    setEstimateStatus("idle");
    setEstimateError(null);
  };

  const editAxes = () => {
    if (!window.confirm("Editing the axes clears the estimates, boundaries, and trade-off plot. Continue?")) {
      return;
    }
    resetFromEstimates();
  };

  const fillSample = () => {
    setBrief(
      "Reduce claustrophobic feel in the rear cabin of a vehicle without changing the roofline"
    );
    setConcepts(
      SAMPLE_CONCEPTS.map((c) => ({ ...newConcept(), name: c.name, description: c.description }))
    );
  };

  const hasEstimates = estimateStatus === "done";

  return (
    <main className="app p2-app">
      <header className="app-header">
        <h1>Prototype 2: Trade-off Explorer</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <ConceptsForm
        brief={brief}
        setBrief={setBrief}
        concepts={concepts}
        setConcepts={setConcepts}
        onProposeAxes={() => void handleProposeAxes()}
        status={axesStatus}
        error={axesError}
        locked={engineeringAxes.length > 0 && !editingConcepts}
        onFillSample={fillSample}
        onEdit={editConcepts}
      />

      <AxesEditor
        axes={engineeringAxes}
        setAxes={setEngineeringAxes}
        onEstimate={() => void handleEstimate()}
        status={estimateStatus}
        error={estimateError}
        locked={hasEstimates}
        onEdit={editAxes}
        concepts={concepts.filter((c) => c.name.trim())}
        estimates={estimates}
      />

      {engineeringAxes.length > 0 && (
        <QualitativeAxesPanel
          concepts={concepts.filter((c) => c.name.trim())}
          axes={qualitativeAxes}
          setAxes={setQualitativeAxes}
          ratings={qualitativeRatings}
          setRatings={setQualitativeRatings}
          disabled={false}
        />
      )}

      {hasEstimates && (
        <BoundariesPanel
          axes={allAxes}
          concepts={concepts}
          estimates={estimates}
          qualitativeRatings={qualitativeRatings}
          boundaries={boundaries}
          setBoundaries={setBoundaries}
        />
      )}

      {hasEstimates && plotX && plotY && !showPlot && (
        <div className="p2-row">
          <button onClick={() => setShowPlot(true)}>Show trade-off plot</button>
        </div>
      )}

      {hasEstimates && plotX && plotY && showPlot && (
        <TradeoffPlot
          brief={brief}
          apiKey={getApiKey()}
          concepts={concepts}
          axes={allAxes}
          estimates={estimates}
          qualitativeRatings={qualitativeRatings}
          boundaries={boundaries}
          plotX={plotX}
          plotY={plotY}
          setPlotX={setPlotX}
          setPlotY={setPlotY}
          onAddSuggestedConcept={addSuggestedConcept}
          onDeleteConcept={deleteConcept}
          onNeedAgent={() => setAgentOpen(true)}
        />
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
