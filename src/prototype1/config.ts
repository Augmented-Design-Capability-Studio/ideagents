// Central configuration for the prototype. Everything tweakable lives here.
// Gemini connection config (model list, API key storage) is shared across
// all prototypes — see src/shared/config.ts.

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

export const ROUNDS_STORAGE_KEY = "ideation_rounds";
export const TURN_WORDS_STORAGE_KEY = "ideation_turn_words";
