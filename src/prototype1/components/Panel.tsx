import type { FinalIdea, MechanismId, Turn } from "../mechanisms";
import { MECHANISM_INFO } from "../mechanisms";

export interface PanelState {
  status: "idle" | "running" | "done" | "error";
  statusText: string;
  turns: Turn[];
  final: FinalIdea | null;
  error: string | null;
}

export const initialPanelState: PanelState = {
  status: "idle",
  statusText: "",
  turns: [],
  final: null,
  error: null,
};

interface Props {
  id: MechanismId;
  state: PanelState;
  onRun: (id: MechanismId) => void;
}

export function Panel({ id, state, onRun }: Props) {
  const info = MECHANISM_INFO[id];
  const running = state.status === "running";

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>{info.title}</h2>
          <p className="panel-description">{info.description}</p>
        </div>
        <button onClick={() => onRun(id)} disabled={running}>
          {running ? "Running…" : "Run"}
        </button>
      </header>

      {running && <p className="panel-status">{state.statusText}</p>}
      {state.error && <p className="panel-error">{state.error}</p>}

      {state.turns.length > 0 && (
        <div className="panel-transcript">
          {state.turns.map((t, i) => (
            <div key={i} className={`turn agent-${t.index % 4}`}>
              <span className="turn-agent">{t.agent}</span>
              <p>{t.text}</p>
            </div>
          ))}
        </div>
      )}

      {state.final && (
        <div className="panel-final">
          <span className="turn-agent">Final idea</span>
          <p>{state.final.decision}</p>
          {state.final.details && (
            <details className="final-details">
              <summary>Details</summary>
              <p>{state.final.details}</p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
