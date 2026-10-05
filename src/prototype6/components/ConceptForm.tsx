import { useRef } from "react";
import { MAX_IMAGE_BYTES, SAMPLES } from "../config";

export interface SketchImage {
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}

interface Props {
  concept: string;
  setConcept: (v: string) => void;
  sketch: SketchImage | null;
  setSketch: (v: SketchImage | null) => void;
  onGenerate: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
}

export function ConceptForm({
  concept,
  setConcept,
  sketch,
  setSketch,
  onGenerate,
  status,
  error,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSketch({
        mimeType: file.type,
        base64Data: dataUrl.slice(dataUrl.indexOf(",") + 1),
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="p6-section">
      <div className="section-header">
        <h2>1. Concept</h2>
      </div>

      <label className="p6-field">
        Describe the concept (or upload a rough sketch)
        <textarea
          rows={5}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="e.g. A perforated panel set into a vehicle headrest so passengers behind can see through it."
        />
      </label>

      <div className="p6-row">
        <select
          value=""
          onChange={(e) => {
            const sample = SAMPLES.find((s) => s.label === e.target.value);
            if (sample) setConcept(sample.text);
          }}
        >
          <option value="">Fill a sample concept…</option>
          {SAMPLES.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="p6-row">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {sketch && <button onClick={() => setSketch(null)}>Remove sketch</button>}
      </div>
      {sketch && <img className="p6-sketch-preview" src={sketch.previewUrl} alt="Sketch" />}

      <div className="p6-row">
        <button onClick={onGenerate} disabled={!concept.trim() || status === "loading"}>
          {status === "loading" ? "Building model…" : "Build 3D model"}
        </button>
      </div>
      {error && <p className="p6-error">{error}</p>}
    </section>
  );
}
