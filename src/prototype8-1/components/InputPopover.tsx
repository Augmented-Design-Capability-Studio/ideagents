import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  INPUT_SIDE_LABELS,
  OUTCOME_COLORS,
  type DesignerInput,
  type InputSide,
} from "../types";

export type InputAction = "add" | "reargue" | "keep";

// Input sides are coloured like the debate sides they back.
const SIDE_COLORS: Record<InputSide, string> = {
  pro: OUTCOME_COLORS.proponent,
  con: OUTCOME_COLORS.skeptic,
  context: "#888",
};

// The designer's own input to a node: what they know, and which side it helps.
// Adding can re-argue the node (or, on a stopped node, keep going) straight
// away, or just store it for the rest of the branch to use.
function InputBox({
  stopped,
  busy,
  prefill,
  onAdd,
  onCancel,
}: {
  stopped: boolean;
  // Starting text and side, e.g. from the demo hint's "Try it" — still
  // editable before adding.
  prefill: { text: string; side: InputSide } | null;
  busy: boolean;
  onAdd: (input: { text: string; side: InputSide }, action: InputAction) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(prefill?.text ?? "");
  const [side, setSide] = useState<InputSide>(prefill?.side ?? "pro");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  const ready = text.trim().length > 0 && !busy;
  const submit = (action: InputAction) => {
    if (ready) onAdd({ text: text.trim(), side }, action);
  };

  return (
    <div className="p8-input-box">
      <textarea
        ref={ref}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you know that bears on this? A test result, a constraint, a past project…"
      />
      <div className="p8-input-sides" role="radiogroup" aria-label="Which side it helps">
        {(Object.keys(INPUT_SIDE_LABELS) as InputSide[]).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={side === s}
            className={side === s ? "p8-input-side-on" : ""}
            style={{ "--side": SIDE_COLORS[s] } as CSSProperties}
            onClick={() => setSide(s)}
          >
            {INPUT_SIDE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="p8-input-actions">
        <button className="p8-primary" disabled={!ready} onClick={() => submit(stopped ? "keep" : "reargue")}>
          {stopped ? "Add & keep going" : "Add & re-argue"}
        </button>
        <button disabled={!ready} onClick={() => submit("add")} title="Store it for later calls on this branch, without re-arguing now">
          Add
        </button>
        <button className="p8-link-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// A speech-bubble pop-up anchored to a node's "+" on the canvas: the node's
// inputs so far, and a box to add another. Positioned by the canvas in screen
// space, so it follows the node as the view pans and zooms.
export function InputPopover({
  left,
  top,
  arrow,
  placement,
  title,
  inputs,
  prefill,
  stopped,
  busy,
  onAdd,
  onRemove,
  onClose,
}: {
  left: number;
  top: number;
  // Where the arrow sits along the edge facing the node: from the left edge
  // when above/below, from the top edge when beside it.
  arrow: number;
  // Which side of the node it opened on — always clear of the node itself.
  placement: "below" | "above" | "right" | "left";
  title: string;
  inputs: DesignerInput[];
  prefill: { text: string; side: InputSide } | null;
  stopped: boolean;
  busy: boolean;
  onAdd: (input: { text: string; side: InputSide }, action: InputAction) => void;
  onRemove: (inputId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`p8-popover p8-popover-${placement}`}
      style={{ left, top, "--arrow": `${arrow}px` } as CSSProperties}
      role="dialog"
      aria-label="Add what you know"
      // Keep canvas gestures (pan, deselect) from firing through the bubble.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p8-popover-head">
        <strong>Add what you know</strong>
        <button className="p8-popover-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className="p8-popover-topic">{title}</p>
      {inputs.length > 0 && (
        <ul className="p8-inputs">
          {inputs.map((input) => (
            <li key={input.id} style={{ "--side": SIDE_COLORS[input.side] } as CSSProperties}>
              <span className="p8-input-tag">{INPUT_SIDE_LABELS[input.side]}</span>
              <span className="p8-input-text">{input.text}</span>
              <button
                className="p8-input-remove"
                onClick={() => onRemove(input.id)}
                title="Remove this input"
                aria-label="Remove this input"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <InputBox
        stopped={stopped}
        busy={busy}
        prefill={prefill}
        onAdd={onAdd}
        onCancel={onClose}
      />
    </div>
  );
}
