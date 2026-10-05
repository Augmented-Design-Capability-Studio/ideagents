// The four kinds of concept this prototype can visualize. They differ mostly
// in how the scene is framed (orbit an object vs. stand inside a volume) and
// which implications matter — not in the geometry vocabulary itself.
export type ConceptKind = "part" | "space" | "material" | "mechanism";

// Dimensions are either a literal number (mm) or an expression over the
// parameter ids, so every number in the scene can be driven by a slider.
export type Expr = number | string;

export type Vec3 = [Expr, Expr, Expr];

export interface Parameter {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  default: number;
}

export interface HolePattern {
  kind: "grid" | "hexGrid" | "radial" | "single";
  shape: "circle" | "rect";
  d?: Expr;
  w?: Expr;
  h?: Expr;
  spacing?: Expr;
  spacingY?: Expr;
  margin?: Expr;
  count?: Expr;
  radius?: Expr;
  x?: Expr;
  y?: Expr;
}

export type ShapeKind = "box" | "plate" | "cylinder" | "sphere" | "lathe" | "extrude";

export interface SceneNode {
  id: string;
  label: string;
  shape: ShapeKind;
  materialId: string;
  position?: Vec3;
  rotation?: Vec3;
  // box
  w?: Expr;
  h?: Expr;
  d?: Expr;
  // plate — w/h are the face, extruded by thickness, with optional holes
  thickness?: Expr;
  cornerRadius?: Expr;
  holes?: HolePattern[];
  // cylinder / sphere
  radius?: Expr;
  radiusTop?: Expr;
  height?: Expr;
  // lathe: [radius, y] pairs. extrude: [x, y] pairs plus depth.
  profile?: [Expr, Expr][];
  depth?: Expr;
  // Where this node sits in each named state (mechanism concepts).
  stateTransforms?: Record<string, { position?: Vec3; rotation?: Vec3 }>;
  // Render inner faces — for enclosure walls you view from inside.
  inside?: boolean;
}

export interface SceneState {
  id: string;
  label: string;
}

// A domain implication the model supplies as a formula, evaluated client-side
// against the parameters plus the geometry-derived values, so the designer can
// see and edit the assumptions behind every number.
export interface Implication {
  id: string;
  label: string;
  unit: string;
  expression: string;
  assumptions: string[];
  warnBelow?: number;
  warnAbove?: number;
  warning?: string;
  // Which direction counts as better, so configurations can be compared
  // without the tool inventing a preference. "none" for neutral facts.
  betterWhen?: "lower" | "higher" | "none";
}

// A named hard limit with a source, evaluated the same way implications are.
// Kept separate from an implication's warnBelow/warnAbove because a constraint
// is a thing a configuration can deliberately break — and seeing what a
// configuration buys by breaking it is the point, not an error to be avoided.
export interface Constraint {
  id: string;
  label: string;
  expression: string;
  unit: string;
  operator: ">=" | "<=";
  limit: number;
  // Where the limit comes from — a standard, a process rule of thumb, a
  // package hardpoint. Without this a constraint is just a number.
  source: string;
  rationale: string;
}

export interface SceneSpec {
  kind: ConceptKind;
  kindReason: string;
  title: string;
  parameters: Parameter[];
  nodes: SceneNode[];
  states: SceneState[];
  implications: Implication[];
  constraints: Constraint[];
  // Seated/standing eye height for "space" concepts, in mm.
  eyeHeight?: number;
  notes: string[];
}

// Everything measured off the built geometry rather than asked of the model.
export interface GeometryStats {
  volumeMm3: number;
  massKg: number;
  bbox: { w: number; h: number; d: number };
  partCount: number;
  // Null when no node has holes.
  openAreaRatio: number | null;
  holeCount: number;
  perNode: { id: string; label: string; volumeMm3: number; massKg: number }[];
}

export interface RenderedImage {
  materialId: string;
  materialName: string;
  dataUrl: string;
}
