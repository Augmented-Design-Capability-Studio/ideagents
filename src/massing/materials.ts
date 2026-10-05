export interface MaterialDef {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  // kg/m³ — drives mass, which drives most of the engineering implications.
  density: number;
  costPerKg: number;
  processes: string[];
  note: string;
}

// A curated library rather than letting the model invent finishes: this is
// what makes CMF choices carry engineering consequences (mass, cost, process)
// instead of being only a colour in a render.
export const MATERIALS: MaterialDef[] = [
  {
    id: "abs",
    name: "ABS (matte)",
    color: "#e8e4de",
    roughness: 0.62,
    metalness: 0,
    density: 1050,
    costPerKg: 2.5,
    processes: ["injection moulding", "3D printing"],
    note: "Default interior plastic. Cheap, easy to mould, poor UV stability.",
  },
  {
    id: "pp",
    name: "Polypropylene",
    color: "#f1efe8",
    roughness: 0.7,
    metalness: 0,
    density: 905,
    costPerKg: 1.6,
    processes: ["injection moulding"],
    note: "Lightest common plastic; living hinges; hard to paint or bond.",
  },
  {
    id: "pc",
    name: "Polycarbonate (gloss)",
    color: "#dfe3e6",
    roughness: 0.22,
    metalness: 0,
    density: 1200,
    costPerKg: 4.0,
    processes: ["injection moulding"],
    note: "Tough and optically clear-capable; scratches easily without hardcoat.",
  },
  {
    id: "nylon-gf",
    name: "Glass-filled nylon",
    color: "#2f3133",
    roughness: 0.75,
    metalness: 0,
    density: 1350,
    costPerKg: 6.0,
    processes: ["injection moulding"],
    note: "Structural plastic for load paths; abrasive on tooling.",
  },
  {
    id: "tpe",
    name: "TPE soft-touch",
    color: "#3a3d40",
    roughness: 0.9,
    metalness: 0,
    density: 1100,
    costPerKg: 7.0,
    processes: ["overmoulding"],
    note: "Grip surfaces. Needs a second shot, so adds tooling cost.",
  },
  {
    id: "alu",
    name: "Aluminium 6061",
    color: "#b8bcc0",
    roughness: 0.38,
    metalness: 1,
    density: 2700,
    costPerKg: 5.0,
    processes: ["machining", "extrusion", "die casting"],
    note: "Stiff and light for metal; anodises well.",
  },
  {
    id: "alu-brushed",
    name: "Brushed aluminium",
    color: "#c4c8cc",
    roughness: 0.28,
    metalness: 1,
    density: 2700,
    costPerKg: 7.0,
    processes: ["machining", "secondary finishing"],
    note: "Premium CMF cue. The brushing is a secondary operation — adds cost and lead time.",
  },
  {
    id: "steel",
    name: "Stainless 304",
    color: "#9fa4a8",
    roughness: 0.34,
    metalness: 1,
    density: 7900,
    costPerKg: 5.0,
    processes: ["stamping", "machining"],
    note: "Heavy. Use only where wear or hygiene demands it.",
  },
  {
    id: "glass",
    name: "Tempered glass",
    color: "#cdd8dc",
    roughness: 0.08,
    metalness: 0,
    density: 2500,
    costPerKg: 8.0,
    processes: ["forming", "tempering"],
    note: "Heavy and brittle; cannot be machined after tempering.",
  },
  {
    id: "walnut",
    name: "Walnut veneer",
    color: "#6b4a32",
    roughness: 0.55,
    metalness: 0,
    density: 650,
    costPerKg: 12.0,
    processes: ["veneering"],
    note: "Warm CMF cue; grain direction and moisture movement constrain geometry.",
  },
  {
    id: "wool",
    name: "Wool textile",
    color: "#8c8577",
    roughness: 0.95,
    metalness: 0,
    density: 350,
    costPerKg: 45.0,
    processes: ["cut and sew", "lamination"],
    note: "High perceived quality; abrasion and cleanability are the usual failures.",
  },
  {
    id: "pet-felt",
    name: "Recycled PET felt",
    color: "#6f7a7d",
    roughness: 0.98,
    metalness: 0,
    density: 300,
    costPerKg: 9.0,
    processes: ["compression moulding", "die cutting"],
    note: "Acoustic absorber with a recycled-content story; limited formability.",
  },
  {
    id: "foam",
    name: "PU foam",
    color: "#d9d2c5",
    roughness: 1,
    metalness: 0,
    density: 60,
    costPerKg: 6.0,
    processes: ["foaming"],
    note: "Comfort layer. Compression set over time is the long-term risk.",
  },
];

export function material(id: string): MaterialDef {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}
