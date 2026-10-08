import { EXPERTS, MAX_EXPERTS, SAMPLES } from "../config";

interface Props {
  started: boolean;
  seed: string;
  setSeed: (v: string) => void;
  expertIds: string[];
  toggleExpert: (id: string) => void;
  onStart: () => void;
  status: "idle" | "loading" | "error";
  error: string | null;
}

export function SetupPanel({
  started,
  seed,
  setSeed,
  expertIds,
  toggleExpert,
  onStart,
  status,
  error,
}: Props) {
  return (
    <section className="q-section">
      <details open={!started}>
        <summary className="q-setup-summary">
          <span>Setup</span>
          <span className="q-hint">
            {started
              ? `${expertIds.length} expert${expertIds.length === 1 ? "" : "s"} in the room`
              : "Your idea, who's in the room, and how you argue"}
          </span>
        </summary>

        <label className="q-field">
          Your idea
          <textarea
            rows={3}
            value={seed}
            disabled={started}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="The idea you want to defend."
          />
        </label>

        {!started && (
          <div className="q-row">
            <select
              value=""
              onChange={(e) => {
                const sample = SAMPLES.find((s) => s.label === e.target.value);
                if (sample) setSeed(sample.seed);
              }}
            >
              <option value="">Load a sample…</option>
              {SAMPLES.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <h3>Who's in the room</h3>
        <p className="q-hint">
          They take turns raising points from their own discipline. Pick up to {MAX_EXPERTS}.
        </p>
        <div className="q-chips">
          {EXPERTS.map((e) => {
            const on = expertIds.includes(e.id);
            return (
              <button
                key={e.id}
                className={`q-chip ${on ? "q-chip-on" : ""}`}
                disabled={started || (!on && expertIds.length >= MAX_EXPERTS)}
                onClick={() => toggleExpert(e.id)}
                title={e.concerns}
              >
                {e.role}
              </button>
            );
          })}
        </div>

        {!started && (
          <div className="q-row q-start-row">
            <button
              onClick={onStart}
              disabled={!seed.trim() || expertIds.length === 0 || status === "loading"}
            >
              {status === "loading" ? "Gathering the room…" : "Start the review"}
            </button>
          </div>
        )}
        {error && <p className="q-error">{error}</p>}
      </details>
    </section>
  );
}
