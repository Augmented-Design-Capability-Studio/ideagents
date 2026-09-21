import {
  API_KEY_STORAGE_KEY,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ROUNDS,
  DEFAULT_TURN_WORDS,
  MAX_ROUNDS,
  MAX_TURN_WORDS,
  MIN_TURN_WORDS,
  MODEL_STORAGE_KEY,
  ROUNDS_STORAGE_KEY,
  TURN_WORDS_STORAGE_KEY,
} from "./config";

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function getModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_GEMINI_MODEL;
}

export function setModel(model: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

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
