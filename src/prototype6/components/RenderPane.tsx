import { useState } from "react";
import { getImageModel, IMAGE_MODELS, setImageModel } from "../../massing/config";
import { MATERIALS, material } from "../../massing/materials";
import type { RenderedImage } from "../../massing/types";

interface Props {
  renders: RenderedImage[];
  status: "idle" | "loading" | "error";
  error: string | null;
  pendingMaterialId: string;
  setPendingMaterialId: (id: string) => void;
  onRender: () => void;
  onClear: () => void;
}

export function RenderPane({
  renders,
  status,
  error,
  pendingMaterialId,
  setPendingMaterialId,
  onRender,
  onClear,
}: Props) {
  const [imageModel, setImageModelState] = useState(getImageModel());

  const changeModel = (m: string) => {
    setImageModel(m);
    setImageModelState(m);
  };

  return (
    <section className="p6-section">
      <div className="section-header">
        <h2>5. CMF render</h2>
        {renders.length > 0 && <button onClick={onClear}>Clear</button>}
      </div>
      <p className="p6-hint">
        Sends the current viewport image to the image model and asks it to re-light the same
        geometry in a chosen finish. The render will prettify — treat it as a mood image, and the
        numbers above as the truth.
      </p>

      <div className="p6-row">
        <select value={pendingMaterialId} onChange={(e) => setPendingMaterialId(e.target.value)}>
          {MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button onClick={onRender} disabled={status === "loading"}>
          {status === "loading" ? "Rendering…" : "Render this view"}
        </button>
      </div>
      <div className="p6-row">
        <label className="p6-hint">
          Image model{" "}
          <select value={imageModel} onChange={(e) => changeModel(e.target.value)}>
            {IMAGE_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="p6-error">{error}</p>}

      {renders.length > 0 && (
        <div className="p6-renders">
          {renders.map((r, i) => (
            <figure className="p6-render" key={`${r.materialId}-${i}`}>
              <img src={r.dataUrl} alt={`Render in ${r.materialName}`} />
              <figcaption>
                <span className="p6-swatch" style={{ background: material(r.materialId).color }} />
                {r.materialName}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
