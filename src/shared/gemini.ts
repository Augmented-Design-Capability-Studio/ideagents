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

interface GeminiResponseData {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: unknown[] };
  }>;
}

// Shared low-level call: builds the request, does the fetch, and turns a
// non-2xx response into a helpful Error. Returns the raw parsed JSON body so
// each caller (plain text vs. grounded-with-sources) can pull out what it
// needs.
async function rawGenerateContent(
  apiKey: string,
  model: string,
  body: Record<string, unknown>
): Promise<GeminiResponseData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Gemini API error (HTTP ${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) message += `: ${errBody.error.message}`;
    } catch {
      // non-JSON error body; keep the generic message
    }
    if (res.status === 429) {
      message += " — you likely hit a rate limit. Wait a minute and try again.";
    }
    throw new Error(message);
  }

  return res.json();
}

function extractText(data: GeminiResponseData): string {
  const candidate = data.candidates?.[0];
  const text: string | undefined = candidate?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini returned an empty response.");
  return text.trim();
}

export interface GeminiCallOptions {
  // Each prototype picks its own: ~1.0 for open-ended ideation, lower
  // (~0.3-0.5) for structured/JSON output that needs to parse reliably.
  temperature?: number;
  // Ask the API for a JSON response (Gemini's structured-output mode).
  // Still returns a string here — pair with parseJSON() to decode it,
  // which also tolerates a model wrapping JSON in a ```json fence anyway.
  json?: boolean;
  // Optional image input (prototype 4's reference image), as inline base64.
  image?: { mimeType: string; base64Data: string };
}

// One stateless call to the Gemini API. Each call's context is assembled
// into the user message/parts by the caller.
export async function callGemini(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userText: string,
  options: GeminiCallOptions = {}
): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: userText }];
  if (options.image) {
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.base64Data,
      },
    });
  }

  const data = await rawGenerateContent(apiKey, model, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  });
  return extractText(data);
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GroundedResult {
  text: string;
  sources: GroundingSource[];
}

// Same idea as callGemini, but turns on Gemini's built-in Google Search
// grounding tool (prototype 4's "web search across standards/prior art").
// NOTE: this combination (search grounding + strict JSON mode) isn't
// something I could verify against a live API in this session — it's built
// from Gemini's documented tool-use shape, but if it turns out the two
// don't compose cleanly, the fix is to drop json-mode enforcement here (the
// prompt already asks for JSON) and lean on parseJSON()'s fence-stripping,
// which is what this does already.
export async function callGeminiGrounded(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userText: string,
  options: Omit<GeminiCallOptions, "json"> = {}
): Promise<GroundedResult> {
  const parts: Record<string, unknown>[] = [{ text: userText }];
  if (options.image) {
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.base64Data,
      },
    });
  }

  const data = await rawGenerateContent(apiKey, model, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
    },
  });

  const text = extractText(data);

  const chunks: unknown[] =
    data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: unknown; title?: unknown } })?.web;
    if (typeof web?.uri === "string" && !seen.has(web.uri)) {
      seen.add(web.uri);
      sources.push({
        uri: web.uri,
        title: typeof web.title === "string" && web.title ? web.title : web.uri,
      });
    }
  }

  return { text, sources };
}

export interface GeneratedImage {
  base64Data: string;
  mimeType: string;
}

async function errorMessage(res: Response, label: string): Promise<string> {
  let message = `${label} (HTTP ${res.status})`;
  try {
    const body = await res.json();
    if (body?.error?.message) message += `: ${body.error.message}`;
  } catch {
    // non-JSON error body; keep the generic message
  }
  if (res.status === 429) message += " — rate limited. Wait a minute and try again.";
  return message;
}

// The /v1beta/interactions surface shown in the current image-generation docs.
async function imageViaInteractions(
  apiKey: string,
  model: string,
  prompt: string,
  inputImage: { mimeType: string; base64Data: string } | undefined,
  aspectRatio: string
): Promise<GeneratedImage> {
  const input: Record<string, unknown>[] = [{ type: "text", text: prompt }];
  if (inputImage) {
    input.push({ type: "image", mime_type: inputImage.mimeType, data: inputImage.base64Data });
  }

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model,
      input,
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspectRatio },
    }),
  });

  if (!res.ok) throw new Error(await errorMessage(res, "interactions endpoint"));

  const data = await res.json();
  const image = data?.interaction?.output_image;
  if (typeof image?.data !== "string" || !image.data) {
    throw new Error("interactions endpoint returned no image.");
  }
  return {
    base64Data: image.data,
    mimeType: typeof image.mime_type === "string" ? image.mime_type : "image/jpeg",
  };
}

// The older generateContent surface, which needs responseModalities to include
// IMAGE and returns the picture as an inlineData part.
async function imageViaGenerateContent(
  apiKey: string,
  model: string,
  prompt: string,
  inputImage: { mimeType: string; base64Data: string } | undefined
): Promise<GeneratedImage> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (inputImage) {
    parts.push({
      inlineData: { mimeType: inputImage.mimeType, data: inputImage.base64Data },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!res.ok) throw new Error(await errorMessage(res, "generateContent endpoint"));

  const data = await res.json();
  const candidateParts: Array<{ inlineData?: { data?: unknown; mimeType?: unknown } }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of candidateParts) {
    const inline = part.inlineData;
    if (typeof inline?.data === "string" && inline.data) {
      return {
        base64Data: inline.data,
        mimeType: typeof inline.mimeType === "string" ? inline.mimeType : "image/png",
      };
    }
  }
  throw new Error("generateContent endpoint returned no image part.");
}

// Image generation (Nano Banana). Google documents two surfaces for this —
// /v1beta/interactions in the current image-generation docs, and the older
// generateContent + responseModalities form — and which one a given key and
// model can reach varies. Rather than guess, this tries the documented one
// first and falls back, reporting BOTH errors if neither works, so a failure
// says what actually went wrong instead of "couldn't render".
export async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  inputImage?: { mimeType: string; base64Data: string },
  aspectRatio = "4:3"
): Promise<GeneratedImage> {
  try {
    return await imageViaInteractions(apiKey, model, prompt, inputImage, aspectRatio);
  } catch (first) {
    try {
      return await imageViaGenerateContent(apiKey, model, prompt, inputImage);
    } catch (second) {
      const a = first instanceof Error ? first.message : String(first);
      const b = second instanceof Error ? second.message : String(second);
      throw new Error(
        `Image generation failed on both API surfaces.\n- ${a}\n- ${b}\n` +
          `Model tried: ${model}. If it's a 404 or "not found", pick a different image model.`
      );
    }
  }
}

// Defensive JSON decode for callGemini({ json: true }) / callGeminiGrounded
// responses: models occasionally wrap JSON in a ```json fence even in
// structured-output mode, so strip that before parsing, and surface a
// useful error (with a truncated raw response) rather than a bare
// "Unexpected token".
export function parseJSON<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Model did not return valid JSON (${reason}). Raw response:\n${text.slice(0, 500)}`
    );
  }
}
