// Prototype-6-specific config. The massing engine itself (materials,
// temperature, image models, geometry limits) lives in src/massing/.

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface SampleConcept {
  label: string;
  text: string;
}

// Deliberately the same concepts the other prototypes use as samples, so the
// suite can be demoed end-to-end on one brief.
export const SAMPLES: SampleConcept[] = [
  {
    label: "Perforated headrest window",
    text: "A perforated panel set into the rear-seat headrest of a vehicle, so passengers behind can see through it. Hexagonal perforation pattern, thin moulded panel in a rounded rectangular opening.",
  },
  {
    label: "Vehicle rear cabin",
    text: "The rear cabin of a vehicle, redesigned to feel less claustrophobic without changing the roofline — larger side glazing, slimmer front seat backs, and a glazed panel above the rear bench.",
  },
  {
    label: "Stove lever knob",
    text: "A large lever-style stove knob that turns with a push-and-rotate motion instead of a pinch grip, for users with limited hand strength. Raised tactile indicator marks the off position.",
  },
  {
    label: "Museum audio guide",
    text: "A handheld audio guide for visually impaired museum visitors, with directional haptic buzzes that pulse more strongly as the visitor turns toward the next exhibit.",
  },
  {
    label: "Interior material study",
    text: "A material study for a vehicle interior door panel surface: a gently curved upper panel area, exploring warm, durable, cleanable finishes with a recycled-content story.",
  },
];
