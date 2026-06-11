/**
 * Read an equipment's overall dimensions out of its spec-sheet PDF using
 * Google Gemini (vision). Used by the local backfill script
 * (scripts/extract-dimensions.mts); returns null when unconfigured.
 *
 * Thinking is disabled (thinkingBudget: 0) — this is a quick extraction and
 * the 2.5+ models otherwise burn the output budget on reasoning and truncate.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const PROMPT =
  "You are reading an equipment spec sheet PDF. Find the product's overall physical " +
  "dimensions (width, depth/length, height). Reply with ONLY the dimensions on one line, " +
  'formatted like 48"W x 30"D x 36"H (use the units shown in the sheet). ' +
  "If the sheet shows no overall dimensions, reply with exactly NONE.";

export function geminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Returns a dimension string, or null if Gemini found none / is not configured. */
export async function geminiDimensionFromPdf(bytes: Uint8Array): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const b64 = Buffer.from(bytes).toString("base64");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "application/pdf", data: b64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) return null;
  const first = text.split("\n")[0].trim();
  if (!first || /^none\b/i.test(first)) return null;
  return first.slice(0, 80);
}
