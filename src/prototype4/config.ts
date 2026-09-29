export const TEMPERATURE = 0.4;

export const CANDIDATE_LENSES = [
  "Structural",
  "Safety",
  "Regulatory",
  "Materials",
  "Manufacturing",
  "Operations",
  "Cost",
  "Accessibility standards",
];

// Data URLs this large would blow up localStorage/requests unreasonably —
// the image only needs to be legible to the model, not print quality.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
