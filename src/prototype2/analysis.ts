import type { Axis, Concept, EstimateTable, QualitativeRatings } from "./types";

// A rough uncertainty band applied to single-value qualitative ratings, so
// they can share the same range-overlap math as engineering estimates.
const QUALITATIVE_BAND = 0.4;

export interface Range {
  low: number;
  high: number;
}

export interface ValueRange extends Range {
  // The model's (or designer's) single best-guess value — not necessarily
  // the midpoint of low/high, so it's carried separately for display.
  likely: number;
}

export interface PlotPoint {
  concept: Concept;
  // Raw (as entered/estimated), for display.
  xRaw: ValueRange;
  yRaw: ValueRange;
  // Goodness-normalized: higher is always better, regardless of axis
  // direction, so classification math doesn't need to special-case it.
  xGood: Range;
  yGood: Range;
  classification: "frontier" | "dominated" | "overlapping";
  dominatedBy: string | null;
}

export function toRange(rating: number): Range {
  return { low: rating - QUALITATIVE_BAND, high: rating + QUALITATIVE_BAND };
}

// Looks up a concept's range + likely value on any axis, engineering or
// qualitative, so callers (boundaries, the plot) don't need to branch on
// axis.source themselves.
export function getValueRange(
  axis: Axis,
  conceptId: string,
  estimates: EstimateTable,
  qualitativeRatings: QualitativeRatings
): ValueRange | null {
  if (axis.source === "engineering") {
    const e = estimates[axis.id]?.[conceptId];
    return e ? { low: e.low, likely: e.likely, high: e.high } : null;
  }
  const rating = qualitativeRatings[axis.id]?.[conceptId];
  return rating != null ? { ...toRange(rating), likely: rating } : null;
}

export function getLikely(
  axis: Axis,
  conceptId: string,
  estimates: EstimateTable,
  qualitativeRatings: QualitativeRatings
): number | null {
  if (axis.source === "engineering") {
    return estimates[axis.id]?.[conceptId]?.likely ?? null;
  }
  return qualitativeRatings[axis.id]?.[conceptId] ?? null;
}

function normalize(range: Range, direction: Axis["direction"]): Range {
  if (direction === "higher-better") return range;
  return { low: -range.high, high: -range.low };
}

// "A clearly dominates B" requires A's worst case to still beat B's best
// case on BOTH axes (no ambiguity), and a real gap on at least one — a
// deliberately strict bar, so only unambiguous cases get called out.
function clearlyDominates(a: PlotPoint, b: PlotPoint): boolean {
  const okX = a.xGood.low >= b.xGood.high;
  const okY = a.yGood.low >= b.yGood.high;
  const gapX = a.xGood.low > b.xGood.high;
  const gapY = a.yGood.low > b.yGood.high;
  return okX && okY && (gapX || gapY);
}

function boxesOverlap(a: PlotPoint, b: PlotPoint): boolean {
  const separateX = a.xGood.high < b.xGood.low || b.xGood.high < a.xGood.low;
  const separateY = a.yGood.high < b.yGood.low || b.yGood.high < a.yGood.low;
  return !separateX && !separateY;
}

export function buildPlotPoints(
  concepts: Concept[],
  xAxis: Axis,
  yAxis: Axis,
  xRanges: Record<string, ValueRange>,
  yRanges: Record<string, ValueRange>
): PlotPoint[] {
  const points: PlotPoint[] = concepts.map((concept) => {
    const xRaw = xRanges[concept.id];
    const yRaw = yRanges[concept.id];
    return {
      concept,
      xRaw,
      yRaw,
      xGood: normalize(xRaw, xAxis.direction),
      yGood: normalize(yRaw, yAxis.direction),
      classification: "frontier",
      dominatedBy: null,
    };
  });

  for (const p of points) {
    const dominator = points.find((other) => other !== p && clearlyDominates(other, p));
    if (dominator) {
      p.classification = "dominated";
      p.dominatedBy = dominator.concept.name;
      continue;
    }
    const overlapsAny = points.some(
      (other) =>
        other !== p && other.classification !== "dominated" && boxesOverlap(p, other)
    );
    if (overlapsAny) p.classification = "overlapping";
  }

  return points;
}

export function describeGoodEnd(axis: Axis): string {
  return axis.direction === "higher-better" ? `high ${axis.name}` : `low ${axis.name}`;
}

// Checks whether the "best on both axes" corner of the plotted 2D space (in
// goodness terms) has no concept anywhere near it — a concrete, visual
// stand-in for "empty region of the frontier".
export function isGoodCornerEmpty(points: PlotPoint[]): boolean {
  if (points.length === 0) return false;

  const xs = points.flatMap((p) => [p.xGood.low, p.xGood.high]);
  const ys = points.flatMap((p) => [p.yGood.low, p.yGood.high]);
  const xMid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const yMid = (Math.min(...ys) + Math.max(...ys)) / 2;

  return !points.some((p) => p.xGood.high >= xMid && p.yGood.high >= yMid);
}
