/**
 * Extracts a verified quote bank from a poem's source text.
 *
 * Called automatically by POST /api/poems whenever a new poem text is uploaded,
 * and by /api/poems/backfill for retrofit. Output shape matches the existing
 * `notes.quotes` and `notes.metadata` jsonb shapes used by Heaney/Yeats/Bishop/Smith.
 */

import { getClient } from "@/lib/claude/client";

export interface PoemQuote {
  text: string;
  tags: string[];
  line_start: number;
  line_end: number;
  stanza_index: number;
}

export interface PoemBankMetadata {
  structure_confidence: "verified" | "unverified";
  selection_years: string[];
  stanza_breaks: number[];
  stanza_count: number;
  form_note: string;
}

export interface ExtractedBank {
  quotes: PoemQuote[];
  metadata: PoemBankMetadata;
}

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4_000;
const TIMEOUT_MS = 180_000;

const SYSTEM_PROMPT = `You extract verbatim quote banks from prescribed Leaving Certificate poems.

Given the full text of one poem, return a JSON object with:
- quotes: 10 to 14 verbatim quote objects, each {text, tags, line_start, line_end, stanza_index}
- metadata: {structure_confidence, selection_years, stanza_breaks, stanza_count, form_note}

ABSOLUTE RULES:

1. text MUST be VERBATIM from the source. Copy exactly. Preserve punctuation, capitalisation, and apostrophe style. Quotes spanning two source lines join with a literal newline (\\n) inside the JSON string. Never modernise or "fix" the text.

2. line_start and line_end are 1-indexed line numbers within the poem itself (not the file).

3. stanza_index is the 1-indexed stanza containing line_start.

4. stanza_breaks is the array of line numbers where each stanza STARTS.

5. tags: 2-4 short snake_case tags chosen from this controlled vocabulary, plus poem-specific tags as needed:
opening, closing, climax, imagery, tone, voice, narrator, memory, childhood, mortality, nature, religion, family, motherhood, observation, transformation, loss, art, craft, animal, light, dark, color, sound, silence, water, sea, journey, identity, gender, social_class, kindness, ritual, time, joy, grief, science, cosmos, history, witness, faith, doubt, longing, displacement, home

6. Pick canonical, exam-worthy quotes. The opening line, the closing line, and 8-12 internal anchor lines that a Leaving Cert student could quote in an essay.

7. metadata.structure_confidence is "verified" if you are confident about the stanza structure from the source, otherwise "unverified".

8. metadata.selection_years: pass through whatever is provided in the user message. Default ["2026"] if not specified.

9. form_note: one short sentence describing the form (e.g. "Single sonnet in iambic pentameter", "Five free-verse stanzas", "Sestina with rotating end-words").

Output ONLY the JSON object. No prose, no markdown fences, no commentary. The response must parse with JSON.parse on the first try.`;

function buildUserMessage(
  poet: string,
  poem: string,
  text: string,
  selectionYears: string[],
): string {
  return `POET: ${poet}
POEM: ${poem}
SELECTION_YEARS: ${JSON.stringify(selectionYears)}

POEM TEXT (verbatim source, line-by-line):
${text}

Return the JSON object now.`;
}

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("extract_bank_timeout")), ms),
  );
}

function tryParseJson(s: string): ExtractedBank | null {
  // Strip a markdown fence if Claude wraps the JSON despite instructions.
  const stripped = s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as ExtractedBank;
  } catch {
    return null;
  }
}

function validateBank(bank: ExtractedBank): string | null {
  if (!bank || typeof bank !== "object") return "not_an_object";
  if (!Array.isArray(bank.quotes)) return "quotes_not_array";
  if (bank.quotes.length < 5) return "too_few_quotes";
  if (bank.quotes.length > 20) return "too_many_quotes";
  for (const q of bank.quotes) {
    if (typeof q.text !== "string" || q.text.length < 5) return "bad_quote_text";
    if (!Array.isArray(q.tags) || q.tags.length === 0) return "bad_quote_tags";
    if (typeof q.line_start !== "number" || typeof q.line_end !== "number")
      return "bad_quote_lines";
    if (typeof q.stanza_index !== "number") return "bad_quote_stanza";
  }
  if (!bank.metadata || typeof bank.metadata !== "object")
    return "missing_metadata";
  if (!Array.isArray(bank.metadata.stanza_breaks)) return "bad_stanza_breaks";
  if (typeof bank.metadata.stanza_count !== "number") return "bad_stanza_count";
  return null;
}

export async function extractBank(
  poet: string,
  poem: string,
  text: string,
  selectionYears: string[] = ["2026"],
): Promise<ExtractedBank> {
  if (!text || text.trim().length < 50) {
    throw new Error("source_text_too_short");
  }

  const userMessage = buildUserMessage(poet, poem, text, selectionYears);

  const response = await Promise.race([
    getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
    rejectAfter(TIMEOUT_MS),
  ]);

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("no_text_block_in_response");
  }

  const parsed = tryParseJson(block.text);
  if (!parsed) {
    throw new Error("could_not_parse_json");
  }

  const validationError = validateBank(parsed);
  if (validationError) {
    throw new Error(`bank_validation_failed:${validationError}`);
  }

  // Force selection_years to caller-provided value (don't trust Claude to pass through).
  parsed.metadata.selection_years = selectionYears;

  return parsed;
}
