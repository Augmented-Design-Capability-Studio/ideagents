import { useState } from "react";
import type { ChainItem, Goal, ModelSpec } from "../types";

interface Props {
  goals: Goal[];
  chains: ChainItem[];
  models: Record<string, ModelSpec>;
  modelAssumptions: Record<string, string[]>;
}

export function ExportPanel({ goals, chains, models, modelAssumptions }: Props) {
  const [copied, setCopied] = useState(false);

  const accepted = chains.filter((c) => c.status === "accepted");
  if (accepted.length === 0) return null;

  const exportData = accepted.map((item) => {
    const goal = goals.find((g) => g.id === item.goalId);
    const model = models[item.id];
    return {
      goal: goal?.text ?? "",
      mechanism: item.mechanism,
      requirement: item.requirement,
      rationale: item.rationale,
      model: model
        ? model.notApplicable
          ? { notApplicable: true, reason: model.notApplicableReason }
          : {
              variables: model.variables,
              outputs: model.outputs,
              formulas: model.formulas,
              assumptions: modelAssumptions[item.id] ?? model.assumptions,
            }
        : null,
    };
  });

  const json = JSON.stringify(exportData, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context);
      // the JSON is already visible below to copy by hand.
    }
  };

  return (
    <section className="p3-section">
      <h2>3. Export for engineers</h2>
      <p className="p3-hint">
        Accepted requirements, with their linked intent, mechanism, rationale, and any model.
      </p>
      <div className="p3-row">
        <button onClick={() => void copy()}>{copied ? "Copied!" : "Copy JSON"}</button>
      </div>
      <pre className="p3-export">{json}</pre>
    </section>
  );
}
