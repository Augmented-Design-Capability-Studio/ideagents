import { TEMPERATURE } from "./config";
import { getModel } from "./storage";

// Cheap connectivity/key check: lists models without generating anything.
export async function checkConnection(apiKey: string): Promise<void> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    { headers: { "x-goog-api-key": apiKey } }
  );
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(message);
  }
}

// One stateless call to the Gemini API. Each agent turn is a fresh call whose
// context (seed + transcript) is assembled into the user message by the caller.
export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userText: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature: TEMPERATURE },
    }),
  });

  if (!res.ok) {
    let message = `Gemini API error (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message += `: ${body.error.message}`;
    } catch {
      // non-JSON error body; keep the generic message
    }
    if (res.status === 429) {
      message += " — you likely hit a rate limit. Wait a minute and try again.";
    }
    throw new Error(message);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text.trim();
}
