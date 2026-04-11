import { getServerSupabase } from "./server";
import type { OutlineSuccess } from "../claude/generateOutline";

export type SaveOutlinesInput = {
  noteId: string;
  outlines: Array<{
    questionId: string;
    outline: OutlineSuccess;
  }>;
};

export type SaveOutlinesResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; inserted: number };

export async function saveOutlines(input: SaveOutlinesInput): Promise<SaveOutlinesResult> {
  if (input.outlines.length === 0) {
    return { ok: true, inserted: 0 };
  }

  try {
    const supabase = getServerSupabase();
    const rows = input.outlines.map(({ questionId, outline }) => ({
      note_id: input.noteId,
      question_id: questionId,
      thesis_line: outline.thesis_line,
      body_moves: outline.body_moves,
      closing_move: outline.closing_move,
      examiner_note: outline.examiner_note,
      generation_model: outline.model,
      approved: false,
    }));

    const { error, data } = await supabase
      .from("question_outlines")
      .insert(rows)
      .select("id");

    if (error) {
      return { ok: false, error: error.message, inserted: 0 };
    }
    return { ok: true, inserted: data?.length ?? 0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
      inserted: 0,
    };
  }
}
