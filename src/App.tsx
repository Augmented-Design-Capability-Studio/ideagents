import { useEffect, useState } from "react";
import { AgentDialog } from "./components/AgentDialog";
import { Panel, initialPanelState } from "./components/Panel";
import type { PanelState } from "./components/Panel";
import { SettingsDialog } from "./components/SettingsDialog";
import type { ConnectionState } from "./connection";
import { checkConnection } from "./gemini";
import type { MechanismId } from "./mechanisms";
import { runMechanism } from "./mechanisms";
import { getApiKey } from "./storage";

const MECHANISMS: MechanismId[] = [
  "consensus",
  "amplification",
  "disagreement",
  "independent",
];

type PanelStates = Record<MechanismId, PanelState>;

const initialStates: PanelStates = {
  consensus: initialPanelState,
  amplification: initialPanelState,
  disagreement: initialPanelState,
  independent: initialPanelState,
};

export default function App() {
  const [seed, setSeed] = useState("");
  const [panels, setPanels] = useState<PanelStates>(initialStates);
  const [agentOpen, setAgentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    state: "no-key",
  });

  const refreshConnection = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setConnection({ state: "no-key" });
      return;
    }
    setConnection({ state: "checking" });
    try {
      await checkConnection(apiKey);
      setConnection({ state: "connected" });
    } catch (err) {
      setConnection({
        state: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  useEffect(() => {
    void refreshConnection();
  }, []);

  const patch = (id: MechanismId, update: Partial<PanelState>) => {
    setPanels((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  };

  const run = async (id: MechanismId) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    if (!seed.trim()) {
      patch(id, { status: "error", error: "Enter a seed idea first." });
      return;
    }

    patch(id, {
      status: "running",
      statusText: "Starting…",
      turns: [],
      final: null,
      error: null,
    });

    try {
      await runMechanism(id, seed.trim(), apiKey, (e) => {
        if (e.type === "status") {
          patch(id, { statusText: e.text });
        } else if (e.type === "turn") {
          setPanels((prev) => ({
            ...prev,
            [id]: { ...prev[id], turns: [...prev[id].turns, e.turn] },
          }));
        } else {
          patch(id, { final: e.idea });
        }
      });
      patch(id, { status: "done" });
    } catch (err) {
      patch(id, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>Multi-Agent Ideation</h1>
        <div className="header-buttons">
          <button onClick={() => setAgentOpen(true)}>
            <span className={`status-dot ${connection.state}`} />
            Agent
          </button>
          <button onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      <input
        className="seed-input"
        placeholder="Seed idea / design question"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />

      <div className="panel-grid">
        {MECHANISMS.map((id) => (
          <Panel key={id} id={id} state={panels[id]} onRun={run} />
        ))}
      </div>

      {agentOpen && (
        <AgentDialog
          connection={connection}
          onConnectionChanged={() => void refreshConnection()}
          onClose={() => setAgentOpen(false)}
        />
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}
