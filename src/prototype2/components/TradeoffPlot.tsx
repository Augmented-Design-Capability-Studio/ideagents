import { useState } from "react";
import {
  buildPlotPoints,
  describeGoodEnd,
  getLikely,
  getRange,
  isGoodCornerEmpty,
  type PlotPoint,
  type Range,
} from "../analysis";
import { suggestGapConcept } from "../api";
import type {
  Axis,
  Boundary,
  Concept,
  EstimateTable,
  QualitativeRatings,
} from "../types";

interface Props {
  brief: string;
  apiKey: string | null;
  concepts: Concept[];
  axes: Axis[];
  estimates: EstimateTable;
  qualitativeRatings: QualitativeRatings;
  boundaries: Boundary[];
  plotX: string;
  plotY: string;
  setPlotX: (id: string) => void;
  setPlotY: (id: string) => void;
  onAddConcept: (concept: Concept) => void;
  onNeedAgent: () => void;
}

const WIDTH = 520;
const HEIGHT = 360;
const MARGIN = 44;

function isExcluded(
  conceptId: string,
  axes: Axis[],
  boundaries: Boundary[],
  estimates: EstimateTable,
  qualitativeRatings: QualitativeRatings
): boolean {
  return boundaries.some((b) => {
    const axis = axes.find((a) => a.id === b.axisId);
    if (!axis) return false;
    const value = getLikely(axis, conceptId, estimates, qualitativeRatings);
    if (value == null) return false;
    return axis.direction === "higher-better" ? value < b.min : value > b.min;
  });
}

export function TradeoffPlot({
  brief,
  apiKey,
  concepts,
  axes,
  estimates,
  qualitativeRatings,
  boundaries,
  plotX,
  plotY,
  setPlotX,
  setPlotY,
  onAddConcept,
  onNeedAgent,
}: Props) {
  const [gapStatus, setGapStatus] = useState<"idle" | "loading" | "error">("idle");
  const [gapError, setGapError] = useState<string | null>(null);

  const xAxis = axes.find((a) => a.id === plotX);
  const yAxis = axes.find((a) => a.id === plotY);
  if (!xAxis || !yAxis) return null;

  const withData = concepts.filter(
    (c) =>
      getRange(xAxis, c.id, estimates, qualitativeRatings) &&
      getRange(yAxis, c.id, estimates, qualitativeRatings)
  );
  if (withData.length === 0) {
    return (
      <section className="p2-section">
        <h2>5. Trade-off plot</h2>
        <p className="p2-hint">Estimate concepts on at least one pair of axes first.</p>
      </section>
    );
  }

  const included = withData.filter(
    (c) => !isExcluded(c.id, axes, boundaries, estimates, qualitativeRatings)
  );
  const excludedConcepts = withData.filter(
    (c) => !included.some((i) => i.id === c.id)
  );

  const xRanges: Record<string, Range> = {};
  const yRanges: Record<string, Range> = {};
  for (const c of withData) {
    xRanges[c.id] = getRange(xAxis, c.id, estimates, qualitativeRatings)!;
    yRanges[c.id] = getRange(yAxis, c.id, estimates, qualitativeRatings)!;
  }

  const points = buildPlotPoints(included, xAxis, yAxis, xRanges, yRanges);
  const excludedPoints = buildPlotPoints(excludedConcepts, xAxis, yAxis, xRanges, yRanges).map(
    (p) => ({ ...p, classification: "excluded" as const })
  );
  const allPoints = [...points, ...excludedPoints];

  const xs = allPoints.flatMap((p) => [p.xRaw.low, p.xRaw.high]);
  const ys = allPoints.flatMap((p) => [p.yRaw.low, p.yRaw.high]);
  const xMin = Math.min(...xs) - 0.5;
  const xMax = Math.max(...xs) + 0.5;
  const yMin = Math.min(...ys) - 0.5;
  const yMax = Math.max(...ys) + 0.5;

  const sx = (v: number) => MARGIN + ((v - xMin) / (xMax - xMin)) * (WIDTH - 2 * MARGIN);
  const sy = (v: number) =>
    HEIGHT - MARGIN - ((v - yMin) / (yMax - yMin)) * (HEIGHT - 2 * MARGIN);

  const emptyGoodCorner = isGoodCornerEmpty(points);

  const colorFor = (classification: PlotPoint["classification"] | "excluded") => {
    if (classification === "excluded") return "#bbb";
    if (classification === "dominated") return "#c62828";
    if (classification === "overlapping") return "#e6a817";
    return "#2e9e44";
  };

  const askForGap = async () => {
    if (!apiKey) {
      onNeedAgent();
      return;
    }
    setGapStatus("loading");
    setGapError(null);
    try {
      const region = `${describeGoodEnd(xAxis)} and ${describeGoodEnd(yAxis)}`;
      const suggestion = await suggestGapConcept(
        apiKey,
        brief,
        concepts,
        xAxis.name,
        yAxis.name,
        region
      );
      onAddConcept({
        id: `concept-gap-${Date.now()}`,
        name: suggestion.name,
        description: suggestion.description,
        aiSuggested: true,
      });
      setGapStatus("idle");
    } catch (err) {
      setGapStatus("error");
      setGapError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="p2-section">
      <h2>5. Trade-off plot</h2>
      <div className="p2-row">
        <label>
          X axis
          <select value={plotX} onChange={(e) => setPlotX(e.target.value)}>
            {axes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Y axis
          <select value={plotY} onChange={(e) => setPlotY(e.target.value)}>
            {axes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="p2-plot"
        role="img"
        aria-label={`Trade-off plot of ${xAxis.name} vs ${yAxis.name}`}
      >
        <line
          x1={MARGIN}
          y1={HEIGHT - MARGIN}
          x2={WIDTH - MARGIN}
          y2={HEIGHT - MARGIN}
          stroke="#ccc"
        />
        <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={HEIGHT - MARGIN} stroke="#ccc" />
        <text x={WIDTH / 2} y={HEIGHT - 8} textAnchor="middle" className="p2-plot-label">
          {xAxis.name} ({xAxis.direction === "higher-better" ? "higher better" : "lower better"})
        </text>
        <text
          x={14}
          y={HEIGHT / 2}
          textAnchor="middle"
          className="p2-plot-label"
          transform={`rotate(-90 14 ${HEIGHT / 2})`}
        >
          {yAxis.name} ({yAxis.direction === "higher-better" ? "higher better" : "lower better"})
        </text>

        {allPoints.map((p) => (
          <g key={p.concept.id}>
            <rect
              x={sx(p.xRaw.low)}
              y={sy(p.yRaw.high)}
              width={Math.max(2, sx(p.xRaw.high) - sx(p.xRaw.low))}
              height={Math.max(2, sy(p.yRaw.low) - sy(p.yRaw.high))}
              fill={colorFor(p.classification)}
              fillOpacity={p.classification === "excluded" ? 0.12 : 0.18}
              stroke={colorFor(p.classification)}
              strokeDasharray={p.classification === "excluded" ? "3 2" : undefined}
            />
            <circle
              cx={sx((p.xRaw.low + p.xRaw.high) / 2)}
              cy={sy((p.yRaw.low + p.yRaw.high) / 2)}
              r={4}
              fill={colorFor(p.classification)}
            />
            <text
              x={sx((p.xRaw.low + p.xRaw.high) / 2) + 6}
              y={sy((p.yRaw.low + p.yRaw.high) / 2) - 6}
              className="p2-plot-point-label"
            >
              {p.concept.name}
            </text>
          </g>
        ))}
      </svg>

      <div className="p2-legend">
        <span>
          <i className="p2-dot" style={{ background: "#2e9e44" }} /> frontier
        </span>
        <span>
          <i className="p2-dot" style={{ background: "#e6a817" }} /> overlapping, can't tell
        </span>
        <span>
          <i className="p2-dot" style={{ background: "#c62828" }} /> clearly dominated
        </span>
        {excludedConcepts.length > 0 && (
          <span>
            <i className="p2-dot" style={{ background: "#bbb" }} /> excluded by boundary
          </span>
        )}
      </div>

      {points.some((p) => p.classification === "dominated") && (
        <p className="p2-hint">
          {points
            .filter((p) => p.classification === "dominated")
            .map((p) => `${p.concept.name} is dominated by ${p.dominatedBy}`)
            .join("; ")}
        </p>
      )}

      {emptyGoodCorner && (
        <div className="p2-gap-note">
          <p>
            No concept is strong on both {describeGoodEnd(xAxis)} and {describeGoodEnd(yAxis)} —
            that corner of the trade-off space is unexplored.
          </p>
          <button onClick={() => void askForGap()} disabled={gapStatus === "loading"}>
            {gapStatus === "loading"
              ? "Thinking…"
              : "Ask the LLM to imagine a concept there"}
          </button>
          {gapError && <p className="p2-error">{gapError}</p>}
        </div>
      )}
    </section>
  );
}
