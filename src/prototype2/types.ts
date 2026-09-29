export interface Axis {
  id: string;
  name: string;
  // Whether a higher or lower value is better on this axis — needed to
  // normalize into a common "goodness" direction for the trade-off math.
  direction: "higher-better" | "lower-better";
  source: "engineering" | "qualitative";
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  // Set when a concept was suggested by the LLM to fill a gap, rather than
  // entered by the designer.
  aiSuggested?: boolean;
}

export interface Estimate {
  low: number;
  likely: number;
  high: number;
  justification: string;
}

// axisId -> conceptId -> estimate
export type EstimateTable = Record<string, Record<string, Estimate>>;

// axisId -> conceptId -> rating (1-5)
export type QualitativeRatings = Record<string, Record<string, number>>;

export interface Boundary {
  axisId: string;
  min: number;
}
