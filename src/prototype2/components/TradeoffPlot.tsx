import { useState, type MouseEvent } from "react";
import {
  buildPlotPoints,
  describeGoodEnd,
  getLikely,
  getValueRange,
  isGoodCornerEmpty,
  type PlotPoint,
  type ValueRange,
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
  onAddSuggestedConcept: (
    concept: Concept,
    hints: { axis: Axis; value: number }[]
  ) => Promise<{ ok: boolean; warning?: string }>;
  onDeleteConcept: (conceptId: string) => void;
  onNeedAgent: () => void;
}

function clampForAxis(axis: Axis, value: number): number {
  if (axis.source === "qualitative") {
    return Math.round(Math.min(5, Math.max(1, value)) * 2) / 2;
  }
  return Math.round(Math.min(10, Math.max(1, value)) * 10) / 10;
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
  onAddSuggestedConcept,
  onDeleteConcept,
  onNeedAgent,
}: Props) {
  const [gapStatus, setGapStatus] = useState<"idle" | "loading" | "error">("idle");
  const [gapError, setGapError] = useState<string | null>(null);

  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "error">("idle");
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);

  const xAxis = axes.find((a) => a.id === plotX);
  const yAxis = axes.find((a) => a.id === plotY);
  if (!xAxis || !yAxis) return null;

  const withData = concepts.filter(
    (c) =>
      getValueRange(xAxis, c.id, estimates, qualitativeRatings) &&
      getValueRange(yAxis, c.id, estimates, qualitativeRatings)
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

  const xRanges: Record<string, ValueRange> = {};
  const yRanges: Record<string, ValueRange> = {};
  for (const c of withData) {
    xRanges[c.id] = getValueRange(xAxis, c.id, estimates, qualitativeRatings)!;
    yRanges[c.id] = getValueRange(yAxis, c.id, estimates, qualitativeRatings)!;
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

  const TICK_COUNT = 5;
  const ticksFor = (min: number, max: number) => {
    const step = (max - min) / (TICK_COUNT - 1);
    return Array.from({ length: TICK_COUNT }, (_, i) => min + step * i);
  };
  const xTicks = ticksFor(xMin, xMax);
  const yTicks = ticksFor(yMin, yMax);

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
      const concept: Concept = {
        id: `concept-gap-${Date.now()}`,
        name: suggestion.name,
        description: suggestion.description,
        aiSuggested: true,
      };
      const result = await onAddSuggestedConcept(concept, []);
      setGapStatus(result.ok ? "idle" : "error");
      setGapError(result.ok ? null : result.warning ?? null);
    } catch (err) {
      setGapStatus("error");
      setGapError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePlotClick = async (e: MouseEvent<SVGRectElement>) => {
    if (addStatus === "loading") return;
    if (!apiKey) {
      onNeedAgent();
      return;
    }
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const scale = WIDTH / box.width;
    const px = (e.clientX - box.left) * scale;
    const py = (e.clientY - box.top) * scale;
    const rawX = clampForAxis(
      xAxis,
      xMin + ((px - MARGIN) / (WIDTH - 2 * MARGIN)) * (xMax - xMin)
    );
    const rawY = clampForAxis(
      yAxis,
      yMin + ((HEIGHT - MARGIN - py) / (HEIGHT - 2 * MARGIN)) * (yMax - yMin)
    );

    setPendingPoint({ x: rawX, y: rawY });
    setAddStatus("loading");
    setAddError(null);
    try {
      const region = `roughly ${rawX} out of ${xAxis.source === "qualitative" ? 5 : 10} on ${xAxis.name} (${xAxis.direction === "higher-better" ? "higher is better" : "lower is better"}), and roughly ${rawY} out of ${yAxis.source === "qualitative" ? 5 : 10} on ${yAxis.name} (${yAxis.direction === "higher-better" ? "higher is better" : "lower is better"})`;
      const suggestion = await suggestGapConcept(
        apiKey,
        brief,
        concepts,
        xAxis.name,
        yAxis.name,
        region
      );
      const concept: Concept = {
        id: `concept-click-${Date.now()}`,
        name: suggestion.name,
        description: suggestion.description,
        aiSuggested: true,
      };
      const result = await onAddSuggestedConcept(concept, [
        { axis: xAxis, value: rawX },
        { axis: yAxis, value: rawY },
      ]);
      setPendingPoint(null);
      setAddStatus(result.ok ? "idle" : "error");
      setAddError(result.ok ? null : result.warning ?? null);
    } catch (err) {
      setAddStatus("error");
      setAddError(err instanceof Error ? err.message : String(err));
      setPendingPoint(null);
    }
  };

  const handleDeletePoint = (concept: Concept) => {
    if (window.confirm(`Remove "${concept.name}" from the comparison?`)) {
      onDeleteConcept(concept.id);
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
      <p className="p2-hint">
        Click empty space to have the model imagine a concept there; click an existing point to
        remove it. Shaded box = low-high estimate range; dot = best-guess ("likely") value. Hover
        a point for exact numbers.
      </p>

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

        <rect
          x={MARGIN}
          y={MARGIN}
          width={WIDTH - 2 * MARGIN}
          height={HEIGHT - 2 * MARGIN}
          fill="transparent"
          pointerEvents="all"
          className="p2-plot-catcher"
          onClick={(e) => void handlePlotClick(e)}
        />

        {xTicks.map((t, i) => (
          <g key={`xt-${i}`}>
            <line
              x1={sx(t)}
              y1={MARGIN}
              x2={sx(t)}
              y2={HEIGHT - MARGIN}
              stroke="#eee"
            />
            <line x1={sx(t)} y1={HEIGHT - MARGIN} x2={sx(t)} y2={HEIGHT - MARGIN + 4} stroke="#999" />
            <text x={sx(t)} y={HEIGHT - MARGIN + 14} textAnchor="middle" className="p2-plot-tick">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={MARGIN}
              y1={sy(t)}
              x2={WIDTH - MARGIN}
              y2={sy(t)}
              stroke="#eee"
            />
            <line x1={MARGIN - 4} y1={sy(t)} x2={MARGIN} y2={sy(t)} stroke="#999" />
            <text x={MARGIN - 8} y={sy(t) + 3} textAnchor="end" className="p2-plot-tick">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

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
          <g
            key={p.concept.id}
            className="p2-plot-point"
            onClick={() => handleDeletePoint(p.concept)}
          >
            <title>
              {`${p.concept.name} (click to remove)\n${xAxis.name}: ${p.xRaw.low.toFixed(1)}-${p.xRaw.high.toFixed(1)} (likely ${p.xRaw.likely.toFixed(1)})\n${yAxis.name}: ${p.yRaw.low.toFixed(1)}-${p.yRaw.high.toFixed(1)} (likely ${p.yRaw.likely.toFixed(1)})`}
            </title>
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
            <circle cx={sx(p.xRaw.likely)} cy={sy(p.yRaw.likely)} r={4} fill={colorFor(p.classification)} />
            <text x={sx(p.xRaw.likely) + 6} y={sy(p.yRaw.likely) - 6} className="p2-plot-point-label">
              {p.concept.name}
            </text>
          </g>
        ))}

        {pendingPoint && addStatus === "loading" && (
          <g className="p2-plot-pending">
            <circle
              cx={sx(pendingPoint.x)}
              cy={sy(pendingPoint.y)}
              r={7}
              fill="none"
              stroke="#4a90e2"
              strokeDasharray="3 2"
            />
            <text
              x={sx(pendingPoint.x) + 9}
              y={sy(pendingPoint.y) - 9}
              className="p2-plot-point-label"
            >
              Thinking…
            </text>
          </g>
        )}
      </svg>
      {addStatus === "error" && addError && <p className="p2-error">{addError}</p>}

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
