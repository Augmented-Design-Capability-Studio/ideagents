import { useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { generateChains, generateModel } from "./api";
import { BriefForm, newGoal } from "./components/BriefForm";
import { ExportPanel } from "./components/ExportPanel";
import { GoalSection } from "./components/GoalSection";
import { MIN_GOALS } from "./config";
import type { ChainItem, Goal, ModelSpec } from "./types";

type Status = "idle" | "loading" | "done" | "error";

const SAMPLE_BRIEF = "Improve museum experience for visually impaired visitors";
const SAMPLE_CONCEPT =
  "A handheld audio guide with directional haptic buzzes that pulse more strongly as the visitor turns toward the next exhibit.";
const SAMPLE_GOALS = ["Feels confidence-inspiring, not stressful", "Feels discoverable, not scripted"];

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [brief, setBrief] = useState("");
  const [concept, setConcept] = useState("");
  const [goals, setGoals] = useState<Goal[]>(Array.from({ length: MIN_GOALS }, newGoal));

  const [chains, setChains] = useState<ChainItem[]>([]);
  const [chainStatus, setChainStatus] = useState<Record<string, Status>>({});
  const [chainError, setChainError] = useState<Record<string, string | null>>({});

  const [models, setModels] = useState<Record<string, ModelSpec>>({});
  const [modelStatus, setModelStatus] = useState<Record<string, Status>>({});
  const [modelError, setModelError] = useState<Record<string, string | null>>({});
  const [modelValues, setModelValuesState] = useState<Record<string, Record<string, number>>>(
    {}
  );
  const [modelAssumptions, setModelAssumptionsState] = useState<Record<string, string[]>>({});

  const anyChains = chains.length > 0;

  const fillSample = () => {
    setBrief(SAMPLE_BRIEF);
    setConcept(SAMPLE_CONCEPT);
    setGoals(SAMPLE_GOALS.map((text) => ({ ...newGoal(), text })));
  };

  const handleGenerate = async (goal: Goal) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setChainStatus((s) => ({ ...s, [goal.id]: "loading" }));
    setChainError((e) => ({ ...e, [goal.id]: null }));
    try {
      const items = await generateChains(apiKey, brief.trim(), concept.trim(), goal.id, goal.text);
      setChains((prev) => [...prev, ...items]);
      setChainStatus((s) => ({ ...s, [goal.id]: "done" }));
    } catch (err) {
      setChainStatus((s) => ({ ...s, [goal.id]: "error" }));
      setChainError((e) => ({
        ...e,
        [goal.id]: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  const updateChainItem = (id: string, patch: Partial<ChainItem>) => {
    setChains((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleBuildModel = async (item: ChainItem) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const goal = goals.find((g) => g.id === item.goalId);
    setModelStatus((s) => ({ ...s, [item.id]: "loading" }));
    setModelError((e) => ({ ...e, [item.id]: null }));
    try {
      const spec = await generateModel(
        apiKey,
        brief.trim(),
        concept.trim(),
        goal?.text ?? "",
        item
      );
      setModels((prev) => ({ ...prev, [item.id]: spec }));
      const defaults: Record<string, number> = {};
      for (const v of spec.variables) defaults[v.id] = v.default;
      setModelValuesState((prev) => ({ ...prev, [item.id]: defaults }));
      setModelAssumptionsState((prev) => ({ ...prev, [item.id]: spec.assumptions }));
      setModelStatus((s) => ({ ...s, [item.id]: "done" }));
    } catch (err) {
      setModelStatus((s) => ({ ...s, [item.id]: "error" }));
      setModelError((e) => ({
        ...e,
        [item.id]: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  return (
    <main className="app p3-app">
      <header className="app-header">
        <h1>Prototype 3: Intent-to-Requirement Translation</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <BriefForm
        brief={brief}
        setBrief={setBrief}
        concept={concept}
        setConcept={setConcept}
        goals={goals}
        setGoals={setGoals}
        locked={anyChains}
        onFillSample={fillSample}
      />

      {brief.trim() && concept.trim() && (
        <section className="p3-section">
          <h2>2. Reasoning chains</h2>
          {goals.map((goal) => (
            <GoalSection
              key={goal.id}
              goal={goal}
              items={chains.filter((c) => c.goalId === goal.id)}
              onUpdateItem={updateChainItem}
              onGenerate={() => void handleGenerate(goal)}
              status={chainStatus[goal.id] ?? "idle"}
              error={chainError[goal.id] ?? null}
              models={models}
              modelStatus={modelStatus}
              modelError={modelError}
              onBuildModel={(item) => void handleBuildModel(item)}
              modelValues={modelValues}
              setModelValues={(id, v) => setModelValuesState((prev) => ({ ...prev, [id]: v }))}
              modelAssumptions={modelAssumptions}
              setModelAssumptions={(id, v) =>
                setModelAssumptionsState((prev) => ({ ...prev, [id]: v }))
              }
            />
          ))}
        </section>
      )}

      <ExportPanel
        goals={goals}
        chains={chains}
        models={models}
        modelAssumptions={modelAssumptions}
      />

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
