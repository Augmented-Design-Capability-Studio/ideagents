import {
  DEFAULT_ROUNDS,
  DEFAULT_TURN_WORDS,
  MAX_ROUNDS,
  MAX_TURN_WORDS,
  MIN_TURN_WORDS,
  ROUNDS_STORAGE_KEY,
  TURN_WORDS_STORAGE_KEY,
} from "./config";

export function getRounds(): number {
  const n = parseInt(localStorage.getItem(ROUNDS_STORAGE_KEY) ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ROUNDS;
  return Math.min(n, MAX_ROUNDS);
}

export function setRounds(rounds: number): void {
  localStorage.setItem(ROUNDS_STORAGE_KEY, String(rounds));
}

export function getTurnWords(): number {
  const n = parseInt(localStorage.getItem(TURN_WORDS_STORAGE_KEY) ?? "", 10);
  if (!Number.isFinite(n)) return DEFAULT_TURN_WORDS;
  return Math.min(Math.max(n, MIN_TURN_WORDS), MAX_TURN_WORDS);
}

export function setTurnWords(words: number): void {
  localStorage.setItem(TURN_WORDS_STORAGE_KEY, String(words));
}
