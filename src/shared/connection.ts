export type ConnectionState =
  | { state: "no-key" }
  | { state: "checking" }
  | { state: "connected" }
  | { state: "error"; message: string };
