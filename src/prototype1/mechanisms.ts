import { AGENTS_PER_DISCUSSION, INDEPENDENT_EXPLORERS } from "./config";
import { callGemini } from "./gemini";
import {
  CURATOR_PROMPT,
  EXPLORER_PROMPT,
  EXPLORER_REFINE_PROMPT,
  MECHANISM_PROMPTS,
  SYNTHESIS_PROMPT,
  getSystemPrompt,
} from "./prompts";
import type { AgentRole } from "./roles";
import { roleInstruction } from "./roles";
import { getRounds } from "./storage";

export type MechanismId =
  | "consensus"
  | "amplification"
  | "disagreement"
  | "independent";

export interface Turn {
  agent: string;
  text: string;
  // 0-based agent slot, stable across rounds; drives the agent's color in the UI.
  index: number;
}

export interface FinalIdea {
  decision: string;
  details: string | null;
}

export type RunEvent =
  | { type: "status"; text: string }
  | { type: "turn"; turn: Turn }
  | { type: "final"; idea: FinalIdea };

// The synthesis/curator prompts ask for a short decision, then "DETAILS:" on its
// own line, then the elaboration. If the model skips the marker, everything is
// treated as the decision.
function parseFinal(text: string): FinalIdea {
  const i = text.indexOf("DETAILS:");
  if (i === -1) return { decision: text.trim(), details: null };
  return {
    decision: text.slice(0, i).trim(),
    details: text.slice(i + "DETAILS:".length).trim() || null,
  };
}

export const MECHANISM_INFO: Record<
  MechanismId,
  { title: string; description: string }
> = {
  consensus: {
    title: "Consensus",
    description: "Agents agree and refine an emerging idea.",
  },
  amplification: {
    title: "Amplification",
    description: "Agents find an unusual aspect and push it further.",
  },
  disagreement: {
    title: "Constructive Disagreement",
    description: "Agents challenge assumptions and develop alternatives.",
  },
  independent: {
    title: "Independent Exploration",
    description: "Isolated agents explore separately; a curator synthesizes.",
  },
};

function formatTranscript(turns: Turn[]): string {
  if (turns.length === 0) return "(no contributions yet — you go first)";
  return turns.map((t) => `${t.agent}:\n${t.text}`).join("\n\n");
}

// Consensus, amplification, and disagreement share one shape: agents take
// turns on a shared transcript, then a synthesis turn states the final idea.
async function runDiscussion(
  id: Exclude<MechanismId, "independent">,
  seed: string,
  apiKey: string,
  onEvent: (e: RunEvent) => void,
  roles: AgentRole[] | null
): Promise<void> {
  const system = `${getSystemPrompt()}\n\n${MECHANISM_PROMPTS[id]}`;
  const rounds = getRounds();
  const turns: Turn[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let a = 1; a <= AGENTS_PER_DISCUSSION; a++) {
      const role = roles?.[(a - 1) % roles.length] ?? null;
      const agent = role ? role.name : `Agent ${a}`;
      onEvent({
        type: "status",
        text: `Round ${round}/${rounds} — ${agent} is thinking…`,
      });
      const user = [
        `Seed idea / design question:\n${seed}`,
        `Discussion so far:\n${formatTranscript(turns)}`,
        [
          `You are ${agent}.`,
          role ? roleInstruction(role) : null,
          "Provide your next contribution.",
        ]
          .filter(Boolean)
          .join("\n"),
      ].join("\n\n");
      const text = await callGemini(apiKey, system, user);
      const turn = { agent, text, index: a - 1 };
      turns.push(turn);
      onEvent({ type: "turn", turn });
    }
  }

  onEvent({ type: "status", text: "Synthesizing the final idea…" });
  const user = [
    `Seed idea / design question:\n${seed}`,
    `Discussion so far:\n${formatTranscript(turns)}`,
    SYNTHESIS_PROMPT,
  ].join("\n\n");
  const final = await callGemini(apiKey, system, user);
  onEvent({ type: "final", idea: parseFinal(final) });
}

async function runIndependent(
  seed: string,
  apiKey: string,
  onEvent: (e: RunEvent) => void,
  roles: AgentRole[] | null
): Promise<void> {
  const rounds = getRounds();
  onEvent({
    type: "status",
    text: `${INDEPENDENT_EXPLORERS} explorers working independently (${rounds} round${rounds > 1 ? "s" : ""})…`,
  });

  // Each explorer runs its rounds sequentially, deepening only its own idea;
  // the explorers themselves run concurrently. The curator sees only each
  // explorer's final-round proposal.
  const explorations = await Promise.all(
    Array.from({ length: INDEPENDENT_EXPLORERS }, async (_, i) => {
      const role = roles?.[i % roles.length] ?? null;
      const agent = role ? role.name : `Explorer ${i + 1}`;
      const identity = [`You are ${agent}.`, role ? roleInstruction(role) : null]
        .filter(Boolean)
        .join("\n");
      let text = "";
      for (let round = 1; round <= rounds; round++) {
        const first = round === 1;
        const system = `${getSystemPrompt()}\n\n${first ? EXPLORER_PROMPT : EXPLORER_REFINE_PROMPT}`;
        const user = first
          ? [
              `Seed idea / design question:\n${seed}`,
              `${identity}\nProvide your independent exploration.`,
            ].join("\n\n")
          : [
              `Seed idea / design question:\n${seed}`,
              `Your previous exploration:\n${text}`,
              `${identity}\nContinue developing your idea.`,
            ].join("\n\n");
        text = await callGemini(apiKey, system, user);
        onEvent({
          type: "turn",
          turn: {
            agent: rounds > 1 ? `${agent} (round ${round})` : agent,
            text,
            index: i,
          },
        });
      }
      return { agent, text, index: i };
    })
  );

  onEvent({ type: "status", text: "Curator is synthesizing…" });
  const user = [
    `Seed idea / design question:\n${seed}`,
    `Independent proposals:\n${formatTranscript(explorations)}`,
  ].join("\n\n");
  const final = await callGemini(apiKey, `${getSystemPrompt()}\n\n${CURATOR_PROMPT}`, user);
  onEvent({ type: "final", idea: parseFinal(final) });
}

// `roles` is optional: when null, agents keep their original generic identities
// ("Agent 1", "Explorer 2"). When provided, the same four roles are shared
// across all mechanisms; the mechanism still determines how agents interact.
export function runMechanism(
  id: MechanismId,
  seed: string,
  apiKey: string,
  onEvent: (e: RunEvent) => void,
  roles: AgentRole[] | null = null
): Promise<void> {
  if (id === "independent") return runIndependent(seed, apiKey, onEvent, roles);
  return runDiscussion(id, seed, apiKey, onEvent, roles);
}
