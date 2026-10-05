import { callGemini, generateImage, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { getImageModel, TEMPERATURE } from "./config";
import { MATERIALS, material } from "./materials";
import sceneSystem from "./prompts/scene-system.txt?raw";
import renderSystem from "./prompts/render-system.txt?raw";
import type {
  ConceptKind,
  Constraint,
  Implication,
  Parameter,
  SceneNode,
  SceneSpec,
  SceneState,
  ShapeKind,
} from "./types";

export interface ImageInput {
  mimeType: string;
  base64Data: string;
}

const KINDS: ConceptKind[] = ["part", "space", "material", "mechanism"];
const SHAPES: ShapeKind[] = ["box", "plate", "cylinder", "sphere", "lathe", "extrude"];

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

// The model's JSON drives a renderer and a formula evaluator, so everything is
// coerced into shape here rather than trusted — a bad shape name or a missing
// material would otherwise surface as a blank canvas with no explanation.
function sanitizeParameters(raw: unknown): Parameter[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Parameter[] = [];
  for (const p of raw as Record<string, unknown>[]) {
    const id = str(p?.id);
    if (!id || seen.has(id) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) continue;
    const min = num(p?.min, 1);
    const max = num(p?.max, Math.max(min + 1, 100));
    const def = Math.min(max, Math.max(min, num(p?.default, (min + max) / 2)));
    seen.add(id);
    out.push({
      id,
      name: str(p?.name, id),
      unit: str(p?.unit, "mm"),
      min,
      max: Math.max(max, min + 0.001),
      default: def,
    });
  }
  return out.slice(0, 8);
}

function sanitizeNodes(raw: unknown): SceneNode[] {
  if (!Array.isArray(raw)) return [];
  const out: SceneNode[] = [];
  for (const [i, n] of (raw as Record<string, unknown>[]).entries()) {
    const shape = str(n?.shape) as ShapeKind;
    if (!SHAPES.includes(shape)) continue;
    const materialId = str(n?.materialId);
    out.push({
      ...(n as object),
      id: str(n?.id, `node-${i}`),
      label: str(n?.label, `Part ${i + 1}`),
      shape,
      materialId: MATERIALS.some((m) => m.id === materialId) ? materialId : MATERIALS[0].id,
    } as SceneNode);
  }
  return out.slice(0, 12);
}

function sanitizeImplications(raw: unknown): Implication[] {
  if (!Array.isArray(raw)) return [];
  const out: Implication[] = [];
  for (const [i, imp] of (raw as Record<string, unknown>[]).entries()) {
    const expression = str(imp?.expression);
    if (!expression) continue;
    out.push({
      id: str(imp?.id, `imp-${i}`),
      label: str(imp?.label, `Implication ${i + 1}`),
      unit: str(imp?.unit, ""),
      expression,
      assumptions: Array.isArray(imp?.assumptions)
        ? (imp.assumptions as unknown[]).filter((a): a is string => typeof a === "string")
        : [],
      warnBelow: typeof imp?.warnBelow === "number" ? imp.warnBelow : undefined,
      warnAbove: typeof imp?.warnAbove === "number" ? imp.warnAbove : undefined,
      warning: str(imp?.warning) || undefined,
      betterWhen:
        imp?.betterWhen === "lower" || imp?.betterWhen === "higher" ? imp.betterWhen : "none",
    });
  }
  return out.slice(0, 8);
}

function sanitizeConstraints(raw: unknown): Constraint[] {
  if (!Array.isArray(raw)) return [];
  const out: Constraint[] = [];
  for (const [i, c] of (raw as Record<string, unknown>[]).entries()) {
    const expression = str(c?.expression);
    const limit = c?.limit;
    if (!expression || typeof limit !== "number" || !Number.isFinite(limit)) continue;
    out.push({
      id: str(c?.id, `constraint-${i}`),
      label: str(c?.label, `Constraint ${i + 1}`),
      expression,
      unit: str(c?.unit, ""),
      operator: c?.operator === "<=" ? "<=" : ">=",
      limit,
      source: str(c?.source, "unsourced"),
      rationale: str(c?.rationale),
    });
  }
  return out.slice(0, 6);
}

export async function generateScene(
  apiKey: string,
  concept: string,
  image: ImageInput | null
): Promise<SceneSpec> {
  const materialList = MATERIALS.map(
    (m) => `- ${m.id}: ${m.name} (${m.density} kg/m³, $${m.costPerKg}/kg) — ${m.note}`
  ).join("\n");

  const user = [`Design concept:\n${concept}`, `Available materials:\n${materialList}`].join("\n\n");

  const text = await callGemini(apiKey, getModel(), sceneSystem, user, {
    temperature: TEMPERATURE,
    json: true,
    image: image ?? undefined,
  });

  return sanitizeSpec(parseJSON<Record<string, unknown>>(text));
}

// Exported so prototype 7 can reuse it on a response that carries extra
// fields alongside the spec.
export function sanitizeSpec(raw: Record<string, unknown>): SceneSpec {
  const kind = KINDS.includes(raw.kind as ConceptKind) ? (raw.kind as ConceptKind) : "part";
  const nodes = sanitizeNodes(raw.nodes);
  if (nodes.length === 0) {
    throw new Error("The model didn't return any usable geometry. Try again or reword the concept.");
  }

  const states: SceneState[] =
    kind === "mechanism" && Array.isArray(raw.states)
      ? (raw.states as Record<string, unknown>[])
          .map((s, i) => ({ id: str(s?.id, `state-${i}`), label: str(s?.label, `State ${i + 1}`) }))
          .slice(0, 2)
      : [];

  return {
    kind,
    kindReason: str(raw.kindReason),
    title: str(raw.title, "Concept"),
    parameters: sanitizeParameters(raw.parameters),
    nodes,
    states: states.length === 2 ? states : [],
    implications: sanitizeImplications(raw.implications),
    constraints: sanitizeConstraints(raw.constraints),
    eyeHeight: kind === "space" ? num(raw.eyeHeight, 1100) : undefined,
    notes: Array.isArray(raw.notes)
      ? (raw.notes as unknown[]).filter((n): n is string => typeof n === "string").slice(0, 5)
      : [],
  };
}

// Takes a PNG snapshot of the three.js viewport and asks the image model to
// re-light it in a given material — so the render is of the actual geometry
// and camera angle, not a separately imagined object.
export async function renderView(
  apiKey: string,
  viewportBase64: string,
  materialId: string,
  mimeType = "image/jpeg"
): Promise<string> {
  const def = material(materialId);
  const prompt = [
    renderSystem,
    `Render every surface in: ${def.name}. ${def.note}`,
    `Finish character: roughness ${def.roughness}, ${
      def.metalness > 0.5 ? "metallic" : "non-metallic"
    }.`,
  ].join("\n\n");

  const result = await generateImage(apiKey, getImageModel(), prompt, {
    mimeType,
    base64Data: viewportBase64,
  });

  return `data:${result.mimeType};base64,${result.base64Data}`;
}
