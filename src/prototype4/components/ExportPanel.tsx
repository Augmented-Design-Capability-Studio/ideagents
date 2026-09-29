import { useState } from "react";
import type { Lens, Question } from "../types";

interface Props {
  lenses: Lens[];
  questions: Question[];
}

export function ExportPanel({ lenses, questions }: Props) {
  const [copied, setCopied] = useState(false);
  const triaged = questions.filter((q) => q.triage !== "unset");
  if (triaged.length === 0) return null;

  const exportData = lenses
    .map((lens) => ({
      lens: lens.name,
      questions: triaged
        .filter((q) => q.lensId === lens.id)
        .map((q) => ({
          question: q.question,
          why: q.why,
          risksIntent: q.risksIntent,
          priority: q.priority,
          confidence: q.confidence,
          conflictWithBrief: q.conflictWithBrief,
          triage: q.triage,
          draftResponse: q.draftResponse || null,
        })),
    }))
    .filter((l) => l.questions.length > 0);

  const openItems = triaged.filter((q) => q.triage === "needs-exploration").length;
  const json = JSON.stringify({ prepared: exportData, openItemCount: openItems }, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable; the JSON is already visible below.
    }
  };

  return (
    <section className="p4-section">
      <h2>3. Export prepared brief</h2>
      <p className="p4-hint">
        Triaged questions with the designer's responses and open items, ready to bring to the
        engineer.
      </p>
      <div className="p4-row">
        <button onClick={() => void copy()}>{copied ? "Copied!" : "Copy JSON"}</button>
      </div>
      <pre className="p4-export">{json}</pre>
    </section>
  );
}
