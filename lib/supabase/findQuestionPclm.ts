import { getServerSupabase } from "./server";

export type QuestionPclm = {
  question_id: string;
  source_year: number;
  examiner_expectation: string;
  pclm_template: Record<string, string[]>;
  indicative_material: string[];
};

export async function findQuestionPclm(
  questionId: string,
): Promise<QuestionPclm | null> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("past_question_pclm")
      .select("*")
      .eq("question_id", questionId)
      .single();
    if (error || !data) return null;
    return data as QuestionPclm;
  } catch {
    return null;
  }
}
