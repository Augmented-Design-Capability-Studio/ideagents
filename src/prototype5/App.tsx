import { useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { getChallenge, getDistance, getPriorArt } from "./api";
import { AdminPanel } from "./components/AdminPanel";
import { ChallengeCard } from "./components/ChallengeCard";
import { ConceptPanel } from "./components/ConceptPanel";
import { PriorArtPanel } from "./components/PriorArtPanel";
import { EVENTS_STORAGE_KEY, MAX_DIAL, MIN_DIAL, SETTINGS_STORAGE_KEY } from "./config";
import type {
  Challenge,
  ConceptImage,
  ConceptVersion,
  LogEvent,
  LogEventType,
  PriorArtItem,
  Rating,
  StudySettings,
} from "./types";

type AsyncStatus = "idle" | "loading" | "error";
type FetchStatus = "idle" | "loading" | "done" | "error";

function readStoredEvents(): LogEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEvent[]) : [];
  } catch {
    return [];
  }
}

function readStoredSettings(): StudySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StudySettings;
  } catch {
    // fall through to defaults
  }
  return { participantId: "", condition: "", dialMode: "escalating", fixedDialLevel: MIN_DIAL };
}

const SAMPLE_CONCEPT =
  "A smart water bottle that reminds you to drink through gentle wrist-watch-like vibrations and a companion app tracking your daily hydration history.";

function summarizeRevision(prevText: string, nextText: string): string {
  const prevWords = prevText.trim().split(/\s+/).filter(Boolean).length;
  const nextWords = nextText.trim().split(/\s+/).filter(Boolean).length;
  const delta = nextWords - prevWords;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} words vs. previous version`;
}

export default function App() {
  const isAdmin = new URLSearchParams(window.location.search).has("admin");

  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [settings, setSettings] = useState<StudySettings>(() => readStoredSettings());
  const [events, setEvents] = useState<LogEvent[]>(() => readStoredEvents());

  const logEvent = (type: LogEventType, payload: Record<string, unknown>) => {
    const event: LogEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type,
      payload: { ...payload, participantId: settings.participantId, condition: settings.condition },
    };
    setEvents((prev) => {
      const next = [...prev, event];
      try {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable — keep going in-memory for this session
      }
      return next;
    });
  };

  // Concept + revision history.
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<ConceptImage | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<AsyncStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ConceptVersion[]>([]);

  const [isRevising, setIsRevising] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState("");
  const [revisionImage, setRevisionImage] = useState<ConceptImage | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<AsyncStatus>("idle");
  const [revisionError, setRevisionError] = useState<string | null>(null);

  const [sessionEnded, setSessionEnded] = useState(false);

  // Prior art.
  const [priorArt, setPriorArt] = useState<PriorArtItem[]>([]);
  const [priorArtStatus, setPriorArtStatus] = useState<FetchStatus>("idle");
  const [priorArtError, setPriorArtError] = useState<string | null>(null);
  const [moreArtStatus, setMoreArtStatus] = useState<FetchStatus>("idle");
  const [moreArtError, setMoreArtError] = useState<string | null>(null);

  // Challenge + dial + rating.
  const [dialLevel, setDialLevelState] = useState(
    settings.dialMode === "escalating" ? MIN_DIAL : settings.fixedDialLevel
  );
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<FetchStatus>("idle");
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [rating, setRating] = useState<Rating>({ value: null, reason: "" });

  const setDialLevel = (v: number) => {
    if (settings.dialMode === "locked") return;
    setDialLevelState(Math.min(MAX_DIAL, Math.max(MIN_DIAL, v)));
  };

  const refreshPriorArt = async (version: ConceptVersion): Promise<PriorArtItem[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return priorArt;
    }
    setPriorArtStatus("loading");
    setPriorArtError(null);
    setMoreArtStatus("idle");
    setMoreArtError(null);
    try {
      const items = await getPriorArt(apiKey, version.text, version.image);
      setPriorArt(items);
      setPriorArtStatus("done");
      logEvent("prior-art-shown", { version: version.version, items });
      return items;
    } catch (err) {
      setPriorArtStatus("error");
      setPriorArtError(err instanceof Error ? err.message : String(err));
      return [];
    }
  };

  // "Show me more" — appends additional prior art for the current version
  // instead of replacing the list, explicitly telling the model to dig
  // harder and not repeat what's already shown.
  const handleShowMorePriorArt = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    const latest = versions[versions.length - 1];
    if (!latest) return;
    setMoreArtStatus("loading");
    setMoreArtError(null);
    try {
      const existingTitles = priorArt.map((p) => p.title);
      const items = await getPriorArt(apiKey, latest.text, latest.image, existingTitles);
      const seen = new Set(priorArt.map((p) => p.title.trim().toLowerCase()));
      const fresh = items.filter((i) => !seen.has(i.title.trim().toLowerCase()));
      setPriorArt((prev) => [...prev, ...fresh]);
      setMoreArtStatus("done");
      logEvent("prior-art-more", { version: latest.version, added: fresh.length });
    } catch (err) {
      setMoreArtStatus("error");
      setMoreArtError(err instanceof Error ? err.message : String(err));
    }
  };

  // Keeps a version's challenge list (shown collapsed in the history panel)
  // in sync whenever a challenge is loaded or regenerated for it.
  const appendChallengeToVersion = (versionNumber: number, ch: Challenge) => {
    setVersions((prev) =>
      prev.map((v) => (v.version === versionNumber ? { ...v, challenges: [...v.challenges, ch] } : v))
    );
  };

  const loadChallenge = async (level: number, version: ConceptVersion, art: PriorArtItem[]) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setChallengeStatus("loading");
    setChallengeError(null);
    setRating({ value: null, reason: "" });
    try {
      const result = await getChallenge(apiKey, version.text, art, level);
      const next: Challenge = {
        id: `challenge-${Date.now()}`,
        text: result.text,
        dialLevel: level,
        evidence: result.evidence,
      };
      setChallenge(next);
      setChallengeStatus("done");
      appendChallengeToVersion(version.version, next);
      logEvent("challenge-shown", { dialLevel: level, text: next.text, evidence: next.evidence });
      if (settings.dialMode === "escalating") {
        setDialLevelState((prev) => Math.min(MAX_DIAL, Math.max(prev, level) + 1));
      }
    } catch (err) {
      setChallengeStatus("error");
      setChallengeError(err instanceof Error ? err.message : String(err));
    }
  };

  // Regenerates the current challenge in place after a "not useful" rating —
  // same round, same dial level (whatever the slider currently reads), just
  // a different angle. Doesn't advance the round or refresh prior art.
  const handleRegenerateChallenge = async () => {
    if (!challenge || rating.value !== "down") return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    logEvent("rating", { challengeId: challenge.id, value: rating.value, reason: rating.reason });
    const latest = versions[versions.length - 1];
    setChallengeStatus("loading");
    setChallengeError(null);
    try {
      const result = await getChallenge(apiKey, latest.text, priorArt, dialLevel, {
        previousChallenge: challenge.text,
        reason: rating.reason,
      });
      const next: Challenge = {
        id: `challenge-${Date.now()}`,
        text: result.text,
        dialLevel,
        evidence: result.evidence,
      };
      setChallenge(next);
      setChallengeStatus("done");
      setRating({ value: null, reason: "" });
      appendChallengeToVersion(latest.version, next);
      logEvent("challenge-regenerated", {
        dialLevel,
        text: next.text,
        evidence: next.evidence,
        basedOnReason: rating.reason,
      });
    } catch (err) {
      setChallengeStatus("error");
      setChallengeError(err instanceof Error ? err.message : String(err));
    }
  };

  const fillSample = () => {
    setDraft(SAMPLE_CONCEPT);
  };

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setSubmitStatus("loading");
    setSubmitError(null);
    try {
      const v1: ConceptVersion = {
        version: 1,
        text: draft.trim(),
        image,
        timestamp: Date.now(),
        summary: "Initial concept",
        distance: 0,
        challenges: [],
      };
      setVersions([v1]);
      setSubmitted(true);
      logEvent("session-start", {});
      logEvent("concept-submitted", { version: 1, text: v1.text });
      const startLevel = settings.dialMode === "escalating" ? dialLevel : settings.fixedDialLevel;
      const art = await refreshPriorArt(v1);
      await loadChallenge(startLevel, v1, art);
      setSubmitStatus("idle");
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSkip = () => {
    if (!challenge || rating.value === null) return;
    logEvent("rating", { challengeId: challenge.id, value: rating.value, reason: rating.reason });
    logEvent("skip", { challengeId: challenge.id });
    const latest = versions[versions.length - 1];
    void loadChallenge(dialLevel, latest, priorArt);
  };

  const handleRespond = () => {
    if (!challenge || rating.value === null) return;
    logEvent("rating", { challengeId: challenge.id, value: rating.value, reason: rating.reason });
    const latest = versions[versions.length - 1];
    setRevisionDraft(latest.text);
    setRevisionImage(latest.image);
    setIsRevising(true);
  };

  const handleCancelRevise = () => setIsRevising(false);

  const handleSaveRevision = async () => {
    if (!revisionDraft.trim()) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setRevisionStatus("loading");
    setRevisionError(null);
    try {
      const v1 = versions[0];
      const latest = versions[versions.length - 1];
      const distance = await getDistance(apiKey, v1.text, revisionDraft.trim());
      const newVersion: ConceptVersion = {
        version: versions.length + 1,
        text: revisionDraft.trim(),
        image: revisionImage,
        timestamp: Date.now(),
        summary: summarizeRevision(latest.text, revisionDraft.trim()),
        distance,
        challenges: [],
      };
      setVersions((prev) => [...prev, newVersion]);
      logEvent("revision", { version: newVersion.version, distance });
      setIsRevising(false);
      setRevisionStatus("idle");
      const art = await refreshPriorArt(newVersion);
      await loadChallenge(dialLevel, newVersion, art);
    } catch (err) {
      setRevisionStatus("error");
      setRevisionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEndSession = () => {
    const latest = versions[versions.length - 1];
    logEvent("session-end", { finalVersion: latest?.version ?? null });
    setSessionEnded(true);
  };

  const clearEvents = () => {
    setEvents([]);
    try {
      localStorage.removeItem(EVENTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const saveSettings = (s: StudySettings) => {
    setSettings(s);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
    if (s.dialMode !== "escalating") {
      setDialLevelState(Math.min(MAX_DIAL, Math.max(MIN_DIAL, s.fixedDialLevel)));
    }
  };

  if (isAdmin) {
    return (
      <AdminPanel settings={settings} onSave={saveSettings} events={events} onClearEvents={clearEvents} />
    );
  }

  return (
    <main className="app p5-app">
      <header className="app-header">
        <h1>Prototype 5: Radical Tool</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <div className={`p5-columns ${submitted ? "p5-columns-3" : "p5-columns-2"}`}>
        <ConceptPanel
          submitted={submitted}
          draft={draft}
          setDraft={setDraft}
          image={image}
          setImage={setImage}
          onSubmit={() => void handleSubmit()}
          onFillSample={fillSample}
          submitStatus={submitStatus}
          submitError={submitError}
          versions={versions}
          isRevising={isRevising}
          revisionDraft={revisionDraft}
          setRevisionDraft={setRevisionDraft}
          revisionImage={revisionImage}
          setRevisionImage={setRevisionImage}
          onSaveRevision={() => void handleSaveRevision()}
          onCancelRevise={handleCancelRevise}
          revisionStatus={revisionStatus}
          revisionError={revisionError}
          sessionEnded={sessionEnded}
          onEndSession={handleEndSession}
        />

        {submitted ? (
          <ChallengeCard
            dialLevel={dialLevel}
            setDialLevel={setDialLevel}
            dialEditable={settings.dialMode !== "locked"}
            challenge={challenge}
            status={challengeStatus}
            error={challengeError}
            rating={rating}
            onSetRatingValue={(v) => setRating((r) => ({ ...r, value: v }))}
            onSetRatingReason={(v) => setRating((r) => ({ ...r, reason: v }))}
            onRespond={handleRespond}
            onSkip={handleSkip}
            onRegenerate={() => void handleRegenerateChallenge()}
            sessionEnded={sessionEnded}
          />
        ) : (
          <section className="p5-col p5-section p5-placeholder">
            <h2>Challenge</h2>
            <p className="p5-hint">Submit a concept to start Round 1.</p>
          </section>
        )}

        {submitted && (
          <PriorArtPanel
            items={priorArt}
            status={priorArtStatus}
            error={priorArtError}
            onShowMore={() => void handleShowMorePriorArt()}
            moreStatus={moreArtStatus}
            moreError={moreArtError}
          />
        )}
      </div>

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
