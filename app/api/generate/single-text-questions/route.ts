import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const textKey = request.nextUrl.searchParams.get("textKey");
  if (!textKey) {
    return NextResponse.json({ error: "missing_textKey" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Single-text questions don't require a PCLM seed to surface — marking
  // schemes for these can be added later. Return every seeded question for
  // this text, newest first.
  const { data, error } = await supabase
    .from("past_questions")
    .select("id, exam_year, question_text, question_number")
    .eq("subject_key", textKey)
    .eq("section", "single_text")
    .order("exam_year", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}
