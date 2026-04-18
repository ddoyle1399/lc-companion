import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const noteId = request.nextUrl.searchParams.get("noteId");
  if (!noteId) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("question_outlines")
    .select(
      `
      id,
      thesis_line,
      body_moves,
      closing_move,
      examiner_note,
      approved,
      generation_model,
      past_questions (
        question_text,
        exam_year,
        level,
        section
      )
    `
    )
    .eq("note_id", noteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type PqRow = { exam_year: number | null };
  const getYear = (pq: unknown): number => {
    const row = Array.isArray(pq) ? (pq[0] as PqRow) : (pq as PqRow | null);
    return row?.exam_year ?? 0;
  };
  const sorted = (data ?? []).sort(
    (a, b) => getYear(b.past_questions) - getYear(a.past_questions)
  );

  return NextResponse.json(sorted);
}
