import { callGemini, parseJSON } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { TEMPERATURE } from "./config";
import { evaluateFormula } from "./formula";
import chainSystem from "./prompts/chain-system.txt?raw";
import modelSystem from "./prompts/model-system.txt?raw";
import type { ChainItem, ModelSpec } from "./types";

interface RawChain {
  mechanism?: unknown;
  requirement?: unknown;
  rationale?: unknown;
}

export async function generateChains(
  apiKey: string,
  brief: string,
  concept: string,
  goalId: string,
  goalText: string
): Promise<ChainItem[]> {
  const user = [
    `Design brief:\n${brief}`,
    `Concept:\n${concept}`,
    `Qualitative goal:\n${goalText}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), chainSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<{ chains?: RawChain[] }>(text);
  if (!raw.chains || !Array.isArray(raw.chains) || raw.chains.length === 0) {
    throw new Error("The model didn't return any chains. Try again.");
  }

  return raw.chains
    .filter(
      (c): c is Required<RawChain> =>
        typeof c.mechanism === "string" &&
        typeof c.requirement === "string" &&
        typeof c.rationale === "string"
    )
    .map((c, i) => ({
      id: `chain-${goalId}-${i}-${Date.now()}`,
      goalId,
      mechanism: (c.mechanism as string).trim(),
      requirement: (c.requirement as string).trim(),
      rationale: (c.rationale as string).trim(),
      status: "pending" as const,
    }));
}

interface RawVariable {
  id?: unknown;
  name?: unknown;
  unit?: unknown;
  min?: unknown;
  max?: unknown;
  default?: unknown;
}
interface RawOutput {
  id?: unknown;
  name?: unknown;
  unit?: unknown;
}
interface RawFormula {
  outputId?: unknown;
  expression?: unknown;
}
interface RawModel {
  notApplicable?: unknown;
  notApplicableReason?: unknown;
  variables?: RawVariable[];
  outputs?: RawOutput[];
  formulas?: RawFormula[];
  assumptions?: unknown[];
}

function isIdentifier(s: unknown): s is string {
  return typeof s === "string" && /^[a-z][a-z0-9_]*$/i.test(s);
}

export async function generateModel(
  apiKey: string,
  brief: string,
  concept: string,
  goalText: string,
  chainItem: ChainItem
): Promise<ModelSpec> {
  const user = [
    `Design brief:\n${brief}`,
    `Concept:\n${concept}`,
    `Goal: ${goalText}`,
    `Mechanism: ${chainItem.mechanism}`,
    `Accepted requirement: ${chainItem.requirement}`,
  ].join("\n\n");

  const text = await callGemini(apiKey, getModel(), modelSystem, user, {
    temperature: TEMPERATURE,
    json: true,
  });
  const raw = parseJSON<RawModel>(text);

  if (raw.notApplicable) {
    return {
      chainItemId: chainItem.id,
      notApplicable: true,
      notApplicableReason:
        typeof raw.notApplicableReason === "string"
          ? raw.notApplicableReason
          : "No meaningful quantitative model for this requirement.",
      variables: [],
      formulas: [],
      outputs: [],
      assumptions: [],
    };
  }

  const variables = (raw.variables ?? [])
    .filter((v) => isIdentifier(v.id) && typeof v.name === "string")
    .map((v) => {
      const min = typeof v.min === "number" ? v.min : 0;
      const max = typeof v.max === "number" && v.max > min ? v.max : min + 1;
      const def = typeof v.default === "number" ? Math.min(Math.max(v.default, min), max) : min;
      return {
        id: v.id as string,
        name: v.name as string,
        unit: typeof v.unit === "string" ? v.unit : "",
        min,
        max,
        default: def,
      };
    });
  if (variables.length === 0) {
    throw new Error("The model returned no usable variables. Try again.");
  }

  const outputs = (raw.outputs ?? [])
    .filter((o) => isIdentifier(o.id) && typeof o.name === "string")
    .map((o) => ({
      id: o.id as string,
      name: o.name as string,
      unit: typeof o.unit === "string" ? o.unit : "",
    }));
  if (outputs.length === 0) {
    throw new Error("The model returned no usable outputs. Try again.");
  }

  const formulas = (raw.formulas ?? [])
    .filter((f) => typeof f.outputId === "string" && typeof f.expression === "string")
    .map((f) => ({ outputId: f.outputId as string, expression: f.expression as string }));

  // Validate every formula parses AND evaluates against the variables'
  // default values, right now — surfacing a broken formula here (with a
  // clear message) beats discovering it silently later as NaN on a slider.
  const defaults: Record<string, number> = {};
  for (const v of variables) defaults[v.id] = v.default;
  for (const f of formulas) {
    try {
      evaluateFormula(f.expression, defaults);
    } catch (err) {
      throw new Error(
        `The model returned a formula that doesn't evaluate ("${f.expression}"): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  if (formulas.length === 0 || !outputs.every((o) => formulas.some((f) => f.outputId === o.id))) {
    throw new Error("Not every output has a matching formula. Try again.");
  }

  const assumptions = (raw.assumptions ?? []).filter(
    (a): a is string => typeof a === "string" && a.trim().length > 0
  );

  return {
    chainItemId: chainItem.id,
    notApplicable: false,
    notApplicableReason: null,
    variables,
    outputs,
    formulas,
    assumptions,
  };
}
