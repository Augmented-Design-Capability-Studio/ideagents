import { useState } from "react";
import type { PriorArtItem } from "../types";

interface Props {
  items: PriorArtItem[];
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
  onShowMore: () => void;
  moreStatus: "idle" | "loading" | "done" | "error";
  moreError: string | null;
}

const SIZE = 280;
const CENTER = SIZE / 2;
const MIN_R = 30;
const MAX_R = 120;

export function PriorArtPanel({ items, status, error, onShowMore, moreStatus, moreError }: Props) {
  const [graphView, setGraphView] = useState(false);

  const searchComplete = status === "done" || status === "error";

  return (
    <section className="p5-col p5-section">
      <div className="section-header">
        <h2>Already done — go beyond these</h2>
        {items.length > 0 && (
          <button onClick={() => setGraphView((v) => !v)}>
            {graphView ? "List view" : "Graph view"}
          </button>
        )}
      </div>

      {status === "loading" && <p className="p5-hint">Searching for prior art…</p>}
      {error && <p className="p5-error">{error}</p>}
      {status === "done" && items.length === 0 && (
        <p className="p5-hint">No close prior art found.</p>
      )}

      <div className="p5-prior-art-scroll">
        {items.length > 0 && !graphView && (
          <ul className="p5-prior-art-list">
            {items.map((item, i) => (
              <li key={i} className="p5-prior-art-item">
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    source
                  </a>
                ) : (
                  <span className="p5-hint">(no verified source)</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && graphView && (
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="p5-graph"
            role="img"
            aria-label="Prior art similarity graph"
          >
            {items.map((item, i) => {
              const angle = (i / items.length) * 2 * Math.PI;
              const r = MAX_R - (item.similarity / 100) * (MAX_R - MIN_R);
              const x = CENTER + r * Math.cos(angle);
              const y = CENTER + r * Math.sin(angle);
              return (
                <g key={i}>
                  <title>{`${item.title} (similarity ${item.similarity}/100)`}</title>
                  <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#ddd" />
                  <circle cx={x} cy={y} r={6} fill="#4a90e2" />
                  <text x={x} y={y - 10} textAnchor="middle" className="p5-graph-label">
                    {item.title.length > 18 ? `${item.title.slice(0, 16)}…` : item.title}
                  </text>
                </g>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={10} fill="#2e9e44" />
            <text
              x={CENTER}
              y={CENTER + 24}
              textAnchor="middle"
              className="p5-graph-label p5-graph-center-label"
            >
              Your concept
            </text>
          </svg>
        )}
      </div>

      {searchComplete && (
        <div className="p5-row p5-show-more">
          <button onClick={onShowMore} disabled={moreStatus === "loading"}>
            {moreStatus === "loading" ? "Searching harder…" : "Show me more"}
          </button>
        </div>
      )}
      {moreError && <p className="p5-error">{moreError}</p>}
    </section>
  );
}
