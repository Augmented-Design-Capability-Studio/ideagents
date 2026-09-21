// All prompts live as plain-text documents in src/prompts/ so they can be read,
// compared, and edited by humans without touching code. This module only loads
// them and fills in the {{TURN_WORDS}} setting.

import { getTurnWords } from "./storage";
import system from "./prompts/system.txt?raw";
import consensus from "./prompts/consensus.txt?raw";
import amplification from "./prompts/amplification.txt?raw";
import disagreement from "./prompts/disagreement.txt?raw";
import independentExplorer from "./prompts/independent-explorer.txt?raw";
import independentExplorerRefine from "./prompts/independent-explorer-refine.txt?raw";
import independentCurator from "./prompts/independent-curator.txt?raw";
import synthesis from "./prompts/synthesis.txt?raw";
import roles from "./prompts/roles.txt?raw";

// The word cap is a Settings value, so the system prompt is built per call.
export function getSystemPrompt(): string {
  return system.replace("{{TURN_WORDS}}", String(getTurnWords()));
}

export const ROLES_PROMPT = roles;
export const SYNTHESIS_PROMPT = synthesis;
export const CURATOR_PROMPT = independentCurator;
export const EXPLORER_PROMPT = independentExplorer;
export const EXPLORER_REFINE_PROMPT = independentExplorerRefine;

export const MECHANISM_PROMPTS = {
  consensus,
  amplification,
  disagreement,
} as const;
