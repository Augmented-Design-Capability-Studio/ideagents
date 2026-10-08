export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Each configuration panel runs its own WebGL context; browsers cap those at
// roughly a dozen (Chrome drops the oldest past 16), so stay well under that.
export const MAX_CONFIGS = 8;

export const CABIN_CONCEPT =
  "The rear cabin of a vehicle, redesigned to feel less claustrophobic without changing the roofline — larger side glazing, slimmer front seat backs, and a glazed panel above the rear bench.";

export interface SampleConcept {
  label: string;
  text: string;
}

export const SAMPLES: SampleConcept[] = [
  { label: "Vehicle rear cabin", text: CABIN_CONCEPT },
  {
    label: "Perforated headrest window",
    text: "A perforated panel set into the rear-seat headrest of a vehicle, so passengers behind can see through it. Hexagonal perforation pattern, thin moulded panel in a rounded rectangular opening.",
  },
  {
    label: "Stove lever knob",
    text: "A large lever-style stove knob that turns with a push-and-rotate motion instead of a pinch grip, for users with limited hand strength.",
  },
];
