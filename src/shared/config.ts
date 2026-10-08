// Shared Gemini connection config, used by every prototype's Agent
// button/dialog. Prototype-specific tuning (temperature, rounds, word caps,
// etc.) stays in each prototype's own config.ts.

// Model list current as of September 2026 (https://ai.google.dev/gemini-api/docs/models).
// The selected model is chosen in the Agent dialog and stored in local storage.
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

export const API_KEY_STORAGE_KEY = "gemini_api_key";
export const MODEL_STORAGE_KEY = "gemini_model";

// Image generation (Nano Banana) is a separate model family from the text
// models above. Which of these a given key can reach varies, so it's
// selectable in the Agent dialog.
export const IMAGE_MODEL_OPTIONS = [
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",
];

export const DEFAULT_IMAGE_MODEL = IMAGE_MODEL_OPTIONS[0];

export const IMAGE_MODEL_STORAGE_KEY = "gemini_image_model";
