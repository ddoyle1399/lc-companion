import { getClient } from "./client";
import { buildOutlineSystemPrompt } from "./prompts";
import { buildOutlineUserMessage } from "./outlinePrompt";

const OUTLINE_MODEL = "claude-haiku-4-5-20251001";
const OUTLINE_MAX_TOKENS = 1200;
const OUTLINE_TIMEOUT_MS = 30_000;

export type OutlineBodyMove = {
  move: string;
  quote: string;
  gloss: string;
};

export type OutlineSuccess = {
  ok: true;
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
  model: string;
};

export type OutlineFailure = {
  ok: false;
  error: string;
};

export type OutlineResult = OutlineSuccess | OutlineFailure;

export type OutlineInput = {
  questionId: string;
  questionText: string;
  questionYear: number | null;
  questionPaper: number | null;
  questionLevel: "higher" | "ordinary";
  questionSection: string | null;
  poet: string;
  poem: string | null;
  noteBody: string;
  noteQuotes: string[];
  noteThemes: string[];
};

function isBodyMove(value: unknown): value is OutlineBodyMove {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.move === "string" &&
    typeof obj.quote === "string" &&
    typeof obj.gloss === "string"
  );
}

function isValidShape(value: unknown): value is {
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
} {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.thesis_line !== "string") return false;
  if (typeof obj.closing_move !== "string") return false;
  if (obj.examiner_note !== null && typeof obj.examiner_note !== "string") return false;
  if (!Array.isArray(obj.body_moves)) return false;
  if (obj.body_moves.length !== 3) return false;
  if (!obj.body_moves.every(isBodyMove)) return false;

  return true;
}

/**
 * Normalises a quote for substring comparison. Lowercases, strips surrounding
 * straight or curly quotes, removes most punctuation, collapses whitespace.
 * Used by the quote-source guard so that minor formatting differences between
 * the note quote bank and the model's rendering do not cause false rejections.
 */
function normaliseQuote(s: string): string {
  return s
    .toLowerCase()
    .replace(/^["'‘’“”]+|["'‘’“”]+$/g, "")
    .replace(/[.,;:!?()[\]{}—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Quote-source guard. Every non-empty `body_moves[].quote` must appear as a
 * substring (in either direction) of at least one entry in `noteQuotes` after
 * normalisation. Empty strings are tolerated because they signal the model
 * honestly declining to quote when no source is available. This guard exists
 * because `isValidShape` only validates JSON structure; without it, the model
 * can ship hallucinated quotes or placeholder strings such as "No quote
 * available from provided list" past the shape check (verified 4 May 2026 via
 * scripts/phase3-guard-test.ts).
 */
function validateQuoteSources(
  bodyMoves: OutlineBodyMove[],
  noteQuotes: string[],
): { ok: true } | { ok: false; reason: string } {
  const normalisedSources = noteQuotes
    .map(normaliseQuote)
    .filter((s) => s.length > 0);

  for (let i = 0; i < bodyMoves.length; i++) {
    const raw = bodyMoves[i].quote;
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    const normalised = normaliseQuote(trimmed);
    if (normalised.length === 0) continue;

    const matched = normalisedSources.some(
      (src) => src.includes(normalised) || normalised.includes(src),
    );

    if (!matched) {
      return {
        ok: false,
        reason: `body_moves[${i}].quote not present in noteQuotes: "${trimmed.slice(
          0,
          80,
        )}"`,
      };
    }
  }
  return { ok: true };
}

export async function generateOutline(input: OutlineInput): Promise<OutlineResult> {
  const client = getClient();

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("outline generation timeout")), OUTLINE_TIMEOUT_MS)
    );

    const callPromise = client.messages.create({
      model: OUTLINE_MODEL,
      max_tokens: OUTLINE_MAX_TOKENS,
      system: buildOutlineSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildOutlineUserMessage(input),
        },
      ],
    });

    const response = await Promise.race([callPromise, timeoutPromise]);

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );

    if (!textBlock) {
      return { ok: false, error: "no text block in outline response" };
    }

    const raw = textBlock.text.trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[generateOutline] JSON parse failed. Raw:", raw.slice(0, 200));
      return { ok: false, error: "outline response was not valid JSON" };
    }

    if (!isValidShape(parsed)) {
      console.error("[generateOutline] Shape validation failed. Parsed:", JSON.stringify(parsed).slice(0, 300));
      return { ok: false, error: "outline response had wrong shape" };
    }

    const quoteCheck = validateQuoteSources(parsed.body_moves, input.noteQuotes);
    if (!quoteCheck.ok) {
      console.error("[generateOutline] Quote-source validation failed:", quoteCheck.reason);
      return { ok: false, error: `quote validation failed: ${quoteCheck.reason}` };
    }

    return {
      ok: true,
      thesis_line: parsed.thesis_line,
      body_moves: parsed.body_moves,
      closing_move: parsed.closing_move,
      // Normalise "null" string to JSON null in case model ignores the literal null instruction.
      examiner_note: parsed.examiner_note === "null" ? null : parsed.examiner_note,
      model: OUTLINE_MODEL,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "outline generation failed";
    console.error("[generateOutline] error:", message);
    return { ok: false, error: message };
  }
}
