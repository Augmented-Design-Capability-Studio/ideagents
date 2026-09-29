import { ChainItemCard } from "./ChainItemCard";
import type { ChainItem, Goal, ModelSpec } from "../types";

interface Props {
  goal: Goal;
  items: ChainItem[];
  onUpdateItem: (id: string, patch: Partial<ChainItem>) => void;
  onGenerate: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  models: Record<string, ModelSpec>;
  modelStatus: Record<string, "idle" | "loading" | "done" | "error">;
  modelError: Record<string, string | null>;
  onBuildModel: (item: ChainItem) => void;
  modelValues: Record<string, Record<string, number>>;
  setModelValues: (chainItemId: string, v: Record<string, number>) => void;
  modelAssumptions: Record<string, string[]>;
  setModelAssumptions: (chainItemId: string, v: string[]) => void;
}

export function GoalSection({
  goal,
  items,
  onUpdateItem,
  onGenerate,
  status,
  error,
  models,
  modelStatus,
  modelError,
  onBuildModel,
  modelValues,
  setModelValues,
  modelAssumptions,
  setModelAssumptions,
}: Props) {
  if (!goal.text.trim()) return null;

  return (
    <div className="p3-subsection">
      <h3>Goal: {goal.text}</h3>
      {items.length === 0 ? (
        <button onClick={onGenerate} disabled={status === "loading"}>
          {status === "loading" ? "Generating chains…" : "Generate reasoning chains"}
        </button>
      ) : (
        <div className="p3-chains">
          {items.map((item) => (
            <ChainItemCard
              key={item.id}
              item={item}
              onUpdate={(patch) => onUpdateItem(item.id, patch)}
              model={models[item.id]}
              modelStatus={modelStatus[item.id] ?? "idle"}
              modelError={modelError[item.id] ?? null}
              onBuildModel={() => onBuildModel(item)}
              modelValues={modelValues[item.id] ?? {}}
              setModelValues={(v) => setModelValues(item.id, v)}
              modelAssumptions={modelAssumptions[item.id] ?? []}
              setModelAssumptions={(v) => setModelAssumptions(item.id, v)}
            />
          ))}
        </div>
      )}
      {error && <p className="p3-error">{error}</p>}
    </div>
  );
}
