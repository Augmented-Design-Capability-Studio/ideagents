import { AGENTS_PER_DISCUSSION, INDEPENDENT_EXPLORERS } from "./config";
import { callGemini } from "./gemini";
import {
  CURATOR_PROMPT,
  EXPLORER_PROMPT,
  EXPLORER_REFINE_PROMPT,
  MECHANISM_PROMPTS,
  SYNTHESIS_PROMPT,
  SYSTEM_PROMPT,
} from "./prompts";
import { getRounds } from "./storage";

export type MechanismId =
  | "consensus"
  | "amplification"
  | "disagreement"
  | "independent";

export interface Turn {
  agent: string;
  text: string;
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
  onEvent: (e: RunEvent) => void
): Promise<void> {
  const system = `${SYSTEM_PROMPT}\n\n${MECHANISM_PROMPTS[id]}`;
  const rounds = getRounds();
  const turns: Turn[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let a = 1; a <= AGENTS_PER_DISCUSSION; a++) {
      const agent = `Agent ${a}`;
      onEvent({
        type: "status",
        text: `Round ${round}/${rounds} — ${agent} is thinking…`,
      });
      const user = [
        `Seed idea / design question:\n${seed}`,
        `Discussion so far:\n${formatTranscript(turns)}`,
        `You are ${agent}. Provide your next contribution.`,
      ].join("\n\n");
      const text = await callGemini(apiKey, system, user);
      const turn = { agent, text };
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
  onEvent: (e: RunEvent) => void
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
      const agent = `Explorer ${i + 1}`;
      let text = "";
      for (let round = 1; round <= rounds; round++) {
        const first = round === 1;
        const system = `${SYSTEM_PROMPT}\n\n${first ? EXPLORER_PROMPT : EXPLORER_REFINE_PROMPT}`;
        const user = first
          ? [
              `Seed idea / design question:\n${seed}`,
              `You are ${agent}. Provide your independent exploration.`,
            ].join("\n\n")
          : [
              `Seed idea / design question:\n${seed}`,
              `Your previous exploration:\n${text}`,
              `You are ${agent}. Continue developing your idea.`,
            ].join("\n\n");
        text = await callGemini(apiKey, system, user);
        onEvent({
          type: "turn",
          turn: { agent: rounds > 1 ? `${agent} (round ${round})` : agent, text },
        });
      }
      return { agent, text };
    })
  );

  onEvent({ type: "status", text: "Curator is synthesizing…" });
  const user = [
    `Seed idea / design question:\n${seed}`,
    `Independent proposals:\n${formatTranscript(explorations)}`,
  ].join("\n\n");
  const final = await callGemini(apiKey, `${SYSTEM_PROMPT}\n\n${CURATOR_PROMPT}`, user);
  onEvent({ type: "final", idea: parseFinal(final) });
}

export function runMechanism(
  id: MechanismId,
  seed: string,
  apiKey: string,
  onEvent: (e: RunEvent) => void
): Promise<void> {
  if (id === "independent") return runIndependent(seed, apiKey, onEvent);
  return runDiscussion(id, seed, apiKey, onEvent);
}
