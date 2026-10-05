import { callGemini, callGeminiGrounded, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { dialLevelInfo, TEMPERATURE } from "./config";
import priorArtSystem from "./prompts/prior-art-system.txt?raw";
import challengeSystem from "./prompts/challenge-system.txt?raw";
import distanceSystem from "./prompts/distance-system.txt?raw";
import type { Evidence, PriorArtItem } from "./types";

export interface ImageInput {
  mimeType: string;
  base64Data: string;
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export async function getPriorArt(
  apiKey: string,
  concept: string,
  image: ImageInput | null,
  exclude: string[] = []
): Promise<PriorArtItem[]> {
  const user = [
    `Design concept:\n${concept}`,
    exclude.length
      ? `Already shown to the designer — do not repeat these, search harder for additional
items, including more unusual or adjacent-domain prior art they haven't
seen yet:\n${exclude.map((t) => `- ${t}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { text } = await callGeminiGrounded(apiKey, getModel(), priorArtSystem, user, {
    temperature: TEMPERATURE,
    image: image ?? undefined,
  });

  const raw = parseJSON<{
    items?: { title?: unknown; summary?: unknown; similarity?: unknown; link?: unknown }[];
  }>(text);
  if (!raw.items || !Array.isArray(raw.items)) {
    throw new Error('The model\'s response was missing an "items" array.');
  }

  return raw.items
    .filter(
      (i): i is { title: string; summary: string; similarity?: unknown; link?: unknown } =>
        typeof i.title === "string" &&
        i.title.trim().length > 0 &&
        typeof i.summary === "string" &&
        i.summary.trim().length > 0
    )
    .map((i) => ({
      title: i.title.trim(),
      summary: i.summary.trim(),
      similarity: clampScore(i.similarity),
      link: typeof i.link === "string" ? i.link.trim() : "",
    }));
}

export interface ChallengeFeedback {
  previousChallenge: string;
  reason: string;
}

export async function getChallenge(
  apiKey: string,
  concept: string,
  priorArt: PriorArtItem[],
  dialLevel: number,
  feedback?: ChallengeFeedback
): Promise<{ text: string; evidence: Evidence[] }> {
  const user = [
    `Design concept (current version):\n${concept}`,
    `Prior art already shown to the designer:\n${
      priorArt.length
        ? priorArt.map((p) => `- ${p.title}: ${p.summary}`).join("\n")
        : "(none yet)"
    }`,
    `Intensity level: ${dialLevel} of 5 — "${dialLevelInfo(dialLevel).label}": ${
      dialLevelInfo(dialLevel).description
    }`,
    feedback
      ? `The designer rated the previous challenge "not useful"${
          feedback.reason.trim() ? ` (reason: ${feedback.reason.trim()})` : ""
        }. Previous challenge: "${feedback.previousChallenge}". Write a DIFFERENT challenge —
change the angle or target a different assumption; do not just reword the
same one.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { text } = await callGeminiGrounded(apiKey, getModel(), challengeSystem, user, {
    temperature: TEMPERATURE,
  });

  const raw = parseJSON<{
    challenge?: unknown;
    evidence?: { text?: unknown; link?: unknown }[];
  }>(text);
  if (typeof raw.challenge !== "string" || !raw.challenge.trim()) {
    throw new Error("The model didn't return a challenge. Try again.");
  }

  const evidence: Evidence[] = Array.isArray(raw.evidence)
    ? raw.evidence
        .filter(
          (e): e is { text: string; link?: unknown } =>
            typeof e.text === "string" && e.text.trim().length > 0
        )
        .slice(0, 3)
        .map((e) => ({
          text: e.text.trim(),
          link: typeof e.link === "string" ? e.link.trim() : "",
        }))
    : [];

  return { text: raw.challenge.trim(), evidence };
}

export async function getDistance(
  apiKey: string,
  conceptV1: string,
  conceptVn: string
): Promise<number> {
  const user = [
    `Original concept (v1):\n${conceptV1}`,
    `Revised concept:\n${conceptVn}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), distanceSystem, user, {
    temperature: 0.3,
    json: true,
  });
  const raw = parseJSON<{ distance?: unknown }>(text);
  return clampScore(raw.distance);
}
