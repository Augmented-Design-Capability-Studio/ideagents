import { QuestionCard } from "./QuestionCard";
import type { Lens, Question, Source } from "../types";

interface Props {
  lens: Lens;
  questions: Question[];
  sources: Source[];
  onUpdateQuestion: (id: string, patch: Partial<Question>) => void;
  onGenerate: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
}

export function LensSection({
  lens,
  questions,
  sources,
  onUpdateQuestion,
  onGenerate,
  status,
  error,
}: Props) {
  const sorted = [...questions].sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === "showstopper" ? -1 : 1
  );

  return (
    <div className="p4-subsection">
      <h3>{lens.name}</h3>
      {questions.length === 0 ? (
        <button onClick={onGenerate} disabled={status === "loading"}>
          {status === "loading" ? "Researching…" : "Generate questions for this lens"}
        </button>
      ) : (
        <>
          <div className="p4-questions">
            {sorted.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onUpdate={(patch) => onUpdateQuestion(q.id, patch)}
              />
            ))}
          </div>
          {sources.length > 0 && (
            <details className="p4-sources">
              <summary>Sources found while researching this lens ({sources.length})</summary>
              <ul>
                {sources.map((s) => (
                  <li key={s.uri}>
                    <a href={s.uri} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {error && <p className="p4-error">{error}</p>}
    </div>
  );
}
