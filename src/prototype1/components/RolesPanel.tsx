import type { AgentRole } from "../roles";

export interface RolesState {
  status: "idle" | "running" | "done" | "error";
  roles: AgentRole[] | null;
  error: string | null;
}

export const initialRolesState: RolesState = {
  status: "idle",
  roles: null,
  error: null,
};

interface Props {
  state: RolesState;
  onGenerate: () => void;
  onClear: () => void;
}

export function RolesPanel({ state, onGenerate, onClear }: Props) {
  const running = state.status === "running";

  return (
    <section className="panel roles-panel">
      <header className="panel-header">
        <div>
          <h2>Agent Roles</h2>
          <p className="panel-description">
            Optional: generate 4 perspectives shared by all four modes. Without
            roles, agents stay general.
          </p>
        </div>
        <div className="roles-buttons">
          {state.roles && (
            <button onClick={onClear} disabled={running}>
              Clear
            </button>
          )}
          <button onClick={onGenerate} disabled={running}>
            {running
              ? "Generating…"
              : state.roles
                ? "Regenerate Roles"
                : "Generate Roles"}
          </button>
        </div>
      </header>

      {running && <p className="panel-status">Generating roles…</p>}
      {state.error && <p className="panel-error">{state.error}</p>}

      {state.roles && (
        <div className="roles-list">
          {state.roles.map((r, i) => (
            <div key={i} className={`role agent-${i % 4}`}>
              <span className="turn-agent">{r.name}</span>
              <p>{r.perspective}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
