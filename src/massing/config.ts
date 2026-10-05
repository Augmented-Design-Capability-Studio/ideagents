// Shared tuning for the massing-model engine (prototypes 6 and 7).

// Spec generation is structured output with arithmetic in it — closer to
// prototype 2's estimates than prototype 1's open-ended ideation.
export const TEMPERATURE = 0.3;

// Image models are a separate family from the text models in shared/config.ts.
// Which of these a given key can reach varies, so it's selectable in the UI.
export const IMAGE_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",
];

export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0];

export const IMAGE_MODEL_STORAGE_KEY = "massing_image_model";

export function getImageModel(): string {
  try {
    return localStorage.getItem(IMAGE_MODEL_STORAGE_KEY) ?? DEFAULT_IMAGE_MODEL;
  } catch {
    return DEFAULT_IMAGE_MODEL;
  }
}

export function setImageModel(model: string): void {
  try {
    localStorage.setItem(IMAGE_MODEL_STORAGE_KEY, model);
  } catch {
    // storage unavailable — the choice just won't persist
  }
}

// A viewport snapshot at devicePixelRatio 2 can be several megabytes of base64,
// which is a likely cause of image-request failures. Snapshots are downscaled
// to this longest edge and sent as JPEG instead.
export const SNAPSHOT_MAX_EDGE = 1024;
export const SNAPSHOT_QUALITY = 0.9;
