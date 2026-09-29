import { useState } from "react";
import { AgentButton } from "../shared/components/AgentButton";
import { AgentDialog } from "../shared/components/AgentDialog";
import { useGeminiConnection } from "../shared/hooks/useGeminiConnection";
import { getApiKey } from "../shared/storage";
import { generateQuestions, proposeLenses, type ImageInput } from "./api";
import { ConceptForm } from "./components/ConceptForm";
import { ExportPanel } from "./components/ExportPanel";
import { LensSection } from "./components/LensSection";
import { LensesEditor } from "./components/LensesEditor";
import type { Lens, Question, Source } from "./types";

type Status = "idle" | "loading" | "done" | "error";

const SAMPLE_BRIEF = "Improve accessibility of a kitchen stove for users with limited hand strength";
const SAMPLE_CONCEPT =
  "Large lever-style knobs that turn with a push-and-rotate motion instead of a pinch grip, with a raised tactile indicator for 'off'.";

export default function App() {
  const { connection, refresh: refreshConnection } = useGeminiConnection();
  const [agentOpen, setAgentOpen] = useState(false);

  const [brief, setBrief] = useState("");
  const [concept, setConcept] = useState("");
  const [image, setImage] = useState<(ImageInput & { previewUrl: string }) | null>(null);

  const [lenses, setLenses] = useState<Lens[]>([]);
  const [lensStatus, setLensStatus] = useState<Status>("idle");
  const [lensError, setLensError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStatus, setQuestionStatus] = useState<Record<string, Status>>({});
  const [questionError, setQuestionError] = useState<Record<string, string | null>>({});
  const [sources, setSources] = useState<Record<string, Source[]>>({});

  const imageInput: ImageInput | null = image
    ? { mimeType: image.mimeType, base64Data: image.base64Data }
    : null;

  const fillSample = () => {
    setBrief(SAMPLE_BRIEF);
    setConcept(SAMPLE_CONCEPT);
  };

  const handlePropose = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setLensStatus("loading");
    setLensError(null);
    try {
      const names = await proposeLenses(apiKey, brief.trim(), concept.trim(), imageInput);
      setLenses(names.map((name, i) => ({ id: `lens-${i}-${Date.now()}`, name })));
      setLensStatus("done");
    } catch (err) {
      setLensStatus("error");
      setLensError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateQuestions = async (lens: Lens) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setAgentOpen(true);
      return;
    }
    setQuestionStatus((s) => ({ ...s, [lens.id]: "loading" }));
    setQuestionError((e) => ({ ...e, [lens.id]: null }));
    try {
      const result = await generateQuestions(
        apiKey,
        brief.trim(),
        concept.trim(),
        imageInput,
        lens.id,
        lens.name
      );
      setQuestions((prev) => [...prev, ...result.questions]);
      setSources((prev) => ({ ...prev, [lens.id]: result.sources }));
      setQuestionStatus((s) => ({ ...s, [lens.id]: "done" }));
    } catch (err) {
      setQuestionStatus((s) => ({ ...s, [lens.id]: "error" }));
      setQuestionError((e) => ({
        ...e,
        [lens.id]: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  return (
    <main className="app p4-app">
      <header className="app-header">
        <h1>Prototype 4: What Engineers Will Ask You</h1>
        <div className="header-buttons">
          <AgentButton connection={connection} onClick={() => setAgentOpen(true)} />
        </div>
      </header>

      <ConceptForm
        brief={brief}
        setBrief={setBrief}
        concept={concept}
        setConcept={setConcept}
        image={image}
        setImage={setImage}
        onPropose={() => void handlePropose()}
        status={lensStatus}
        error={lensError}
        locked={lenses.length > 0}
        onFillSample={fillSample}
      />

      {lenses.length > 0 && (
        <section className="p4-section">
          <h2>2. Review lenses</h2>
          <LensesEditor lenses={lenses} setLenses={setLenses} />

          {lenses.map((lens) => (
            <LensSection
              key={lens.id}
              lens={lens}
              questions={questions.filter((q) => q.lensId === lens.id)}
              sources={sources[lens.id] ?? []}
              onUpdateQuestion={updateQuestion}
              onGenerate={() => void handleGenerateQuestions(lens)}
              status={questionStatus[lens.id] ?? "idle"}
              error={questionError[lens.id] ?? null}
            />
          ))}
        </section>
      )}

      <ExportPanel lenses={lenses} questions={questions} />

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
