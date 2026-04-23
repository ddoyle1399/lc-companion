import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const poetKey = request.nextUrl.searchParams.get("poetKey");
  if (!poetKey) {
    return NextResponse.json({ error: "missing_poetKey" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Get question IDs that have a seeded PCLM row
  const { data: pclmRows, error: pclmErr } = await supabase
    .from("past_question_pclm")
    .select("question_id");

  if (pclmErr) {
    return NextResponse.json({ error: pclmErr.message }, { status: 500 });
  }

  const seededIds = (pclmRows ?? []).map((r) => r.question_id as string);
  if (seededIds.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  const { data, error } = await supabase
    .from("past_questions")
    .select("id, exam_year, question_text")
    .eq("subject_key", poetKey)
    .eq("section", "poetry_prescribed")
    .in("id", seededIds)
    .order("exam_year", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}
