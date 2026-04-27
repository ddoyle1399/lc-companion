import { getClient } from "./client";
import {
  buildSystemPrompt,
  buildUserMessage,
  type TextNotePromptInput,
  type Depth,
} from "./textNotePrompts";

const MODEL_PER_DEPTH: Record<Depth, string> = {
  quick: "claude-haiku-4-5-20251001",
  standard: "claude-sonnet-4-6",
  deep: "claude-sonnet-4-6",
};

const MAX_TOKENS_PER_DEPTH: Record<Depth, number> = {
  quick: 2_500,
  standard: 5_000,
  deep: 7_500,
};

const TIMEOUT_MS = 180_000;

export type TextNoteResult =
  | { ok: true; body_markdown: string; word_count: number; model: string }
  | { ok: false; error: string };

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms),
  );
}

export async function generateTextNote(
  input: TextNotePromptInput,
): Promise<TextNoteResult> {
  const model = MODEL_PER_DEPTH[input.depth];
  const max_tokens = MAX_TOKENS_PER_DEPTH[input.depth];
  const system = buildSystemPrompt(input.level);
  const userMessage = buildUserMessage(input);

  try {
    const response = await Promise.race([
      getClient().messages.create({
        model,
        max_tokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
      rejectAfter(TIMEOUT_MS),
    ]);

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "no_text_block" };
    }

    const body = textBlock.text.trim();
    if (body.length < 200) {
      return { ok: false, error: "note_too_short" };
    }

    const word_count = body.split(/\s+/).filter(Boolean).length;
    return { ok: true, body_markdown: body, word_count, model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
