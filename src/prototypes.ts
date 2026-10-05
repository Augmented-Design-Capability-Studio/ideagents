export interface PrototypeInfo {
  id: string;
  title: string;
  description: string;
  path: string;
}

export const PROTOTYPES: PrototypeInfo[] = [
  {
    id: "prototype1",
    title: "Prototype 1: Multi-Agent Ideation",
    description:
      "Explore how different multi-agent discussion mechanisms shape ideation outcomes. Enter a seed idea, then run consensus, amplification, constructive disagreement, or independent exploration side by side and compare results.",
    path: "/prototype1/",
  },
  {
    id: "prototype2",
    title: "Prototype 2: Trade-off Explorer",
    description:
      "Compare 3-8 concept alternatives against a design brief: LLM-estimated engineering axes, designer-added qualitative axes, hard qualitative boundaries, and a 2D trade-off plot.",
    path: "/prototype2/",
  },
  {
    id: "prototype3",
    title: "Prototype 3: Intent-to-Requirement Translation",
    description:
      "Translate qualitative goals into editable chains of goal -> mechanism -> measurable requirement, then into structured, assumption-explicit micro-simulation specs.",
    path: "/prototype3/",
  },
  {
    id: "prototype4",
    title: "Prototype 4: What Engineers Will Ask You",
    description:
      "Rehearse an engineering review: proposed review lenses, sourced and confidence-rated likely questions per lens, designer triage and draft responses, and an exportable prepared brief.",
    path: "/prototype4/",
  },
  {
    id: "prototype5",
    title: "Prototype 5: Radical Tool",
    description:
      "Push a concept toward more radical territory: the AI only challenges your assumptions (never proposes solutions), shows prior art to fight fixation, and tracks each revision's distance from where you started.",
    path: "/prototype5/",
  },
  {
    id: "prototype6",
    title: "Prototype 6: Massing Model & Implications",
    description:
      "Turn a concept or sketch into a crude parametric 3D massing model with editable dimensions, CMF choices that carry mass and cost, engineering implications measured off the geometry, and an AI render of the same view.",
    path: "/prototype6/",
  },
  {
    id: "prototype7",
    title: "Prototype 7: Configuration Comparison",
    description:
      "The massing model as a comparison tool: one concept becomes several contrasting configurations side by side in a horizontally scrolling strip, each independently adjustable, with linked cameras and a table comparing them on the same engineering metrics.",
    path: "/prototype7/",
  },
];
