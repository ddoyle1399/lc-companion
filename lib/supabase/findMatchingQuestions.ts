import { getServerSupabase } from "./server";

export type MatchingQuestion = {
  id: string;
  exam_year: number | null;
  paper: number | null;
  level: "higher" | "ordinary";
  section: string | null;
  question_text: string;
  subject_key: string;
};

export async function findMatchingQuestions(params: {
  subjectKey: string;
  level: "higher" | "ordinary";
}): Promise<MatchingQuestion[]> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("past_questions")
      .select("id, exam_year, paper, level, section, question_text, subject_key")
      .eq("subject_key", params.subjectKey)
      .eq("level", params.level)
      .order("exam_year", { ascending: false });

    if (error) return [];
    return (data as MatchingQuestion[]) ?? [];
  } catch {
    return [];
  }
}
