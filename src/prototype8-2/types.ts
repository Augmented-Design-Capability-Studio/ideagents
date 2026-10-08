// How you ended an argument. These are the same three edits as 8.1's outcomes,
// reframed from "a judge ruled" to "you argued": insist pushes the idea
// further, concede bounds it, synthesize makes it hold both.
export type Resolution = "insist" | "synthesize" | "concede";

export const RESOLUTIONS: Resolution[] = ["insist", "synthesize", "concede"];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  insist: "Insist",
  synthesize: "Synthesize",
  concede: "Concede",
};

export const RESOLUTION_BLURBS: Record<Resolution, string> = {
  insist: "You hold your ground — the idea goes further and takes the cost.",
  synthesize: "You find the version that answers them without giving up the point.",
  concede: "They're right — the idea gets bounded to deal with it.",
};

export const RESOLUTION_COLORS: Record<Resolution, string> = {
  insist: "#2e9e44",
  synthesize: "#7b4fb5",
  concede: "#c62828",
};

// Where one of your turns came from. Logged because "I picked the model's
// suggestion" is not the same act as "I wrote this", and a study that can't
// tell them apart is measuring the model's reasoning, not yours.
export type Provenance = "typed" | "selected" | "proxy";

export type Speaker = "expert" | "you";

export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  provenance?: Provenance;
}

export interface Round {
  id: string;
  expertId: string;
  // Set when this round is an old objection brought forward against the idea as
  // it now stands. Reopening never rewinds — the earlier round stays in the
  // record and nothing downstream of it is invalidated.
  reopenedFrom?: string;
  consideration: { title: string; text: string };
  turns: Turn[];
  // Short things you could say next, refreshed after each expert turn.
  talkingPoints: string[];
  resolution: Resolution | null;
  // Set once the round resolves and the idea moves on.
  ideaAfter: string | null;
  summaryAfter: string | null;
  carriedForward: string | null;
  whatChanged: string | null;
  status: "open" | "thinking" | "resolving" | "resolved" | "error";
  error: string | null;
}

export interface IdeaVersion {
  version: number;
  text: string;
  summary: string;
  // Drawn after the version exists, never blocking it. Each version's sketch is
  // conditioned on the previous one's so the series reads as one drawing
  // changing rather than unrelated pictures.
  image: string | null;
  imageStatus: "idle" | "loading" | "error";
  imageError: string | null;
}

// The working model of the designer. It is revised after every argument from
// what they actually said and how they ended it, and it is used to write turns
// on their behalf, to draft replies they might pick, and to let the experts aim
// at what they actually care about. Shown and editable, because a profile the
// designer can't see or correct is one the model is free to invent.
export interface Profile {
  // How they argue — register and manner.
  style: string;
  // What they consistently optimise for.
  priorities: string[];
  // Things they have refused to give up. Insisting adds to this.
  commitments: string[];
  // What they treat as negotiable. Conceding and synthesising add to this.
  flexible: string[];
  // The chips picked at setup, kept so the starting point stays visible.
  traits: string[];
  // One line on what the last revision changed, and how many rounds fed it.
  lastChange: string;
  roundsObserved: number;
  status: "idle" | "loading" | "error";
  error: string | null;
}

export function emptyProfile(traits: string[]): Profile {
  return {
    style: "",
    priorities: [],
    commitments: [],
    flexible: [],
    traits,
    lastChange: "",
    roundsObserved: 0,
    status: "idle",
    error: null,
  };
}
