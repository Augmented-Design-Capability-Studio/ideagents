import { useRef } from "react";
import { MAX_IMAGE_BYTES } from "../config";
import type { ImageInput } from "../api";

interface Props {
  brief: string;
  setBrief: (v: string) => void;
  concept: string;
  setConcept: (v: string) => void;
  image: (ImageInput & { previewUrl: string }) | null;
  setImage: (v: (ImageInput & { previewUrl: string }) | null) => void;
  onPropose: () => void;
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  locked: boolean;
  onFillSample: () => void;
}

export function ConceptForm({
  brief,
  setBrief,
  concept,
  setConcept,
  image,
  setImage,
  onPropose,
  status,
  error,
  locked,
  onFillSample,
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
      const base64Data = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setImage({ mimeType: file.type, base64Data, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const canPropose = !locked && brief.trim() && concept.trim() && status !== "loading";

  return (
    <section className="p4-section">
      <div className="section-header">
        <h2>1. Brief, concept, and (optional) reference image</h2>
        {!locked && <button onClick={onFillSample}>Fill sample inputs</button>}
      </div>
      <label className="p4-field">
        Design brief
        <textarea
          rows={2}
          value={brief}
          disabled={locked}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Improve accessibility of a kitchen stove"
        />
      </label>
      <label className="p4-field">
        Concept description
        <textarea
          rows={2}
          value={concept}
          disabled={locked}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="The concept you're bringing to review"
        />
      </label>

      {!locked && (
        <div className="p4-row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {image && <button onClick={() => setImage(null)}>Remove image</button>}
        </div>
      )}
      {image && <img className="p4-image-preview" src={image.previewUrl} alt="Reference" />}

      {!locked && (
        <div className="p4-row">
          <button onClick={onPropose} disabled={!canPropose}>
            {status === "loading" ? "Proposing lenses…" : "Propose review lenses"}
          </button>
        </div>
      )}
      {error && <p className="p4-error">{error}</p>}
    </section>
  );
}
