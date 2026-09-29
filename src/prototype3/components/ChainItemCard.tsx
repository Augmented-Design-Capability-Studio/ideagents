import { ModelViewer } from "./ModelViewer";
import type { ChainItem, ModelSpec } from "../types";

interface Props {
  item: ChainItem;
  onUpdate: (patch: Partial<ChainItem>) => void;
  model: ModelSpec | undefined;
  modelStatus: "idle" | "loading" | "done" | "error";
  modelError: string | null;
  onBuildModel: () => void;
  modelValues: Record<string, number>;
  setModelValues: (v: Record<string, number>) => void;
  modelAssumptions: string[];
  setModelAssumptions: (v: string[]) => void;
}

export function ChainItemCard({
  item,
  onUpdate,
  model,
  modelStatus,
  modelError,
  onBuildModel,
  modelValues,
  setModelValues,
  modelAssumptions,
  setModelAssumptions,
}: Props) {
  return (
    <div className={`p3-chain-item p3-chain-${item.status}`}>
      <label className="p3-field">
        Mechanism
        <textarea
          rows={2}
          value={item.mechanism}
          onChange={(e) => onUpdate({ mechanism: e.target.value })}
        />
      </label>
      <label className="p3-field">
        Candidate requirement
        <textarea
          rows={2}
          value={item.requirement}
          onChange={(e) => onUpdate({ requirement: e.target.value })}
        />
      </label>
      <label className="p3-field">
        Rationale
        <input value={item.rationale} onChange={(e) => onUpdate({ rationale: e.target.value })} />
      </label>

      <div className="p3-row">
        <button
          className={item.status === "accepted" ? "p3-active" : ""}
          onClick={() => onUpdate({ status: "accepted" })}
        >
          Accept
        </button>
        <button
          className={item.status === "rejected" ? "p3-active" : ""}
          onClick={() => onUpdate({ status: "rejected" })}
        >
          Reject
        </button>
        {item.status !== "pending" && (
          <button onClick={() => onUpdate({ status: "pending" })}>Reset</button>
        )}
      </div>

      {item.status === "accepted" && (
        <div className="p3-model-block">
          {!model && (
            <button onClick={onBuildModel} disabled={modelStatus === "loading"}>
              {modelStatus === "loading" ? "Building model…" : "Build micro-simulation"}
            </button>
          )}
          {modelError && <p className="p3-error">{modelError}</p>}
          {model && (
            <ModelViewer
              model={model}
              values={modelValues}
              setValues={setModelValues}
              assumptions={modelAssumptions}
              setAssumptions={setModelAssumptions}
            />
          )}
        </div>
      )}
    </div>
  );
}
