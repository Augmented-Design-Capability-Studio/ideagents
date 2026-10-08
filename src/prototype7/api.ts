import { callGemini, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { TEMPERATURE } from "../massing/config";
import { MATERIALS } from "../massing/materials";
import sceneSystem from "../massing/prompts/scene-system.txt?raw";
import { sanitizeSpec, type ImageInput } from "../massing/api";
import type { SceneSpec } from "../massing/types";
import configurationsAddendum from "./prompts/configurations-addendum.txt?raw";
import { MAX_CONFIGS } from "./config";
import type { Configuration } from "./types";

export type { ImageInput };

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function sanitizeConfigurations(raw: unknown, spec: SceneSpec): Configuration[] {
  if (!Array.isArray(raw)) return [];
  const paramById = new Map(spec.parameters.map((p) => [p.id, p]));
  const nodeIds = new Set(spec.nodes.map((n) => n.id));
  const materialIds = new Set(MATERIALS.map((m) => m.id));
  const constraintIds = new Set(spec.constraints.map((c) => c.id));

  const out: Configuration[] = [];
  for (const [i, c] of (raw as Record<string, unknown>[]).entries()) {
    const values: Record<string, number> = {};
    for (const p of spec.parameters) values[p.id] = p.default;

    const given = c?.parameterValues;
    if (given && typeof given === "object") {
      for (const [key, v] of Object.entries(given as Record<string, unknown>)) {
        const param = paramById.get(key);
        if (param && typeof v === "number" && Number.isFinite(v)) {
          values[key] = clamp(v, param.min, param.max);
        }
      }
    }

    const materials: Record<string, string> = {};
    const overrides = c?.materialOverrides;
    if (overrides && typeof overrides === "object") {
      for (const [nodeId, mat] of Object.entries(overrides as Record<string, unknown>)) {
        if (nodeIds.has(nodeId) && typeof mat === "string" && materialIds.has(mat)) {
          materials[nodeId] = mat;
        }
      }
    }

    const violates = Array.isArray(c?.violates)
      ? (c.violates as unknown[]).filter(
          (v): v is string => typeof v === "string" && constraintIds.has(v)
        )
      : [];

    out.push({
      id: typeof c?.id === "string" && c.id.trim() ? c.id.trim() : `config-${i}-${Date.now()}`,
      name: typeof c?.name === "string" && c.name.trim() ? c.name.trim() : `Configuration ${i + 1}`,
      rationale: typeof c?.rationale === "string" ? c.rationale.trim() : "",
      values,
      materials,
      interior: spec.kind === "space",
      expanded: false,
      linked: true,
      intent: c?.intent === "provocation" ? "provocation" : "feasible",
      violates,
      provocation: typeof c?.provocation === "string" ? c.provocation.trim() : "",
      designImplications: Array.isArray(c?.designImplications)
        ? (c.designImplications as unknown[])
            .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
            .map((d) => d.trim())
            .slice(0, 4)
        : [],
    });
  }
  return out.slice(0, MAX_CONFIGS);
}

export async function generateConfiguredScene(
  apiKey: string,
  concept: string,
  image: ImageInput | null
): Promise<{ spec: SceneSpec; configurations: Configuration[] }> {
  const materialList = MATERIALS.map(
    (m) => `- ${m.id}: ${m.name} (${m.density} kg/m³, $${m.costPerKg}/kg) — ${m.note}`
  ).join("\n");

  const user = [`Design concept:\n${concept}`, `Available materials:\n${materialList}`].join("\n\n");
  const system = [sceneSystem, configurationsAddendum].join("\n\n");

  const text = await callGemini(apiKey, getModel(), system, user, {
    temperature: TEMPERATURE,
    json: true,
    image: image ?? undefined,
  });

  const raw = parseJSON<Record<string, unknown>>(text);
  const spec = sanitizeSpec(raw);
  const configurations = sanitizeConfigurations(raw.configurations, spec);

  // A single default configuration is still a usable comparison baseline, so a
  // model that ignores the addendum degrades rather than fails.
  if (configurations.length === 0) {
    const values: Record<string, number> = {};
    for (const p of spec.parameters) values[p.id] = p.default;
    configurations.push({
      id: `config-base-${Date.now()}`,
      name: "Baseline",
      rationale: "The model didn't propose variants, so this is the base spec.",
      values,
      materials: {},
      interior: spec.kind === "space",
      expanded: false,
      linked: true,
      intent: "feasible",
      violates: [],
      provocation: "",
      designImplications: [],
    });
  }

  return { spec, configurations };
}
