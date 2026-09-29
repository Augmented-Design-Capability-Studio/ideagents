import { callGemini, callGeminiGrounded, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { TEMPERATURE } from "./config";
import lensesSystem from "./prompts/lenses-system.txt?raw";
import questionsSystem from "./prompts/questions-system.txt?raw";
import type { Confidence, Priority, Question, Source } from "./types";

export interface ImageInput {
  mimeType: string;
  base64Data: string;
}

export async function proposeLenses(
  apiKey: string,
  brief: string,
  concept: string,
  image: ImageInput | null
): Promise<string[]> {
  const user = [`Design brief:\n${brief}`, `Concept:\n${concept}`].join("\n\n");
  const text = await callGemini(apiKey, getModel(), lensesSystem, user, {
    temperature: TEMPERATURE,
    json: true,
    image: image ?? undefined,
  });
  const raw = parseJSON<unknown[]>(text);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("The model didn't return any lenses. Try again.");
  }
  return raw.filter((l): l is string => typeof l === "string" && l.trim().length > 0);
}

interface RawQuestion {
  question?: unknown;
  why?: unknown;
  risksIntent?: unknown;
  priority?: unknown;
  confidence?: unknown;
  toPrepare?: unknown;
  conflictWithBrief?: unknown;
}

const PRIORITIES: Priority[] = ["showstopper", "detail"];
const CONFIDENCES: Confidence[] = ["low", "medium", "high"];

export async function generateQuestions(
  apiKey: string,
  brief: string,
  concept: string,
  image: ImageInput | null,
  lensId: string,
  lensName: string
): Promise<{ questions: Question[]; sources: Source[] }> {
  const user = [
    `Design brief:\n${brief}`,
    `Concept:\n${concept}`,
    `Review lens: ${lensName}`,
  ].join("\n\n");

  const { text, sources } = await callGeminiGrounded(apiKey, getModel(), questionsSystem, user, {
    temperature: TEMPERATURE,
    image: image ?? undefined,
  });

  const raw = parseJSON<{ questions?: RawQuestion[] }>(text);
  if (!raw.questions || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error("The model didn't return any questions. Try again.");
  }

  const questions = raw.questions
    .filter(
      (q): q is Required<Pick<RawQuestion, "question" | "why" | "risksIntent" | "toPrepare">> &
        RawQuestion =>
        typeof q.question === "string" &&
        typeof q.why === "string" &&
        typeof q.risksIntent === "string" &&
        typeof q.toPrepare === "string"
    )
    .map((q, i) => ({
      id: `question-${lensId}-${i}-${Date.now()}`,
      lensId,
      question: (q.question as string).trim(),
      why: (q.why as string).trim(),
      risksIntent: (q.risksIntent as string).trim(),
      toPrepare: (q.toPrepare as string).trim(),
      priority: PRIORITIES.includes(q.priority as Priority)
        ? (q.priority as Priority)
        : "detail",
      confidence: CONFIDENCES.includes(q.confidence as Confidence)
        ? (q.confidence as Confidence)
        : "medium",
      conflictWithBrief:
        typeof q.conflictWithBrief === "string" && q.conflictWithBrief.trim()
          ? q.conflictWithBrief.trim()
          : null,
      triage: "unset" as const,
      draftResponse: "",
    }));

  return { questions, sources };
}
