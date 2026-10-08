import { VOICE_TRAITS } from "../config";
import type { Profile } from "../types";

interface Props {
  profile: Profile;
  started: boolean;
  onChange: (patch: Partial<Profile>) => void;
  onToggleTrait: (trait: string) => void;
  onRevise: () => void;
  canRevise: boolean;
}

// A short editable list. Entries are terse noun phrases, so a row of inputs
// beats a textarea — the shape of the list is the point.
function EditableList({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="q-profile-field">
      <h3>{label}</h3>
      <p className="q-hint">{hint}</p>
      {items.map((item, i) => (
        <div className="q-profile-row" key={i}>
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button className="q-profile-add" onClick={() => onChange([...items, ""])}>
        + Add
      </button>
    </div>
  );
}

export function ProfilePanel({
  profile,
  started,
  onChange,
  onToggleTrait,
  onRevise,
  canRevise,
}: Props) {
  return (
    <aside className="q-profile">
      <div className="section-header">
        <h2>Your proxy</h2>
        <button onClick={onRevise} disabled={!canRevise || profile.status === "loading"}>
          {profile.status === "loading" ? "Reading…" : "Re-read me"}
        </button>
      </div>
      <p className="q-hint">
        {profile.roundsObserved === 0
          ? "Updates itself after every argument you finish. Edit anything — your edits are what it revises from next time."
          : `Revised after ${profile.roundsObserved} argument${
              profile.roundsObserved === 1 ? "" : "s"
            }. Edit anything; your edits are what it revises from next time.`}
      </p>

      {profile.lastChange && <p className="q-profile-change">{profile.lastChange}</p>}
      {profile.error && <p className="q-error">{profile.error}</p>}

      <div className="q-profile-field">
        <h3>How you argue</h3>
        <textarea
          rows={3}
          value={profile.style}
          placeholder="Filled in once you've argued a round or two."
          onChange={(e) => onChange({ style: e.target.value })}
        />
      </div>

      <EditableList
        label="What you optimise for"
        hint="Drawn from what you keep coming back to."
        items={profile.priorities}
        onChange={(priorities) => onChange({ priorities })}
      />

      <EditableList
        label="Won't give up"
        hint="Grows when you insist."
        items={profile.commitments}
        onChange={(commitments) => onChange({ commitments })}
      />

      <EditableList
        label="Negotiable"
        hint="Grows when you concede or synthesize."
        items={profile.flexible}
        onChange={(flexible) => onChange({ flexible })}
      />

      <div className="q-profile-field">
        <h3>Self-description</h3>
        <p className="q-hint">
          {started
            ? "Your starting hint. The observed behaviour above outweighs it."
            : "A starting hint, before there's anything to observe."}
        </p>
        <div className="q-chips q-chips-small">
          {VOICE_TRAITS.map((t) => (
            <button
              key={t}
              className={`q-chip ${profile.traits.includes(t) ? "q-chip-on" : ""}`}
              onClick={() => onToggleTrait(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
