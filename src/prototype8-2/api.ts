import { callGemini, generateImage, parseJSON } from "../shared/gemini";
import { getImageModel, getModel } from "../shared/storage";
import { expert, PROXY_TURN_WINDOW, TEMPERATURE } from "./config";
import openRoundSystem from "./prompts/open-round-system.txt?raw";
import expertReplySystem from "./prompts/expert-reply-system.txt?raw";
import proxySystem from "./prompts/proxy-system.txt?raw";
import resolveSystem from "./prompts/resolve-system.txt?raw";
import profileSystem from "./prompts/profile-system.txt?raw";
import sketchPrompt from "./prompts/sketch-prompt.txt?raw";
import type { Profile, Resolution, Round, Turn } from "./types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function points(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim())
    .slice(0, 4);
}

function list(label: string, items: string[]): string {
  return `${label}: ${items.length ? items.map((i) => `- ${i}`).join("\n") : "(nothing yet)"}`;
}

export function profileBrief(profile: Profile): string {
  return [
    "Profile of the designer:",
    profile.style ? `Style: ${profile.style}` : "Style: (not yet observed)",
    profile.traits.length ? `They describe themselves as: ${profile.traits.join(", ")}` : "",
    list("What they optimise for", profile.priorities),
    list("What they have refused to give up", profile.commitments),
    list("What they treat as negotiable", profile.flexible),
  ]
    .filter(Boolean)
    .join("\n");
}

function expertBrief(expertId: string): string {
  const e = expert(expertId);
  return `You are the ${e.role}. You argue from ${e.concerns}.`;
}

const ENDED_WITH: Record<Resolution, string> = {
  insist:
    "the designer held their ground and pushed the idea further along the same line, accepting the cost you named.",
  synthesize:
    "the designer found something that holds both your point and theirs, and the idea gained it.",
  concede:
    "the designer gave you the point and the idea was narrowed or qualified to fit.",
};

export function transcript(round: Round): string {
  if (round.turns.length === 0) return "(nothing said yet)";
  return round.turns
    .map((t) => `${t.speaker === "you" ? "Designer" : expert(round.expertId).role}: ${t.text}`)
    .join("\n\n");
}

export async function openRound(
  apiKey: string,
  idea: string,
  expertId: string,
  pastConsiderations: string[],
  profile: Profile,
  reopen?: { consideration: { title: string; text: string }; priorTranscript: string; priorResolution: Resolution }
): Promise<{ consideration: { title: string; text: string }; opening: string; talkingPoints: string[] }> {
  const user = [
    expertBrief(expertId),
    profileBrief(profile),
    `The designer's idea:\n${idea}`,
    reopen
      ? [
          "THIS IS A RETURN TO AN EARLIER ARGUMENT.",
          `The point, unchanged:\n${reopen.consideration.title} — ${reopen.consideration.text}`,
          `How it went last time:\n${reopen.priorTranscript}`,
          `How it ended last time: ${ENDED_WITH[reopen.priorResolution]}`,
          "The idea above is the version AFTER that ending and everything since.",
        ].join("\n\n")
      : `Already argued about — do not raise these again:\n${
          pastConsiderations.length
            ? pastConsiderations.map((c) => `- ${c}`).join("\n")
            : "(nothing yet)"
        }`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), openRoundSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  const consideration = (raw.consideration ?? {}) as Record<string, unknown>;

  return {
    consideration: reopen
      ? reopen.consideration
      : {
          text: str(consideration.text, "No consideration returned."),
          title: str(consideration.title, "Consideration"),
        },
    opening: str(raw.opening, "(no opening argument returned)"),
    talkingPoints: points(raw.talkingPoints),
  };
}

export async function expertReply(
  apiKey: string,
  idea: string,
  round: Round,
  profile: Profile
): Promise<{ reply: string; talkingPoints: string[] }> {
  const user = [
    expertBrief(round.expertId),
    profileBrief(profile),
    `The designer's idea:\n${idea}`,
    `The point under argument:\n${round.consideration.title} — ${round.consideration.text}`,
    `The argument so far:\n${transcript(round)}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), expertReplySystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  return {
    reply: str(raw.reply, "(no reply returned)"),
    talkingPoints: points(raw.talkingPoints),
  };
}

// Writes your next turn as you. Leans on what you've actually written this
// session rather than the self-description, which is only a hint.
export async function proxyTurn(
  apiKey: string,
  idea: string,
  round: Round,
  profile: Profile,
  yourPastTurns: Turn[]
): Promise<string> {
  const recent = yourPastTurns.slice(-PROXY_TURN_WINDOW);
  const user = [
    `The designer's idea:\n${idea}`,
    `The point under argument:\n${round.consideration.title} — ${round.consideration.text}`,
    `The argument so far:\n${transcript(round)}`,
    profileBrief(profile),
    `The designer's own previous turns this session, most recent last:\n${
      recent.length ? recent.map((t) => `"${t.text}"`).join("\n\n") : "(none yet)"
    }`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await callGemini(apiKey, getModel(), proxySystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  return str(parseJSON<Record<string, unknown>>(text).turn, "(no turn returned)");
}

export async function resolveRound(
  apiKey: string,
  idea: string,
  round: Round,
  resolution: Resolution
): Promise<{
  carriedForward: string;
  whatChanged: string;
  ideaState: string;
  ideaSummary: string;
}> {
  const user = [
    `The idea as it stands:\n${idea}`,
    `The point argued:\n${round.consideration.title} — ${round.consideration.text}`,
    `Argued with: ${expert(round.expertId).role}`,
    `The argument:\n${transcript(round)}`,
    `How it ended: ${resolution}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), resolveSystem, user, {
    temperature: 0.6,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  return {
    carriedForward: str(raw.carriedForward),
    whatChanged: str(raw.whatChanged),
    ideaState: str(raw.ideaState, idea),
    ideaSummary: str(raw.ideaSummary),
  };
}

// Revises the profile from the round that just ended. Runs automatically after
// every resolution, and on demand from the panel.
export async function reviseProfile(
  apiKey: string,
  profile: Profile,
  round: Round,
  resolution: Resolution
): Promise<{
  style: string;
  priorities: string[];
  commitments: string[];
  flexible: string[];
  changeNote: string;
}> {
  const turns = round.turns
    .map((t) => {
      if (t.speaker !== "you") return `${expert(round.expertId).role}: ${t.text}`;
      const tag = t.provenance === "proxy" ? "Designer (written by their proxy)" : "Designer";
      return `${tag}: ${t.text}`;
    })
    .join("\n\n");

  const user = [
    profileBrief(profile),
    `The point argued:\n${round.consideration.title} — ${round.consideration.text}`,
    `The argument:\n${turns}`,
    `How the designer ended it: ${resolution}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), profileSystem, user, {
    temperature: 0.4,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  const strings = (v: unknown, fallback: string[]): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, 4)
      : fallback;

  return {
    style: str(raw.style, profile.style),
    priorities: strings(raw.priorities, profile.priorities),
    commitments: strings(raw.commitments, profile.commitments),
    flexible: strings(raw.flexible, profile.flexible),
    changeNote: str(raw.changeNote),
  };
}

// Sketches a version of the idea. When the previous version already has one it
// is passed as the input image, so the series reads as one drawing evolving.
export async function sketchIdea(
  apiKey: string,
  ideaText: string,
  previousImageDataUrl: string | null
): Promise<string> {
  const parts = [sketchPrompt, `The idea:\n${ideaText}`];

  let input: { mimeType: string; base64Data: string } | undefined;
  if (previousImageDataUrl) {
    const comma = previousImageDataUrl.indexOf(",");
    const mime = /^data:([^;]+)/.exec(previousImageDataUrl);
    if (comma > -1 && mime) {
      input = { mimeType: mime[1], base64Data: previousImageDataUrl.slice(comma + 1) };
      parts.push(
        "The supplied image is the PREVIOUS version of this same idea. Keep the same subject, viewpoint and drawing style, and change only what the description above says is different. This is one idea evolving, not a new one."
      );
    }
  }

  const result = await generateImage(apiKey, getImageModel(), parts.join("\n\n"), input, "4:3");
  return `data:${result.mimeType};base64,${result.base64Data}`;
}
