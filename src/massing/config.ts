// Shared tuning for the massing-model engine (prototypes 6 and 7).

// Spec generation is structured output with arithmetic in it — closer to
// prototype 2's estimates than prototype 1's open-ended ideation.
export const TEMPERATURE = 0.3;

// A viewport snapshot at devicePixelRatio 2 can be several megabytes of base64,
// which is a likely cause of image-request failures. Snapshots are downscaled
// to this longest edge and sent as JPEG instead.
export const SNAPSHOT_MAX_EDGE = 1024;
export const SNAPSHOT_QUALITY = 0.9;
