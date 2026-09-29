import { callGemini, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { TEMPERATURE } from "./config";
import axesSystem from "./prompts/axes-system.txt?raw";
import estimateSystem from "./prompts/estimate-system.txt?raw";
import gapSystem from "./prompts/gap-system.txt?raw";
import type { Axis, Concept, Estimate } from "./types";

function clampScore(n: unknown, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(10, Math.max(1, v));
}

export async function proposeAxes(
  apiKey: string,
  brief: string,
  concepts: Concept[]
): Promise<Axis[]> {
  const user = [
    `Design brief:\n${brief}`,
    `Concepts:\n${concepts.map((c) => `- ${c.name}: ${c.description}`).join("\n")}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), axesSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<{ name?: unknown; direction?: unknown }[]>(text);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("The model didn't return any axes. Try again.");
  }

  return raw
    .filter((a) => typeof a.name === "string" && a.name.trim())
    .map((a, i) => ({
      id: `axis-${i}-${Date.now()}`,
      name: (a.name as string).trim(),
      direction: a.direction === "lower-better" ? "lower-better" : "higher-better",
      source: "engineering" as const,
    }));
}

interface RawEstimateEntry {
  conceptId?: unknown;
  axisId?: unknown;
  low?: unknown;
  likely?: unknown;
  high?: unknown;
  justification?: unknown;
}

// axisId -> conceptId -> Estimate
export async function estimateConcepts(
  apiKey: string,
  brief: string,
  concepts: Concept[],
  axes: Axis[]
): Promise<Record<string, Record<string, Estimate>>> {
  const user = [
    `Design brief:\n${brief}`,
    `Concepts:\n${concepts
      .map((c) => `- id=${c.id} name=${c.name}: ${c.description}`)
      .join("\n")}`,
    `Axes:\n${axes
      .map((a) => `- id=${a.id} name=${a.name} direction=${a.direction}`)
      .join("\n")}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), estimateSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<{ estimates?: RawEstimateEntry[] }>(text);
  if (!raw.estimates || !Array.isArray(raw.estimates)) {
    throw new Error("The model's response was missing an \"estimates\" array.");
  }

  const table: Record<string, Record<string, Estimate>> = {};
  for (const axis of axes) table[axis.id] = {};

  for (const e of raw.estimates) {
    const axisId = typeof e.axisId === "string" ? e.axisId : null;
    const conceptId = typeof e.conceptId === "string" ? e.conceptId : null;
    if (!axisId || !conceptId || !table[axisId]) continue;
    if (!concepts.some((c) => c.id === conceptId)) continue;

    const likely = clampScore(e.likely, 5);
    let low = clampScore(e.low, likely);
    let high = clampScore(e.high, likely);
    if (low > likely) low = likely;
    if (high < likely) high = likely;

    table[axisId][conceptId] = {
      low,
      likely,
      high,
      justification:
        typeof e.justification === "string" && e.justification.trim()
          ? e.justification.trim()
          : "(no justification given)",
    };
  }

  const missing = axes.some((a) =>
    concepts.some((c) => !table[a.id]?.[c.id])
  );
  if (missing) {
    throw new Error(
      "The model didn't estimate every concept x axis pair. Try again."
    );
  }

  return table;
}

export async function suggestGapConcept(
  apiKey: string,
  brief: string,
  concepts: Concept[],
  xAxisName: string,
  yAxisName: string,
  regionDescription: string
): Promise<{ name: string; description: string }> {
  const user = [
    `Design brief:\n${brief}`,
    `Existing concepts:\n${concepts.map((c) => `- ${c.name}: ${c.description}`).join("\n")}`,
    `Plot axes: X = ${xAxisName}, Y = ${yAxisName}`,
    `Empty region to fill: ${regionDescription}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), gapSystem, user, {
    temperature: 0.9,
    json: true,
  });
  const raw = parseJSON<{ name?: unknown; description?: unknown }>(text);
  if (typeof raw.name !== "string" || typeof raw.description !== "string") {
    throw new Error("The model's response was missing a name/description.");
  }
  return { name: raw.name.trim(), description: raw.description.trim() };
}
