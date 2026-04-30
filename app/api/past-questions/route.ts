import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/past-questions?poet=W.B.%20Yeats[&level=higher|ordinary]
 *
 * Returns the past_questions rows whose subject_key matches the requested poet,
 * ordered by exam_year descending. Used by the poetry generator's
 * "Exam-Ready Model Answer" flow to populate a dropdown of past questions for
 * the selected poet.
 *
 * Response shape:
 *   { questions: Array<{ id, year, question_text, level }> }
 */
export async function GET(request: NextRequest) {
  const poet = request.nextUrl.searchParams.get("poet");
  const levelParam = request.nextUrl.searchParams.get("level");

  if (!poet) {
    return NextResponse.json(
      { error: "poet query parameter is required" },
      { status: 400 }
    );
  }

  const level: "higher" | "ordinary" | null =
    levelParam === "higher" || levelParam === "ordinary" ? levelParam : null;

  try {
    const supabase = getServerSupabase();
    let query = supabase
      .from("past_questions")
      .select("id, exam_year, level, question_text, section, paper")
      .eq("subject_key", poet)
      .order("exam_year", { ascending: false });

    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[past-questions] query failed", error);
      return NextResponse.json(
        { error: error.message, questions: [] },
        { status: 500 }
      );
    }

    type Row = {
      id: string;
      exam_year: number | null;
      level: "higher" | "ordinary";
      question_text: string;
    };

    const questions = ((data as Row[]) ?? []).map((r) => ({
      id: r.id,
      year: r.exam_year,
      question_text: r.question_text,
      level: r.level,
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[past-questions] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error", questions: [] },
      { status: 500 }
    );
  }
}
