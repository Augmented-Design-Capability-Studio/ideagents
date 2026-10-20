import { callGemini, generateImage, parseJSON } from "../shared/gemini";
import { getImageModel, getModel } from "../shared/storage";
import { debaterPair, MAX_DEPTH, RADICALITY_LABELS, TEMPERATURE } from "./config";
import rootSystem from "./prompts/root-system.txt?raw";
import debateSystem from "./prompts/debate-system.txt?raw";
import developSystem from "./prompts/develop-system.txt?raw";
import sketchPrompt from "./prompts/sketch-prompt.txt?raw";
import { levelOptions } from "./tree";
import {
  LEVEL_FOCUS,
  LEVELS,
  type Consideration,
  type Debate,
  type IdeaNode,
  type Level,
  type Outcome,
  type Side,
  type StopReason,
} from "./types";

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
        `v${i + 1} [${n.level}]${n.fromOutcome ? ` (after "${n.fromOutcome}" won)` : " (seed)"}: ${
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
        `${i + 1}. [${n.level}] ${n.consideration.title} — ${n.consideration.text}${
          n.fromOutcome ? ` [resolved as: ${n.fromOutcome}]` : ""
        }`
    )
    .join("\n");
}

// Who argues which side. The Proponent is "you" — the side arguing for the
// idea — and the Skeptic is the opponent. Every prompt gets the same brief, so
// the point raised falls inside the opponent's expertise and the debate is
// argued by the people the designer picked.
function sidesBrief(pairId: string): string {
  const pair = debaterPair(pairId);
  if (pair.id === "auto") {
    return [
      "Who argues:",
      "- Proponent (you, arguing for the idea): a perspective you choose",
      "- Skeptic (the opponent): no one assigned — pick the specific stakeholder whose expertise this point most depends on",
    ].join("\n");
  }
  return [
    "Who argues:",
    `- Proponent (you, arguing for the idea): ${pair.pro.role} — ${pair.pro.stance}`,
    `- Skeptic (the opponent): ${pair.con.role} — ${pair.con.stance}`,
  ].join("\n");
}

export async function generateRoot(
  apiKey: string,
  problem: string,
  seed: string,
  radicality: number,
  pairId: string
): Promise<{ ideaSummary: string; consideration: Consideration }> {
  const user = [
    `Design problem:\n${problem}`,
    `Seed idea:\n${seed}`,
    sidesBrief(pairId),
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
  const user = [
    `Design problem:\n${problem}`,
    `The idea as it stands:\n${node.ideaState}`,
    `Consideration point under debate:\n${node.consideration.title} — ${node.consideration.text}`,
    `Level of this consideration: ${node.level} — ${LEVEL_FOCUS[node.level]}`,
    `Path so far:\n${pathSummary(path.slice(0, -1))}`,
    `Radicality level: ${radicality} of 5 — ${RADICALITY_LABELS[radicality]}`,
    sidesBrief(pairId),
  ].join("\n\n");

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

// Sketches the idea at a node. When an ancestor already has one (the nearest
// sketched one — with sparse sketching it's often not the direct parent), it's
// passed as the input image so the branch reads as one drawing evolving rather than a
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
        "The supplied image is an EARLIER version of this same idea (possibly several steps back). Keep the same subject, viewpoint and drawing style, and change only what the description above says is different. This is one idea evolving, not a new one."
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
  radicality: number,
  pairId: string
): Promise<{
  ideaState: string;
  ideaSummary: string;
  carriedForward: string;
  whatChanged: string;
  consideration: Consideration;
  level: Level;
  stop: { reason: StopReason; note: string } | null;
}> {
  if (!node.debate) throw new Error("Run the debate before developing an outcome.");

  const levels = levelOptions(path);
  const allowed: Level[] = levels.mustDescend
    ? [levels.next as Level]
    : levels.next
      ? [levels.current, levels.next]
      : [levels.current];
  const levelBrief = [
    `Current level: ${levels.current} — ${LEVEL_FOCUS[levels.current]} (${levels.countAtLevel} consideration${
      levels.countAtLevel === 1 ? "" : "s"
    } argued at this level so far on this path)`,
    levels.mustDescend
      ? `You MUST move down: the new consideration goes at ${levels.next} — ${
          LEVEL_FOCUS[levels.next as Level]
        }`
      : `The new consideration may sit at: ${allowed.join(" or ")}`,
  ].join("\n");

  const user = [
    `Design problem:\n${problem}`,
    `How the idea has evolved so far:\n${evolutionSummary(path)}`,
    `The idea as it stands now (the version you are developing):\n${node.ideaState}`,
    `Consideration point:\n${node.consideration.title} — ${node.consideration.text}`,
    `Proponent (${node.debate.pro.speaker}): ${node.debate.pro.claim}\n${node.debate.pro.argument}`,
    `Skeptic (${node.debate.con.speaker}): ${node.debate.con.claim}\n${node.debate.con.argument}`,
    `Outcome to develop: ${outcome}`,
    levelBrief,
    sidesBrief(pairId),
    `Considerations already raised on this path (do not repeat):\n${pathSummary(path)}`,
    `Radicality level: ${radicality} of 5 — ${RADICALITY_LABELS[radicality]}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), developSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<Record<string, unknown>>(text);
  const carriedForward = str(raw.carriedForward);

  // The level must be one the path allows — never a skipped level, never back
  // up, and forced down once the current level is used up.
  const askedLevel = LEVELS.find((l) => l === raw.level);
  const level: Level = askedLevel && allowed.includes(askedLevel) ? askedLevel : allowed[0];

  return {
    ideaState: str(raw.ideaState, "(no idea state returned)"),
    ideaSummary: str(raw.ideaSummary),
    carriedForward,
    whatChanged: str(raw.whatChanged),
    consideration: toConsideration(raw.consideration),
    level,
    stop: decideStop(raw, level, carriedForward, node.depth + 1),
  };
}

// The model's stop judgement, with the rules that hold regardless of what it
// says: "settled" only means something at detail level, an empty
// carriedForward is drift by definition, and depth is capped.
function decideStop(
  raw: Record<string, unknown>,
  level: Level,
  carriedForward: string,
  depth: number
): { reason: StopReason; note: string } | null {
  const note = str(raw.statusReason);
  const status = raw.status;

  if (!carriedForward) {
    return { reason: "drifted", note: "Nothing substantial carried forward from the previous version." };
  }
  if (status === "settled" && level === "detail") {
    return { reason: "settled", note: note || "Nothing left that would split two reasonable people." };
  }
  if (status === "dead_end" || status === "drifted" || status === "circling") {
    return { reason: status, note };
  }
  if (depth >= MAX_DEPTH) {
    return { reason: "depth_limit", note: `Reached the ${MAX_DEPTH}-step limit for one branch.` };
  }
  return null;
}
