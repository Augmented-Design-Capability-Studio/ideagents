import { useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import {
  expertReply,
  openRound,
  proxyTurn,
  resolveRound,
  reviseProfile,
  sketchIdea,
  transcript,
} from "./api";
import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { SetupPanel } from "./components/SetupPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { TracePanel } from "./components/TracePanel";
import { DEFAULT_EXPERT_IDS, MAX_EXPERTS, SAMPLES } from "./config";
import { emptyProfile, type IdeaVersion, type Profile, type Provenance, type Resolution, type Round, type Turn } from "./types";

let counter = 0;
const nextId = (prefix: string) => {
  counter += 1;
  return `${prefix}-${counter}-${Date.now().toString(36)}`;
};

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [seed, setSeed] = useState(SAMPLES[0].seed);
  const [expertIds, setExpertIds] = useState<string[]>(DEFAULT_EXPERT_IDS);
  const [started, setStarted] = useState(false);
  const [startStatus, setStartStatus] = useState<"idle" | "loading" | "error">("idle");
  const [startError, setStartError] = useState<string | null>(null);

  const [versions, setVersions] = useState<IdeaVersion[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [profile, setProfile] = useState<Profile>(() => emptyProfile([]));

  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const currentIdea = versions[versions.length - 1]?.text ?? seed;
  const activeRound = [...rounds].reverse().find((r) => !r.resolution) ?? null;
  const yourTurns = rounds.flatMap((r) => r.turns.filter((t) => t.speaker === "you"));
  const yourWrittenTurns = yourTurns.filter((t) => t.provenance !== "proxy");

  const patchRound = (id: string, patch: Partial<Round>) => {
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleExpert = (id: string) => {
    setExpertIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_EXPERTS
          ? prev
          : [...prev, id]
    );
  };

  const patchVersion = (version: number, patch: Partial<IdeaVersion>) => {
    setVersions((prev) => prev.map((v) => (v.version === version ? { ...v, ...patch } : v)));
  };

  // Sketches one version of the idea without blocking anything. Reads the
  // previous version's image at call time, so if that sketch hasn't landed yet
  // this one simply goes without the continuity reference rather than waiting.
  const sketchVersion = async (version: number, text: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    patchVersion(version, { imageStatus: "loading", imageError: null });

    let previousImage: string | null = null;
    setVersions((prev) => {
      previousImage = prev.find((v) => v.version === version - 1)?.image ?? null;
      return prev;
    });

    try {
      const image = await sketchIdea(apiKey, text, previousImage);
      patchVersion(version, { image, imageStatus: "idle" });
    } catch (err) {
      patchVersion(version, {
        imageStatus: "error",
        imageError: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const patchProfile = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));

  const toggleTrait = (trait: string) => {
    setProfile((p) => ({
      ...p,
      traits: p.traits.includes(trait)
        ? p.traits.filter((t) => t !== trait)
        : [...p.traits, trait],
    }));
  };

  // Experts take turns, so one discipline can't dominate the whole review.
  const nextExpertId = (roundCount: number) => expertIds[roundCount % expertIds.length];

  // `reopen` is an earlier resolved round whose point is being put back on the
  // table against the idea as it now stands. Nothing is rewound: the original
  // round keeps its place in the record and the versions after it still stand.
  const beginRound = async (
    idea: string,
    roundCount: number,
    past: string[],
    reopen?: Round
  ) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const expertId = reopen ? reopen.expertId : nextExpertId(roundCount);
    const id = nextId("round");
    const placeholder: Round = {
      id,
      expertId,
      reopenedFrom: reopen?.id,
      consideration: reopen ? reopen.consideration : { title: "…", text: "" },
      turns: [],
      talkingPoints: [],
      resolution: null,
      ideaAfter: null,
      summaryAfter: null,
      carriedForward: null,
      whatChanged: null,
      status: "thinking",
      error: null,
    };
    setRounds((prev) => [...prev, placeholder]);

    try {
      const result = await openRound(
        apiKey,
        idea,
        expertId,
        past,
        profile,
        reopen && reopen.resolution
          ? {
              consideration: reopen.consideration,
              priorTranscript: transcript(reopen),
              priorResolution: reopen.resolution,
            }
          : undefined
      );
      setRounds((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                consideration: result.consideration,
                turns: [{ id: nextId("turn"), speaker: "expert", text: result.opening }],
                talkingPoints: result.talkingPoints,
                status: "open",
              }
            : r
        )
      );
    } catch (err) {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "error", error: err instanceof Error ? err.message : String(err) }
            : r
        )
      );
    }
  };

  const handleStart = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setStartStatus("loading");
    setStartError(null);
    try {
      setVersions([
        {
          version: 1,
          text: seed.trim(),
          summary: seed.trim(),
          image: null,
          imageStatus: "idle",
          imageError: null,
        },
      ]);
      setStarted(true);
      void sketchVersion(1, seed.trim());
      await beginRound(seed.trim(), 0, []);
      setStartStatus("idle");
    } catch (err) {
      setStartStatus("error");
      setStartError(err instanceof Error ? err.message : String(err));
    }
  };

  // Your turn, then the expert answers it.
  const sendTurn = async (text: string, provenance: Provenance) => {
    if (!activeRound || !text.trim()) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const roundId = activeRound.id;
    const yourTurn: Turn = { id: nextId("turn"), speaker: "you", text: text.trim(), provenance };
    const withYours: Round = {
      ...activeRound,
      turns: [...activeRound.turns, yourTurn],
      talkingPoints: [],
      status: "thinking",
    };

    setRounds((prev) => prev.map((r) => (r.id === roundId ? withYours : r)));
    setSelectedPoints([]);
    setDraft("");
    setBusy(true);

    try {
      const result = await expertReply(apiKey, currentIdea, withYours, profile);
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                turns: [
                  ...r.turns,
                  { id: nextId("turn"), speaker: "expert", text: result.reply },
                ],
                talkingPoints: result.talkingPoints,
                status: "open",
              }
            : r
        )
      );
    } catch (err) {
      patchRound(roundId, {
        status: "open",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => {
    if (!activeRound) return;
    const picked = selectedPoints
      .slice()
      .sort((a, b) => a - b)
      .map((i) => activeRound.talkingPoints[i])
      .filter(Boolean);
    const written = draft.trim();
    const text = [...picked, written].filter(Boolean).join(" ");
    // Typing anything at all makes it yours, even alongside picked points.
    void sendTurn(text, written ? "typed" : "selected");
  };

  const handleProxy = async () => {
    if (!activeRound) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setBusy(true);
    try {
      const text = await proxyTurn(apiKey, currentIdea, activeRound, profile, yourWrittenTurns);
      setBusy(false);
      await sendTurn(text, "proxy");
    } catch (err) {
      setBusy(false);
      patchRound(activeRound.id, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleResolve = async (resolution: Resolution) => {
    if (!activeRound) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const roundId = activeRound.id;
    patchRound(roundId, { status: "resolving" });
    setBusy(true);
    try {
      const result = await resolveRound(apiKey, currentIdea, activeRound, resolution);
      const version: IdeaVersion = {
        version: versions.length + 1,
        text: result.ideaState,
        summary: result.ideaSummary || result.ideaState,
        image: null,
        imageStatus: "idle",
        imageError: null,
      };
      setVersions((prev) => [...prev, version]);
      // Drawn in the background — the argument never waits on a picture.
      void sketchVersion(version.version, version.text);
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                resolution,
                ideaAfter: result.ideaState,
                summaryAfter: version.summary,
                carriedForward: result.carriedForward,
                whatChanged: result.whatChanged,
                status: "resolved",
              }
            : r
        )
      );
      setBusy(false);

      // Revise the profile from the argument that just ended, in parallel with
      // opening the next round — neither waits on the other.
      void refreshProfile({ ...activeRound, resolution }, resolution);

      const past = [...rounds.map((r) => r.consideration.title)];
      await beginRound(result.ideaState, rounds.length, past);
    } catch (err) {
      setBusy(false);
      patchRound(roundId, {
        status: "open",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Takes an old point up again. The expert comes back to it against the current
  // idea and may well withdraw it; either way the record shows the idea circling
  // back rather than pretending it didn't.
  const handleReopen = async (roundId: string) => {
    const original = rounds.find((r) => r.id === roundId);
    if (!original || !original.resolution || busy) return;

    // The round that auto-opened after the last ending is usually untouched;
    // silently drop it rather than leaving an empty shell in the transcript. One
    // you've actually argued in stays, unresolved, as an honest record.
    const abandoned =
      activeRound && !activeRound.turns.some((t) => t.speaker === "you") ? activeRound.id : null;
    const kept = abandoned ? rounds.filter((r) => r.id !== abandoned) : rounds;
    if (abandoned) setRounds(kept);

    await beginRound(currentIdea, kept.length, [], original);
  };

  // The idea and the profile are revised in parallel from the same argument —
  // one tracks what's being designed, the other who's designing it.
  const refreshProfile = async (round: Round, resolution: Resolution) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setProfile((p) => ({ ...p, status: "loading", error: null }));
    try {
      // Read the latest profile rather than the render's copy, so edits made
      // while the argument was running aren't thrown away.
      let current: Profile = profile;
      setProfile((p) => {
        current = p;
        return p;
      });
      const result = await reviseProfile(apiKey, current, round, resolution);
      setProfile((p) => ({
        ...p,
        style: result.style,
        priorities: result.priorities,
        commitments: result.commitments,
        flexible: result.flexible,
        lastChange: result.changeNote,
        roundsObserved: p.roundsObserved + 1,
        status: "idle",
      }));
    } catch (err) {
      setProfile((p) => ({
        ...p,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  const lastResolvedRound = [...rounds].reverse().find((r) => r.resolution) ?? null;

  const canResolve = Boolean(
    activeRound && activeRound.turns.some((t) => t.speaker === "you")
  );

  return (
    <main className="app q-app">
      <header className="app-header">
        <h1>Prototype 8.2: Argue For Your Idea</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <SetupPanel
        started={started}
        seed={seed}
        setSeed={setSeed}
        expertIds={expertIds}
        toggleExpert={toggleExpert}
        onStart={() => void handleStart()}
        status={startStatus}
        error={startError}
      />

      {started && (
        <div className="q-board">
          <ProfilePanel
            profile={profile}
            started={started}
            onChange={patchProfile}
            onToggleTrait={toggleTrait}
            onRevise={() =>
              lastResolvedRound?.resolution &&
              void refreshProfile(lastResolvedRound, lastResolvedRound.resolution)
            }
            canRevise={Boolean(lastResolvedRound)}
          />

          <div className="q-chat-column">
            <ChatView rounds={rounds}>
              {activeRound && activeRound.status === "open" && (
                <Composer
                  talkingPoints={activeRound.talkingPoints}
                  selected={selectedPoints}
                  toggleePoint={(i) =>
                    setSelectedPoints((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                    )
                  }
                  draft={draft}
                  setDraft={setDraft}
                  onSend={handleSend}
                  onProxy={() => void handleProxy()}
                  onResolve={(r) => void handleResolve(r)}
                  canResolve={canResolve}
                  busy={busy}
                  disabled={false}
                />
              )}
            </ChatView>
          </div>

          <TracePanel
            versions={versions}
            rounds={rounds}
            onReopen={(id) => void handleReopen(id)}
            canReopen={!busy && activeRound?.status !== "thinking"}
            onRedraw={() => {
              const current = versions[versions.length - 1];
              if (current) void sketchVersion(current.version, current.text);
            }}
          />
        </div>
      )}

      {agentOpen && (
        <AgentDialog
          connection={connection}
          onConnectionChanged={() => void refreshConnection()}
          onClose={() => setAgentOpen(false)}
        />
      )}
    </main>
  );
}
