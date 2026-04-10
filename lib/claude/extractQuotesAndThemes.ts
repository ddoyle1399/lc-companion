import { getClient } from "./client";

export type ExtractionResult =
  | { ok: true; quotes: string[]; themes: string[] }
  | { ok: false; error: string };

const EXTRACTION_SYSTEM_PROMPT = `You are an extraction assistant. You will be given a set of Leaving Certificate English study notes. Your job is to extract two things:

1. QUOTES: verbatim quoted text from the source poem or text that appears in the notes. A quote is any text inside quotation marks, or any indented block that is clearly a passage from the source. Do NOT include the student analysis or the teacher commentary. Only the actual primary source text. Return each quote as a single string exactly as it appears in the notes (preserve line breaks as \\n within the string). Do not add or remove words. If a quote appears multiple times in the notes, include it once.

2. THEMES: short theme labels the notes discuss. These usually appear as subheadings in a "Key Themes" or "Themes" section of the notes, or as the topic of a paragraph. Return each theme as a short string (3 to 8 words). Examples: "Spiritual Renewal Through Deprivation", "The Sacred in the Ordinary", "Loss and Recovery of Childhood Wonder".

Return your response as a single JSON object with exactly two keys: "quotes" (array of strings) and "themes" (array of strings). No preamble, no explanation, no markdown fences. Just the JSON object. Start your response with { and end with }.

Rules:
- Do not invent quotes that are not in the notes.
- Do not invent themes that are not discussed in the notes.
- If the notes contain no verbatim quotes (for example, a composition or comprehension note), return an empty quotes array.
- If the notes contain no clear themes, return an empty themes array.
- UK English in theme labels where applicable.`;

function isValidShape(value: unknown): value is { quotes: string[]; themes: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.quotes) &&
    obj.quotes.every((q) => typeof q === "string") &&
    Array.isArray(obj.themes) &&
    obj.themes.every((t) => typeof t === "string")
  );
}

export async function extractQuotesAndThemes(bodyText: string): Promise<ExtractionResult> {
  const client = getClient();

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("extraction timeout")), 30_000)
    );

    const callPromise = client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<notes>\n${bodyText}\n</notes>`,
        },
      ],
    });

    const response = await Promise.race([callPromise, timeoutPromise]);

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );

    if (!textBlock) {
      return { ok: false, error: "no text block in extraction response" };
    }

    const raw = textBlock.text.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[extractQuotesAndThemes] JSON parse failed. Raw response:", raw);
      return { ok: false, error: "invalid extraction response" };
    }

    if (!isValidShape(parsed)) {
      console.error("[extractQuotesAndThemes] Shape validation failed. Parsed:", parsed);
      return { ok: false, error: "invalid extraction response" };
    }

    return { ok: true, quotes: parsed.quotes, themes: parsed.themes };
  } catch (err) {
    const message = err instanceof Error ? err.message : "extraction failed";
    return { ok: false, error: message };
  }
}
