// Prior-art/challenge generation wants some variety (open-ended search and
// critique), unlike prototype 2's structured-estimate axes.
export const TEMPERATURE = 0.7;

export const MIN_DIAL = 1;
export const MAX_DIAL = 5;

export interface DialLevel {
  level: number;
  label: string;
  description: string;
  color: string;
}

// One source of truth for what each dial position means: the dial UI shows
// these to the designer, and the challenge prompt sends the same wording to
// the model, so the promise and the behavior stay in sync.
export const DIAL_LEVELS: DialLevel[] = [
  {
    level: 1,
    label: "Nudge",
    description: "Questions a small detail you could revisit without rethinking anything.",
    color: "#2e9e44",
  },
  {
    level: 2,
    label: "Probe",
    description: "Questions a choice you've made, but not the idea behind it.",
    color: "#7cb342",
  },
  {
    level: 3,
    label: "Push",
    description: "Questions a core mechanism your concept depends on.",
    color: "#e6a817",
  },
  {
    level: 4,
    label: "Shake",
    description: "Questions an assumption your whole approach rests on.",
    color: "#ef6c00",
  },
  {
    level: 5,
    label: "Overturn",
    description: "Questions an assumption the entire category shares — not just yours.",
    color: "#c62828",
  },
];

export function dialLevelInfo(level: number): DialLevel {
  return DIAL_LEVELS[Math.min(MAX_DIAL, Math.max(MIN_DIAL, Math.round(level))) - 1];
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const EVENTS_STORAGE_KEY = "radical_tool_events";
export const SETTINGS_STORAGE_KEY = "radical_tool_settings";
