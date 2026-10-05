import { useRef } from "react";
import { dialLevelInfo, MAX_IMAGE_BYTES } from "../config";
import type { ConceptImage, ConceptVersion } from "../types";

interface Props {
  submitted: boolean;
  // Pre-submit (v1) fields.
  draft: string;
  setDraft: (v: string) => void;
  image: ConceptImage | null;
  setImage: (v: ConceptImage | null) => void;
  onSubmit: () => void;
  onFillSample: () => void;
  submitStatus: "idle" | "loading" | "error";
  submitError: string | null;
  // Post-submit history + revise flow.
  versions: ConceptVersion[];
  isRevising: boolean;
  revisionDraft: string;
  setRevisionDraft: (v: string) => void;
  revisionImage: ConceptImage | null;
  setRevisionImage: (v: ConceptImage | null) => void;
  onSaveRevision: () => void;
  onCancelRevise: () => void;
  revisionStatus: "idle" | "loading" | "error";
  revisionError: string | null;
  sessionEnded: boolean;
  onEndSession: () => void;
}

function readImage(file: File, onLoad: (img: ConceptImage) => void) {
  if (file.size > MAX_IMAGE_BYTES) {
    alert(`Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const base64Data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    onLoad({ mimeType: file.type, base64Data, previewUrl: dataUrl });
  };
  reader.readAsDataURL(file);
}

export function ConceptPanel({
  submitted,
  draft,
  setDraft,
  image,
  setImage,
  onSubmit,
  onFillSample,
  submitStatus,
  submitError,
  versions,
  isRevising,
  revisionDraft,
  setRevisionDraft,
  revisionImage,
  setRevisionImage,
  onSaveRevision,
  onCancelRevise,
  revisionStatus,
  revisionError,
  sessionEnded,
  onEndSession,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const revisionFileInput = useRef<HTMLInputElement>(null);

  if (!submitted) {
    return (
      <section className="p5-col p5-section">
        <div className="section-header">
          <h2>Concept</h2>
          <button onClick={onFillSample}>Fill sample input</button>
        </div>
        <label className="p5-field">
          Your concept
          <textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe your initial concept — what it is, how it works, who it's for."
          />
        </label>
        <div className="p5-row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readImage(file, setImage);
            }}
          />
          {image && <button onClick={() => setImage(null)}>Remove image</button>}
        </div>
        {image && <img className="p5-image-preview" src={image.previewUrl} alt="Concept sketch" />}
        <div className="p5-row">
          <button onClick={onSubmit} disabled={!draft.trim() || submitStatus === "loading"}>
            {submitStatus === "loading" ? "Starting…" : "Submit concept"}
          </button>
        </div>
        {submitError && <p className="p5-error">{submitError}</p>}
      </section>
    );
  }

  const latest = versions[versions.length - 1];

  return (
    <section className="p5-col p5-section">
      <h2>Concept</h2>

      {isRevising ? (
        <div className="p5-revise-box">
          <label className="p5-field">
            Revised concept (v{versions.length + 1})
            <textarea
              rows={6}
              value={revisionDraft}
              onChange={(e) => setRevisionDraft(e.target.value)}
            />
          </label>
          <div className="p5-row">
            <input
              ref={revisionFileInput}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImage(file, setRevisionImage);
              }}
            />
            {revisionImage && (
              <button onClick={() => setRevisionImage(null)}>Remove image</button>
            )}
          </div>
          {revisionImage && (
            <img className="p5-image-preview" src={revisionImage.previewUrl} alt="Revised sketch" />
          )}
          <div className="p5-row">
            <button
              onClick={onSaveRevision}
              disabled={!revisionDraft.trim() || revisionStatus === "loading"}
            >
              {revisionStatus === "loading" ? "Saving…" : "Save new version"}
            </button>
            <button onClick={onCancelRevise} disabled={revisionStatus === "loading"}>
              Cancel
            </button>
          </div>
          {revisionError && <p className="p5-error">{revisionError}</p>}
        </div>
      ) : (
        <p className="p5-hint">
          Current version: v{latest.version}
          {latest.image && " (has a sketch)"}
        </p>
      )}

      <h3>History</h3>
      <ul className="p5-history">
        {versions.map((v) => (
          <li key={v.version} className="p5-history-item">
            <div className="p5-history-head">
              <strong>v{v.version}</strong>
              <span className="p5-hint">{new Date(v.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="p5-hint">{v.summary}</p>
            <p className="p5-history-text">{v.text}</p>
            {v.image && (
              <img className="p5-image-preview" src={v.image.previewUrl} alt={`v${v.version} sketch`} />
            )}
            {v.version > 1 && (
              <div className="p5-distance" title={`Distance from v1: ${v.distance}/100`}>
                <div className="p5-distance-bar">
                  <div className="p5-distance-fill" style={{ width: `${v.distance}%` }} />
                </div>
                <span className="p5-hint">{v.distance}/100 from start</span>
              </div>
            )}
            {v.challenges.length > 0 && (
              <details className="p5-history-challenges">
                <summary>Challenges for this version ({v.challenges.length})</summary>
                <ul>
                  {v.challenges.map((c) => (
                    <li key={c.id}>
                      <span className="p5-hint">
                        Level {c.dialLevel} · {dialLevelInfo(c.dialLevel).label}:
                      </span>{" "}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>

      {sessionEnded ? (
        <p className="p5-ended">
          Session complete — v{versions[versions.length - 1].version} is the submitted version.
        </p>
      ) : (
        !isRevising && (
          <div className="p5-row">
            <button onClick={onEndSession}>End session</button>
          </div>
        )
      )}
    </section>
  );
}
