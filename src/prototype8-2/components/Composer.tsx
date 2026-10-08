import { RESOLUTIONS, RESOLUTION_BLURBS, RESOLUTION_LABELS, type Resolution } from "../types";

interface Props {
  talkingPoints: string[];
  selected: number[];
  toggleePoint: (i: number) => void;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onProxy: () => void;
  onResolve: (r: Resolution) => void;
  // You have to have actually argued before you can end the argument.
  canResolve: boolean;
  busy: boolean;
  disabled: boolean;
}

export function Composer({
  talkingPoints,
  selected,
  toggleePoint,
  draft,
  setDraft,
  onSend,
  onProxy,
  onResolve,
  canResolve,
  busy,
  disabled,
}: Props) {
  const hasSomething = selected.length > 0 || draft.trim().length > 0;

  return (
    <div className="q-composer">
      {talkingPoints.length > 0 && (
        <>
          <p className="q-hint">Pick one or more, or write your own:</p>
          <div className="q-points">
            {talkingPoints.map((point, i) => (
              <button
                key={i}
                className={`q-point ${selected.includes(i) ? "q-point-on" : ""}`}
                disabled={disabled}
                onClick={() => toggleePoint(i)}
              >
                {point}
              </button>
            ))}
          </div>
        </>
      )}

      <textarea
        className="q-draft"
        rows={2}
        value={draft}
        disabled={disabled}
        placeholder={selected.length > 0 ? "Add anything else…" : "Or say it in your own words…"}
        onChange={(e) => setDraft(e.target.value)}
      />

      <div className="q-composer-actions">
        <button onClick={onSend} disabled={disabled || busy || !hasSomething}>
          Reply
        </button>
        <button onClick={onProxy} disabled={disabled || busy} title="Let the proxy answer as you">
          {busy ? "…" : "Let my proxy answer"}
        </button>
      </div>

      <div className="q-resolve">
        <p className="q-hint">
          {canResolve
            ? "Or end it here:"
            : "Reply at least once before you can end the argument."}
        </p>
        <div className="q-resolve-buttons">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              className={`q-resolve-${r}`}
              disabled={disabled || busy || !canResolve}
              onClick={() => onResolve(r)}
              title={RESOLUTION_BLURBS[r]}
            >
              {RESOLUTION_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
