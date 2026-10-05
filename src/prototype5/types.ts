export interface PriorArtItem {
  title: string;
  summary: string;
  // 0 (barely related) to 100 (near-identical) to the current concept —
  // used to position this item in the optional graph view.
  similarity: number;
  link: string;
}

export interface Evidence {
  text: string;
  link: string;
}

export interface Challenge {
  id: string;
  text: string;
  dialLevel: number;
  evidence: Evidence[];
}

export type RatingValue = "up" | "down";

export interface Rating {
  value: RatingValue | null;
  reason: string;
}

export interface ConceptImage {
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}

export interface ConceptVersion {
  version: number;
  text: string;
  image: ConceptImage | null;
  timestamp: number;
  // Short diff/summary vs. the previous version ("Initial concept" for v1).
  summary: string;
  // 0-100 drift from v1; always 0 for v1 itself.
  distance: number;
  // Every challenge shown while this version was the active one, including
  // any regenerated after a "not useful" rating — kept so the history panel
  // can show them collapsed per version.
  challenges: Challenge[];
}

export type LogEventType =
  | "session-start"
  | "concept-submitted"
  | "prior-art-shown"
  | "prior-art-more"
  | "challenge-shown"
  | "challenge-regenerated"
  | "rating"
  | "skip"
  | "revision"
  | "session-end";

export interface LogEvent {
  id: string;
  timestamp: number;
  type: LogEventType;
  payload: Record<string, unknown>;
}

export type DialMode = "escalating" | "fixed" | "locked";

export interface StudySettings {
  participantId: string;
  condition: string;
  dialMode: DialMode;
  // The level used when dialMode is "fixed" or "locked".
  fixedDialLevel: number;
}
