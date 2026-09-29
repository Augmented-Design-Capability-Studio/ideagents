export interface Lens {
  id: string;
  name: string;
}

export type Priority = "showstopper" | "detail";
export type Confidence = "low" | "medium" | "high";
export type Triage = "unset" | "can-answer" | "needs-exploration" | "out-of-scope";

export interface Source {
  uri: string;
  title: string;
}

export interface Question {
  id: string;
  lensId: string;
  question: string;
  why: string;
  risksIntent: string;
  priority: Priority;
  confidence: Confidence;
  toPrepare: string;
  conflictWithBrief: string | null;
  triage: Triage;
  draftResponse: string;
}
