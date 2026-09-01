// All prompts live as plain-text documents in src/prompts/ so they can be read,
// compared, and edited by humans without touching code. This module only loads them.

import system from "./prompts/system.txt?raw";
import consensus from "./prompts/consensus.txt?raw";
import amplification from "./prompts/amplification.txt?raw";
import disagreement from "./prompts/disagreement.txt?raw";
import independentExplorer from "./prompts/independent-explorer.txt?raw";
import independentExplorerRefine from "./prompts/independent-explorer-refine.txt?raw";
import independentCurator from "./prompts/independent-curator.txt?raw";
import synthesis from "./prompts/synthesis.txt?raw";

export const SYSTEM_PROMPT = system;
export const SYNTHESIS_PROMPT = synthesis;
export const CURATOR_PROMPT = independentCurator;
export const EXPLORER_PROMPT = independentExplorer;
export const EXPLORER_REFINE_PROMPT = independentExplorerRefine;

export const MECHANISM_PROMPTS = {
  consensus,
  amplification,
  disagreement,
} as const;
