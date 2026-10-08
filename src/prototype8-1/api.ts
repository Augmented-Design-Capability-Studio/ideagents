import { callGemini, generateImage, parseJSON } from "../shared/gemini";
import { getImageModel, getModel } from "../shared/storage";
import { debaterPair, RADICALITY_LABELS, TEMPERATURE } from "./config";
import rootSystem from "./prompts/root-system.txt?raw";
import debateSystem from "./prompts/debate-system.txt?raw";
import developSystem from "./prompts/develop-system.txt?raw";
import sketchPrompt from "./prompts/sketch-prompt.txt?raw";
import type { Consideration, Debate, IdeaNode, Outcome, Side } from "./types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function toConsideration(raw: unknown): Consideration {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    title: str(c.title, "Consideration"),
    text: str(c.text, "No consideration text returned."),
    kind: str(c.kind, "perspective"),
  };
}

function toSide(raw: unknown, fallbackSpeaker: string): Side {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    speaker: str(s.speaker, fallbackSpeaker),
    claim: str(s.claim, "(no claim)"),
    argument: str(s.argument, "(no argument)"),
    wouldChangeMyMind: str(s.wouldChangeMyMind, "(did not name a falsifier)"),
  };
}

// The chain of idea versions so far. Without this the developer only sees the
// immediate parent's restatement, and a commitment made three moves back can
// quietly evaporate.
function evolutionSummary(path: IdeaNode[]): string {
  if (path.length === 0) return "(nothing yet)";
  return path
    .map(
      (n, i) =>
        `v${i + 1}${n.fromOutcome ? ` (after "${n.fromOutcome}" won)` : " (seed)"}: ${
          n.ideaSummary || n.ideaState
        }`
    )
    .join("\n");
}

function pathSummary(path: IdeaNode[]): string {
  if (path.length === 0) return "(none yet)";
  return path
    .map(
      (n, i) =>
        `${i + 1}. ${n.consideration.title} — ${n.consideration.text}${
          n.fromOutcome ? ` [resolved as: ${n.fromOutcome}]` : ""
        }`
    )
    .join("\n");
}

export async function generateRoot(
  apiKey: string,
  problem: string,
  seed: string,
  radicality: number
): Promise<{ ideaSummary: string; consideration: Consideration }> {
  const user = [
    `Design problem:\n${problem}`,
    `Seed idea:\n${seed}`,
    `Radicality level: ${radicality} of 5 — ${RADICALITY_LABELS[radicality]}`,
  ].join("\n\n");
  const text = await callGemini(apiKey, getModel(), rootSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  return {
    ideaSummary: str(raw.ideaSummary),
    consideration: toConsideration(raw.consideration),
  };
}

export async function runDebate(
  apiKey: string,
  problem: string,
  node: IdeaNode,
  path: IdeaNode[],
  radicality: number,
  pairId: string
): Promise<Debate> {
  const pair = debaterPair(pairId);
  const roles =
    pair.id === "auto"
      ? ""
      : [
          `Assigned roles:`,
          `- Proponent speaks as: ${pair.pro.role} — ${pair.pro.stance}`,
          `- Skeptic speaks as: ${pair.con.role} — ${pair.con.stance}`,
        ].join("\n");

  const user = [
    `Design problem:\n${problem}`,
    `The idea as it stands:\n${node.ideaState}`,
    `Consideration point under debate:\n${node.consideration.title} — ${node.consideration.text}`,
    `Path so far:\n${pathSummary(path.slice(0, -1))}`,
    `Radicality level: ${radicality} of 5 — ${RADICALITY_LABELS[radicality]}`,
    roles,
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await callGemini(apiKey, getModel(), debateSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  const suggested = raw.suggestedWinner;
  return {
    pro: toSide(raw.pro, "Proponent"),
    con: toSide(raw.con, "Skeptic"),
    suggestedWinner:
      suggested === "proponent" || suggested === "skeptic" || suggested === "synthesis"
        ? suggested
        : "synthesis",
    suggestionReason: str(raw.suggestionReason),
  };
}

// Sketches the idea at a node. When the parent already has one, it's passed as
// the input image so the branch reads as one drawing evolving rather than a
// set of unrelated pictures — the visual counterpart of the continuity rule in
// the develop prompt.
export async function generateSketch(
  apiKey: string,
  problem: string,
  node: IdeaNode,
  parentImageDataUrl: string | null
): Promise<string> {
  const parts = [sketchPrompt, `Design problem:\n${problem}`, `The idea:\n${node.ideaState}`];

  let input: { mimeType: string; base64Data: string } | undefined;
  if (parentImageDataUrl) {
    const comma = parentImageDataUrl.indexOf(",");
    const mimeMatch = /^data:([^;]+)/.exec(parentImageDataUrl);
    if (comma > -1 && mimeMatch) {
      input = { mimeType: mimeMatch[1], base64Data: parentImageDataUrl.slice(comma + 1) };
      parts.push(
        "The supplied image is the PREVIOUS version of this same idea. Keep the same subject, viewpoint and drawing style, and change only what the description above says is different. This is one idea evolving, not a new one."
      );
    }
  }

  const result = await generateImage(apiKey, getImageModel(), parts.join("\n\n"), input, "4:3");
  return `data:${result.mimeType};base64,${result.base64Data}`;
}

export async function developOutcome(
  apiKey: string,
  problem: string,
  node: IdeaNode,
  path: IdeaNode[],
  outcome: Outcome,
  radicality: number
): Promise<{
  ideaState: string;
  ideaSummary: string;
  carriedForward: string;
  whatChanged: string;
  consideration: Consideration;
}> {
  if (!node.debate) throw new Error("Run the debate before developing an outcome.");

  const user = [
    `Design problem:\n${problem}`,
    `How the idea has evolved so far:\n${evolutionSummary(path)}`,
    `The idea as it stands now (the version you are developing):\n${node.ideaState}`,
    `Consideration point:\n${node.consideration.title} — ${node.consideration.text}`,
    `Proponent (${node.debate.pro.speaker}): ${node.debate.pro.claim}\n${node.debate.pro.argument}`,
    `Skeptic (${node.debate.con.speaker}): ${node.debate.con.claim}\n${node.debate.con.argument}`,
    `Outcome to develop: ${outcome}`,
    `Considerations already raised on this path (do not repeat):\n${pathSummary(path)}`,
    `Radicality level: ${radicality} of 5 — ${RADICALITY_LABELS[radicality]}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), developSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  return {
    ideaState: str(raw.ideaState, "(no idea state returned)"),
    ideaSummary: str(raw.ideaSummary),
    carriedForward: str(raw.carriedForward),
    whatChanged: str(raw.whatChanged),
    consideration: toConsideration(raw.consideration),
  };
}
