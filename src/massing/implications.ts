import { evaluateFormula } from "../shared/formula";
import type { Constraint, GeometryStats, SceneSpec } from "./types";

export interface ImplicationRow {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  // "geometry" rows are measured off the built model; "model" rows come from a
  // formula the LLM supplied. The distinction is shown in the UI because only
  // the first kind is actually trustworthy.
  source: "geometry" | "model";
  error: string | null;
  assumptions: string[];
  warning: string | null;
}

// The variable namespace available to model-supplied formulas.
export function formulaVars(
  values: Record<string, number>,
  stats: GeometryStats
): Record<string, number> {
  return {
    ...values,
    mass_kg: stats.massKg,
    volume_cm3: stats.volumeMm3 / 1000,
    openAreaRatio: stats.openAreaRatio ?? 0,
    bboxW: stats.bbox.w,
    bboxH: stats.bbox.h,
    bboxD: stats.bbox.d,
  };
}

export function geometryRows(stats: GeometryStats): ImplicationRow[] {
  const rows: ImplicationRow[] = [
    {
      id: "geo-bbox",
      label: "Overall size (W x H x D)",
      value: null,
      unit: `${stats.bbox.w.toFixed(0)} x ${stats.bbox.h.toFixed(0)} x ${stats.bbox.d.toFixed(0)} mm`,
      source: "geometry",
      error: null,
      assumptions: [],
      warning: null,
    },
    {
      id: "geo-volume",
      label: "Solid volume",
      value: stats.volumeMm3 / 1000,
      unit: "cm³",
      source: "geometry",
      error: null,
      assumptions: [],
      warning: null,
    },
    {
      id: "geo-mass",
      label: "Mass",
      value: stats.massKg,
      unit: "kg",
      source: "geometry",
      error: null,
      assumptions: ["Solid throughout — no ribbing, bosses or wall thinning."],
      warning: null,
    },
    {
      id: "geo-parts",
      label: "Part count",
      value: stats.partCount,
      unit: "",
      source: "geometry",
      error: null,
      assumptions: [],
      warning: null,
    },
  ];

  if (stats.openAreaRatio !== null) {
    rows.push({
      id: "geo-open-area",
      label: "Open area",
      value: stats.openAreaRatio * 100,
      unit: "%",
      source: "geometry",
      error: null,
      assumptions: [`${stats.holeCount} holes placed by the pattern.`],
      warning:
        stats.openAreaRatio > 0.6
          ? "Over 60% open — very little material left to carry load."
          : null,
    });
  }

  return rows;
}

export function modelRows(
  spec: SceneSpec,
  values: Record<string, number>,
  stats: GeometryStats,
  assumptionOverrides: Record<string, string[]>
): ImplicationRow[] {
  const vars = formulaVars(values, stats);

  return spec.implications.map((imp) => {
    let value: number | null = null;
    let error: string | null = null;
    try {
      const v = evaluateFormula(imp.expression, vars);
      value = Number.isFinite(v) ? v : null;
      if (value === null) error = "Formula produced a non-finite value.";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    let warning: string | null = null;
    if (value !== null) {
      if (imp.warnBelow !== undefined && value < imp.warnBelow) {
        warning = imp.warning ?? `Below ${imp.warnBelow} ${imp.unit}.`;
      } else if (imp.warnAbove !== undefined && value > imp.warnAbove) {
        warning = imp.warning ?? `Above ${imp.warnAbove} ${imp.unit}.`;
      }
    }

    return {
      id: imp.id,
      label: imp.label,
      value,
      unit: imp.unit,
      source: "model" as const,
      error,
      assumptions: assumptionOverrides[imp.id] ?? imp.assumptions,
      warning,
    };
  });
}

export interface ConstraintResult {
  constraint: Constraint;
  value: number | null;
  satisfied: boolean;
  // How far past the limit, as a percentage of the limit. Positive means the
  // constraint is broken by that much.
  overByPct: number | null;
  error: string | null;
}

export function evaluateConstraints(
  spec: SceneSpec,
  values: Record<string, number>,
  stats: GeometryStats
): ConstraintResult[] {
  const vars = formulaVars(values, stats);

  return spec.constraints.map((constraint) => {
    let value: number | null = null;
    let error: string | null = null;
    try {
      const v = evaluateFormula(constraint.expression, vars);
      value = Number.isFinite(v) ? v : null;
      if (value === null) error = "Constraint formula produced a non-finite value.";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    if (value === null) {
      return { constraint, value, satisfied: true, overByPct: null, error };
    }

    const satisfied =
      constraint.operator === ">=" ? value >= constraint.limit : value <= constraint.limit;
    const divisor = Math.abs(constraint.limit) || 1;
    const overByPct = satisfied
      ? null
      : (Math.abs(value - constraint.limit) / divisor) * 100;

    return { constraint, value, satisfied, overByPct, error };
  });
}

export function formatNumber(value: number | null, unit: string): string {
  if (value === null) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

export function formatValue(row: ImplicationRow): string {
  if (row.value === null) return row.unit || "—";
  const abs = Math.abs(row.value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return `${row.value.toFixed(decimals)}${row.unit ? ` ${row.unit}` : ""}`;
}
