import type { Question, Triage } from "../types";

interface Props {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}

const TRIAGE_LABELS: Record<Triage, string> = {
  unset: "Not triaged",
  "can-answer": "Can answer",
  "needs-exploration": "Needs exploration",
  "out-of-scope": "Out of scope",
};

export function QuestionCard({ question, onUpdate }: Props) {
  return (
    <div className={`p4-question p4-priority-${question.priority}`}>
      <div className="p4-question-header">
        <span className="p4-badge">
          {question.priority === "showstopper" ? "Showstopper" : "Detail"}
        </span>
        <span className="p4-badge p4-badge-muted">confidence: {question.confidence}</span>
      </div>
      <p className="p4-question-text">{question.question}</p>
      <p className="p4-hint">
        <strong>Why:</strong> {question.why}
      </p>
      <p className="p4-hint">
        <strong>Risks:</strong> {question.risksIntent}
      </p>
      <p className="p4-hint">
        <strong>To prepare:</strong> {question.toPrepare}
      </p>
      {question.conflictWithBrief && (
        <p className="p4-conflict">
          <strong>Conflicts with brief:</strong> {question.conflictWithBrief}
        </p>
      )}

      <div className="p4-row">
        {(Object.keys(TRIAGE_LABELS) as Triage[])
          .filter((t) => t !== "unset")
          .map((t) => (
            <button
              key={t}
              className={question.triage === t ? "p4-active" : ""}
              onClick={() => onUpdate({ triage: t })}
            >
              {TRIAGE_LABELS[t]}
            </button>
          ))}
      </div>

      <label className="p4-field">
        Draft response
        <textarea
          rows={2}
          value={question.draftResponse}
          onChange={(e) => onUpdate({ draftResponse: e.target.value })}
        />
      </label>
    </div>
  );
}
