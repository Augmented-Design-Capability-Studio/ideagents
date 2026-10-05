import * as THREE from "three";
import { evaluateFormula } from "../shared/formula";
import { material } from "./materials";
import type { Expr, GeometryStats, HolePattern, SceneNode, SceneSpec, Vec3 } from "./types";

// Everything in the spec is in millimetres; the scene is scaled to metres so
// camera distances and lighting behave sensibly.
export const MM_TO_SCENE = 0.001;

// A pathological spacing value ("0.4mm pitch on a 300mm panel") would ask for
// hundreds of thousands of holes and lock the tab, so patterns are capped.
const MAX_HOLES = 800;

export function resolveExpr(e: Expr | undefined, vars: Record<string, number>, fallback = 0): number {
  if (e === undefined || e === null) return fallback;
  if (typeof e === "number") return Number.isFinite(e) ? e : fallback;
  try {
    const v = evaluateFormula(e, vars);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function resolveVec(v: Vec3 | undefined, vars: Record<string, number>): [number, number, number] {
  if (!v) return [0, 0, 0];
  return [resolveExpr(v[0], vars), resolveExpr(v[1], vars), resolveExpr(v[2], vars)];
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  if (rr > 0) shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + h - rr);
  if (rr > 0) shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  shape.lineTo(x + rr, y + h);
  if (rr > 0) shape.quadraticCurveTo(x, y + h, x, y + h - rr);
  shape.lineTo(x, y + rr);
  if (rr > 0) shape.quadraticCurveTo(x, y, x + rr, y);
  return shape;
}

interface PlacedHole {
  x: number;
  y: number;
  // Circle radius, or rect half-extents.
  r?: number;
  w?: number;
  h?: number;
  area: number;
}

function placeHoles(
  patterns: HolePattern[],
  faceW: number,
  faceH: number,
  vars: Record<string, number>
): PlacedHole[] {
  const out: PlacedHole[] = [];

  for (const p of patterns) {
    const margin = resolveExpr(p.margin, vars, 0);
    const usableW = Math.max(0, faceW - 2 * margin);
    const usableH = Math.max(0, faceH - 2 * margin);

    const make = (x: number, y: number): PlacedHole | null => {
      if (p.shape === "rect") {
        const w = resolveExpr(p.w, vars, 4);
        const h = resolveExpr(p.h, vars, 4);
        if (w <= 0 || h <= 0) return null;
        if (Math.abs(x) + w / 2 > usableW / 2 || Math.abs(y) + h / 2 > usableH / 2) return null;
        return { x, y, w, h, area: w * h };
      }
      const r = resolveExpr(p.d, vars, 4) / 2;
      if (r <= 0) return null;
      if (Math.abs(x) + r > usableW / 2 || Math.abs(y) + r > usableH / 2) return null;
      return { x, y, r, area: Math.PI * r * r };
    };

    const push = (x: number, y: number) => {
      if (out.length >= MAX_HOLES) return;
      const hole = make(x, y);
      if (hole) out.push(hole);
    };

    if (p.kind === "single") {
      push(resolveExpr(p.x, vars, 0), resolveExpr(p.y, vars, 0));
      continue;
    }

    if (p.kind === "radial") {
      const count = Math.max(1, Math.min(200, Math.round(resolveExpr(p.count, vars, 8))));
      const radius = resolveExpr(p.radius, vars, Math.min(usableW, usableH) / 3);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        push(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      continue;
    }

    const spacingX = Math.max(0.5, resolveExpr(p.spacing, vars, 10));
    const hex = p.kind === "hexGrid";
    const spacingY = hex
      ? spacingX * (Math.sqrt(3) / 2)
      : Math.max(0.5, resolveExpr(p.spacingY ?? p.spacing, vars, spacingX));

    const cols = Math.floor(usableW / spacingX) + 1;
    const rows = Math.floor(usableH / spacingY) + 1;
    if (cols <= 0 || rows <= 0) continue;

    for (let row = 0; row < rows; row++) {
      const y = -((rows - 1) * spacingY) / 2 + row * spacingY;
      const offset = hex && row % 2 === 1 ? spacingX / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const x = -((cols - 1) * spacingX) / 2 + col * spacingX + offset;
        push(x, y);
      }
    }
  }

  return out;
}

function shoelaceArea(points: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

interface BuiltNode {
  mesh: THREE.Mesh;
  volumeMm3: number;
  holeArea: number;
  faceArea: number;
  holeCount: number;
}

function buildNode(node: SceneNode, vars: Record<string, number>): BuiltNode | null {
  let geometry: THREE.BufferGeometry;
  let volumeMm3 = 0;
  let holeArea = 0;
  let faceArea = 0;
  let holeCount = 0;

  switch (node.shape) {
    case "box": {
      const w = resolveExpr(node.w, vars, 50);
      const h = resolveExpr(node.h, vars, 50);
      const d = resolveExpr(node.d, vars, 50);
      if (w <= 0 || h <= 0 || d <= 0) return null;
      geometry = new THREE.BoxGeometry(w, h, d);
      volumeMm3 = w * h * d;
      break;
    }

    case "plate": {
      const w = resolveExpr(node.w, vars, 100);
      const h = resolveExpr(node.h, vars, 100);
      const t = resolveExpr(node.thickness, vars, 4);
      const cr = resolveExpr(node.cornerRadius, vars, 0);
      if (w <= 0 || h <= 0 || t <= 0) return null;

      const shape = roundedRectShape(w, h, cr);
      const holes = node.holes?.length ? placeHoles(node.holes, w, h, vars) : [];
      for (const hole of holes) {
        const path = new THREE.Path();
        if (hole.r !== undefined) {
          path.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
        } else if (hole.w !== undefined && hole.h !== undefined) {
          const hw = hole.w / 2;
          const hh = hole.h / 2;
          path.moveTo(hole.x - hw, hole.y - hh);
          path.lineTo(hole.x - hw, hole.y + hh);
          path.lineTo(hole.x + hw, hole.y + hh);
          path.lineTo(hole.x + hw, hole.y - hh);
          path.closePath();
        }
        shape.holes.push(path);
        holeArea += hole.area;
      }
      holeCount = holes.length;

      // Bevel reliably misbehaves around hole walls, so it's only used on
      // solid plates where it reads as a softened edge.
      const bevel = holes.length === 0 && t > 1.5;
      geometry = new THREE.ExtrudeGeometry(shape, {
        depth: t,
        bevelEnabled: bevel,
        bevelThickness: bevel ? Math.min(0.6, t * 0.15) : 0,
        bevelSize: bevel ? Math.min(0.6, t * 0.15) : 0,
        bevelSegments: 2,
        curveSegments: 12,
      });
      geometry.translate(0, 0, -t / 2);

      const cornerLoss = (4 - Math.PI) * Math.min(cr, w / 2, h / 2) ** 2;
      faceArea = Math.max(0, w * h - cornerLoss);
      volumeMm3 = Math.max(0, faceArea - holeArea) * t;
      break;
    }

    case "cylinder": {
      const rb = resolveExpr(node.radius, vars, 25);
      const rt = resolveExpr(node.radiusTop ?? node.radius, vars, rb);
      const hh = resolveExpr(node.height, vars, 50);
      if (rb < 0 || rt < 0 || hh <= 0 || (rb === 0 && rt === 0)) return null;
      geometry = new THREE.CylinderGeometry(rt, rb, hh, 48);
      volumeMm3 = (Math.PI / 3) * hh * (rb * rb + rb * rt + rt * rt);
      break;
    }

    case "sphere": {
      const r = resolveExpr(node.radius, vars, 25);
      if (r <= 0) return null;
      geometry = new THREE.SphereGeometry(r, 32, 24);
      volumeMm3 = (4 / 3) * Math.PI * r ** 3;
      break;
    }

    case "lathe": {
      const pts = (node.profile ?? [])
        .map(([r, y]) => new THREE.Vector2(Math.max(0, resolveExpr(r, vars)), resolveExpr(y, vars)))
        .filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y));
      if (pts.length < 2) return null;
      geometry = new THREE.LatheGeometry(pts, 48);
      for (let i = 0; i < pts.length - 1; i++) {
        const r1 = pts[i].x;
        const r2 = pts[i + 1].x;
        const dy = Math.abs(pts[i + 1].y - pts[i].y);
        volumeMm3 += (Math.PI / 3) * dy * (r1 * r1 + r1 * r2 + r2 * r2);
      }
      break;
    }

    case "extrude": {
      const pts = (node.profile ?? []).map(
        ([x, y]) => [resolveExpr(x, vars), resolveExpr(y, vars)] as [number, number]
      );
      if (pts.length < 3) return null;
      const depth = resolveExpr(node.depth, vars, 10);
      if (depth <= 0) return null;
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 12,
      });
      geometry.translate(0, 0, -depth / 2);
      volumeMm3 = shoelaceArea(pts) * depth;
      break;
    }

    default:
      return null;
  }

  const def = material(node.materialId);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    roughness: def.roughness,
    metalness: def.metalness,
    side: node.inside ? THREE.BackSide : THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = node.label || node.id;

  // An enclosure you stand inside is a room, not a part — counting its shell
  // as solid material would put tonnes on the mass readout.
  if (node.inside) volumeMm3 = 0;

  return { mesh, volumeMm3, holeArea, faceArea, holeCount };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function buildScene(
  spec: SceneSpec,
  values: Record<string, number>,
  stateBlend: number
): { group: THREE.Group; stats: GeometryStats } {
  const group = new THREE.Group();
  const perNode: GeometryStats["perNode"] = [];
  let volumeMm3 = 0;
  let massKg = 0;
  let holeArea = 0;
  let faceArea = 0;
  let holeCount = 0;

  const stateA = spec.states[0]?.id;
  const stateB = spec.states[1]?.id;

  for (const node of spec.nodes) {
    const built = buildNode(node, values);
    if (!built) continue;

    const basePos = resolveVec(node.position, values);
    const baseRot = resolveVec(node.rotation, values);

    const posA = resolveVec(
      (stateA && node.stateTransforms?.[stateA]?.position) || node.position,
      values
    );
    const rotA = resolveVec(
      (stateA && node.stateTransforms?.[stateA]?.rotation) || node.rotation,
      values
    );
    const posB = stateB && node.stateTransforms?.[stateB]?.position
      ? resolveVec(node.stateTransforms[stateB].position, values)
      : posA;
    const rotB = stateB && node.stateTransforms?.[stateB]?.rotation
      ? resolveVec(node.stateTransforms[stateB].rotation, values)
      : rotA;

    const hasStates = Boolean(stateA && node.stateTransforms);
    const pos = hasStates
      ? ([0, 1, 2].map((i) => lerp(posA[i], posB[i], stateBlend)) as [number, number, number])
      : basePos;
    const rot = hasStates
      ? ([0, 1, 2].map((i) => lerp(rotA[i], rotB[i], stateBlend)) as [number, number, number])
      : baseRot;

    built.mesh.position.set(pos[0], pos[1], pos[2]);
    built.mesh.rotation.set(
      THREE.MathUtils.degToRad(rot[0]),
      THREE.MathUtils.degToRad(rot[1]),
      THREE.MathUtils.degToRad(rot[2])
    );
    group.add(built.mesh);

    const def = material(node.materialId);
    const nodeMass = (built.volumeMm3 / 1e9) * def.density;
    volumeMm3 += built.volumeMm3;
    massKg += nodeMass;
    holeArea += built.holeArea;
    faceArea += built.faceArea;
    holeCount += built.holeCount;
    perNode.push({
      id: node.id,
      label: node.label || node.id,
      volumeMm3: built.volumeMm3,
      massKg: nodeMass,
    });
  }

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  if (!box.isEmpty()) box.getSize(size);

  return {
    group,
    stats: {
      volumeMm3,
      massKg,
      bbox: { w: size.x, h: size.y, d: size.z },
      partCount: perNode.length,
      openAreaRatio: holeCount > 0 && faceArea > 0 ? holeArea / faceArea : null,
      holeCount,
      perNode,
    },
  };
}
