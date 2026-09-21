// Central configuration for the prototype. Everything tweakable lives here.

// Model list current as of September 2026 (https://ai.google.dev/gemini-api/docs/models).
// The selected model is chosen in the Settings dialog and stored in local storage.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export const GEMINI_MODEL_OPTIONS = [
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

export const TEMPERATURE = 1.0;

// All mechanisms run for the same number of rounds (adjustable in Settings;
// this is the default). Conversational mechanisms: agents take turns on a shared
// transcript each round. Independent exploration: each explorer deepens its own
// idea each round without seeing the others. At R rounds, every condition costs
// 4 * R + 1 API calls.
export const DEFAULT_ROUNDS = 2;
export const MAX_ROUNDS = 5;

export const AGENTS_PER_DISCUSSION = 4;

// Approximate word cap for a single agent turn (adjustable in Settings; this is
// the default). Injected into the shared system prompt. The synthesis/curator
// prompts define their own lengths and are unaffected.
export const DEFAULT_TURN_WORDS = 80;
export const MIN_TURN_WORDS = 40;
export const MAX_TURN_WORDS = 200;

// Independent exploration runs this many isolated agents, then one curator.
export const INDEPENDENT_EXPLORERS = 4;

export const API_KEY_STORAGE_KEY = "gemini_api_key";
export const MODEL_STORAGE_KEY = "gemini_model";
export const ROUNDS_STORAGE_KEY = "ideation_rounds";
export const TURN_WORDS_STORAGE_KEY = "ideation_turn_words";
