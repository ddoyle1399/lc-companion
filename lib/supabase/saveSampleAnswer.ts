import { getServerSupabase } from "./server";
import type { QuoteValidationResult } from "@/lib/sampleAnswer/quoteValidator";

export type SaveSampleAnswerInput = {
  outlineId: string;
  questionId: string;
  noteId: string;
  tier: "H1" | "H4";
  questionType: "poetry";
  markCap: number;
  markingMode: "discrete";
  pclmTarget: { P: number; C: number; L: number; M: number };
  answerText: string;
  wordCount: number;
  quotesUsed: string[];
  validatorResult: QuoteValidationResult;
  model: string;
};

export type SaveSampleAnswerResult =
  | { ok: true; sampleAnswerId: string }
  | { ok: false; error: string };

export async function saveSampleAnswer(
  input: SaveSampleAnswerInput,
): Promise<SaveSampleAnswerResult> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("sample_answers")
      .insert({
        outline_id: input.outlineId,
        question_id: input.questionId,
        note_id: input.noteId,
        grade_tier: input.tier,
        question_type: input.questionType,
        mark_cap: input.markCap,
        marking_mode: input.markingMode,
        pclm_target: input.pclmTarget,
        answer_text: input.answerText,
        word_count: input.wordCount,
        quotes_used: input.quotesUsed,
        validator_result: input.validatorResult,
        generation_model: input.model,
        approved: false,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, sampleAnswerId: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
