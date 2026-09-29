import { callGemini } from "../shared/gemini";
import { getModel } from "../shared/storage";
import { AGENTS_PER_DISCUSSION, TEMPERATURE } from "./config";
import { ROLES_PROMPT } from "./prompts";

// A role is a perspective (goals, concerns, assumptions), not a personality.
// Roles are generated once per seed and shared across all four mechanisms.
export interface AgentRole {
  name: string;
  perspective: string;
}

// The prompt asks for one "Name | perspective sentence" per line.
function parseRoles(text: string): AgentRole[] {
  const roles = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => {
      const sep = line.indexOf("|");
      return {
        // Strip any stray list markers the model adds despite instructions.
        name: line.slice(0, sep).replace(/^[-*\d.)\s]+/, "").trim(),
        perspective: line.slice(sep + 1).trim(),
      };
    })
    .filter((r) => r.name && r.perspective);

  if (roles.length < AGENTS_PER_DISCUSSION) {
    throw new Error(
      `Expected ${AGENTS_PER_DISCUSSION} roles but could only parse ${roles.length}. Try generating again.`
    );
  }
  return roles.slice(0, AGENTS_PER_DISCUSSION);
}

export async function generateRoles(
  seed: string,
  apiKey: string
): Promise<AgentRole[]> {
  const text = await callGemini(
    apiKey,
    getModel(),
    ROLES_PROMPT,
    `Seed idea / design question:\n${seed}`,
    { temperature: TEMPERATURE }
  );
  return parseRoles(text);
}

// Appended to an agent's per-turn instructions when roles are active. The
// mechanism prompt still governs how agents interact; the role only shifts
// whose perspective the contribution comes from.
export function roleInstruction(role: AgentRole): string {
  return [
    `Your assigned perspective: ${role.perspective}`,
    "Reason and contribute from this perspective — its goals, concerns, and assumptions — while still following the discussion mechanism described in your instructions.",
  ].join("\n");
}
