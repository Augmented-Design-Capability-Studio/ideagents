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
];
