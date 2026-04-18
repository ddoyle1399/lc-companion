import { getServerSupabase } from "./server";
import type { OutlineBodyMove } from "@/lib/claude/generateOutline";

export type OutlineWithContext = {
  id: string;
  note_id: string;
  question_id: string;
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
  note: { subject_key: string; sub_key: string | null; quotes: unknown };
  question: {
    question_text: string;
    exam_year: number | null;
    subject_key: string;
  };
};

export async function findOutlineById(
  outlineId: string,
): Promise<OutlineWithContext | null> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("question_outlines")
      .select(
        `id, note_id, question_id, thesis_line, body_moves, closing_move, examiner_note,
         notes ( subject_key, sub_key, quotes ),
         past_questions ( question_text, exam_year, subject_key )`,
      )
      .eq("id", outlineId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id as string,
      note_id: data.note_id as string,
      question_id: data.question_id as string,
      thesis_line: data.thesis_line as string,
      body_moves: data.body_moves as OutlineBodyMove[],
      closing_move: data.closing_move as string,
      examiner_note: data.examiner_note as string | null,
      note: data.notes as unknown as OutlineWithContext["note"],
      question: data.past_questions as unknown as OutlineWithContext["question"],
    };
  } catch {
    return null;
  }
}
