import { useState } from "react";
import { MAX_ROUNDS, MAX_TURN_WORDS, MIN_TURN_WORDS } from "../config";
import { getRounds, getTurnWords, setRounds, setTurnWords } from "../storage";

interface Props {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: Props) {
  const [rounds, setRoundsState] = useState(getRounds());
  const [turnWords, setTurnWordsState] = useState(getTurnWords());

  const changeRounds = (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, 1), MAX_ROUNDS);
    setRounds(clamped);
    setRoundsState(clamped);
  };

  const changeTurnWords = (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, MIN_TURN_WORDS), MAX_TURN_WORDS);
    setTurnWords(clamped);
    setTurnWordsState(clamped);
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label className="dialog-field">
          Rounds per run (applies to all mechanisms)
          <input
            type="number"
            min={1}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={(e) => changeRounds(e.target.value)}
          />
        </label>
        <p className="dialog-note">
          Conversational mechanisms: agents take turns on a shared transcript each
          round. Independent exploration: each explorer deepens its own idea each
          round. Every run costs 4 x rounds + 1 API calls.
        </p>
        <label className="dialog-field">
          Max words per agent turn: {turnWords}
          <input
            type="range"
            min={MIN_TURN_WORDS}
            max={MAX_TURN_WORDS}
            step={10}
            value={turnWords}
            onChange={(e) => changeTurnWords(e.target.value)}
          />
        </label>
        <p className="dialog-note">
          Applies to every agent turn in all four modes, so lengths stay
          comparable. The final synthesis is unaffected. An approximate target,
          not a hard cutoff.
        </p>
        <div className="dialog-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
