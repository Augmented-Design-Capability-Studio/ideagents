import { useState } from "react";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from "../config";
import type { ConnectionState } from "../connection";
import {
  clearApiKey,
  getApiKey,
  getModel,
  setApiKey,
  setModel,
} from "../storage";

interface Props {
  connection: ConnectionState;
  onConnectionChanged: () => void;
  onClose: () => void;
}

function statusLabel(connection: ConnectionState): string {
  switch (connection.state) {
    case "no-key":
      return "No API key configured.";
    case "checking":
      return "Checking connection…";
    case "connected":
      return "Connected to the Gemini API.";
    case "error":
      return `Connection failed: ${connection.message}`;
  }
}

export function AgentDialog({ connection, onConnectionChanged, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [savedKey, setSavedKey] = useState(getApiKey());
  const [model, setModelState] = useState(getModel());

  const save = () => {
    if (!draft.trim()) return;
    setApiKey(draft);
    setSavedKey(draft.trim());
    setDraft("");
    onConnectionChanged();
  };

  const clear = () => {
    clearApiKey();
    setSavedKey(null);
    onConnectionChanged();
  };

  const changeModel = (m: string) => {
    setModel(m);
    setModelState(m);
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Agent</h2>
        <p className="dialog-status">
          <span className={`status-dot ${connection.state}`} />
          {statusLabel(connection)}
          {savedKey && ` Key ends in …${savedKey.slice(-4)}.`}
        </p>
        <input
          type="password"
          placeholder="Paste your Gemini API key"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <label className="dialog-field">
          Model
          <select value={model} onChange={(e) => changeModel(e.target.value)}>
            {GEMINI_MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === DEFAULT_GEMINI_MODEL ? `${m} (default)` : m}
              </option>
            ))}
          </select>
        </label>
        <div className="dialog-actions">
          <button onClick={save} disabled={!draft.trim()}>
            Save
          </button>
          <button onClick={clear} disabled={!savedKey}>
            Clear key
          </button>
          <button onClick={onConnectionChanged}>Test connection</button>
          <button onClick={onClose}>Close</button>
        </div>
        <p className="dialog-note">
          The key is stored only in this browser's local storage and is sent only
          to the Gemini API. It never leaves your machine otherwise.
        </p>
      </div>
    </div>
  );
}
