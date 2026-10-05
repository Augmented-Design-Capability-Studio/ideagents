import { useState } from "react";
import type { DialMode, LogEvent, StudySettings } from "../types";
import { MAX_DIAL, MIN_DIAL } from "../config";

interface Props {
  settings: StudySettings;
  onSave: (s: StudySettings) => void;
  events: LogEvent[];
  onClearEvents: () => void;
}

const DIAL_MODES: DialMode[] = ["escalating", "fixed", "locked"];

function toCsv(events: LogEvent[]): string {
  const header = "id,timestamp,iso_time,type,payload_json";
  const rows = events.map((e) => {
    const payload = JSON.stringify(e.payload).replace(/"/g, '""');
    return `"${e.id}",${e.timestamp},"${new Date(e.timestamp).toISOString()}","${e.type}","${payload}"`;
  });
  return [header, ...rows].join("\n");
}

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminPanel({ settings, onSave, events, onClearEvents }: Props) {
  const [draft, setDraft] = useState(settings);
  const [copied, setCopied] = useState(false);

  const save = () => onSave(draft);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(events, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable; the Download buttons still work.
    }
  };

  return (
    <main className="app p5-admin">
      <h1>Radical Tool — Researcher Mode</h1>
      <p className="p5-hint">
        Hidden route (reached via <code>?admin</code> in the URL). Not linked from the main app.
      </p>

      <section className="p5-section">
        <h2>Study settings</h2>
        <label className="p5-field">
          Participant ID
          <input value={draft.participantId} onChange={(e) => setDraft({ ...draft, participantId: e.target.value })} />
        </label>
        <label className="p5-field">
          Condition
          <input value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} />
        </label>
        <label className="p5-field">
          Dial behavior
          <select
            value={draft.dialMode}
            onChange={(e) => setDraft({ ...draft, dialMode: e.target.value as DialMode })}
          >
            {DIAL_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {draft.dialMode !== "escalating" && (
          <label className="p5-field">
            Fixed/locked dial level
            <input
              type="number"
              min={MIN_DIAL}
              max={MAX_DIAL}
              value={draft.fixedDialLevel}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  fixedDialLevel: Math.min(MAX_DIAL, Math.max(MIN_DIAL, Number(e.target.value))),
                })
              }
            />
          </label>
        )}
        <div className="p5-row">
          <button onClick={save}>Save settings</button>
        </div>
        <p className="p5-hint">
          escalating = auto-increments each round, designer can lower it. fixed = stays put but the
          designer can still move it. locked = fixed and the slider is disabled for the designer.
        </p>
      </section>

      <section className="p5-section">
        <h2>Logged events ({events.length})</h2>
        <div className="p5-row">
          <button onClick={() => void copyJson()}>{copied ? "Copied!" : "Copy JSON"}</button>
          <button onClick={() => download("radical-tool-log.json", JSON.stringify(events, null, 2), "application/json")}>
            Download JSON
          </button>
          <button onClick={() => download("radical-tool-log.csv", toCsv(events), "text/csv")}>
            Download CSV
          </button>
          <button onClick={onClearEvents}>Clear logs</button>
        </div>
        <pre className="p5-export">{JSON.stringify(events.slice(-20), null, 2)}</pre>
        <p className="p5-hint">Showing the most recent 20 events; exports include all of them.</p>
      </section>
    </main>
  );
}
