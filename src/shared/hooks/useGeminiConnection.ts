import { useCallback, useEffect, useState } from "react";
import type { ConnectionState } from "../connection";
import { checkConnection } from "../gemini";
import { getApiKey } from "../storage";

// Shared across every prototype: checks the saved API key on mount, and
// exposes `refresh` to re-check after the Agent dialog saves/clears a key.
export function useGeminiConnection() {
  const [connection, setConnection] = useState<ConnectionState>({
    state: "no-key",
  });

  const refresh = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setConnection({ state: "no-key" });
      return;
    }
    setConnection({ state: "checking" });
    try {
      await checkConnection(apiKey);
      setConnection({ state: "connected" });
    } catch (err) {
      setConnection({
        state: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { connection, refresh };
}
