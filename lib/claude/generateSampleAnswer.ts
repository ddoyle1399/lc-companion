import { getClient } from "./client";
import {
  buildSampleAnswerSystemPrompt,
  buildSampleAnswerUserMessage,
  type SampleAnswerPromptInput,
} from "./sampleAnswerPrompt";

const H1_MODEL = "claude-sonnet-4-6";
const H4_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4_000;
const TIMEOUT_MS = 90_000;

export type SampleAnswerResult =
  | { ok: true; answer_text: string; model: string; word_count: number }
  | { ok: false; error: string };

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms),
  );
}

export async function generateSampleAnswer(
  input: SampleAnswerPromptInput,
): Promise<SampleAnswerResult> {
  const model = input.tier === "H1" ? H1_MODEL : H4_MODEL;
  const system = buildSampleAnswerSystemPrompt(input.tier);
  const userMessage = buildSampleAnswerUserMessage(input);

  try {
    const response = await Promise.race([
      getClient().messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
      rejectAfter(TIMEOUT_MS),
    ]);

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "no_text_block" };
    }

    const answer = textBlock.text.trim();
    if (answer.length < 400) {
      return { ok: false, error: "answer_too_short" };
    }

    const word_count = answer.split(/\s+/).filter(Boolean).length;
    return { ok: true, answer_text: answer, model, word_count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
