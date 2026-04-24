import { notFound } from "next/navigation";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";
import type { SampleAnswerFull } from "@/lib/export/sampleAnswer";
import AnswerDetailClient from "./AnswerDetailClient";

async function fetchAnswer(id: string): Promise<SampleAnswerFull | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sample_answers")
    .select(`
      id,
      answer_text,
      word_count,
      grade_tier,
      pclm_target,
      selected_poems,
      generation_model,
      generated_at,
      approved,
      reviewer_notes,
      question_id,
      past_questions (
        question_text,
        exam_year,
        subject_key
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const pq = Array.isArray(data.past_questions)
    ? data.past_questions[0]
    : data.past_questions;

  return {
    id: data.id as string,
    answer_text: data.answer_text as string,
    word_count: data.word_count as number,
    grade_tier: data.grade_tier as string,
    pclm_target: data.pclm_target as { P: number; C: number; L: number; M: number } | null,
    selected_poems: data.selected_poems as string[] | null,
    generation_model: data.generation_model as string | null,
    generated_at: data.generated_at as string,
    approved: data.approved as boolean,
    reviewer_notes: data.reviewer_notes as string | null,
    question: {
      question_text: (pq as { question_text?: string } | null)?.question_text ?? "",
      exam_year: (pq as { exam_year?: number } | null)?.exam_year ?? null,
      subject_key: (pq as { subject_key?: string } | null)?.subject_key ?? "",
    },
  };
}

export default async function AnswerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const answer = await fetchAnswer(id);

  if (!answer) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnswerDetailClient answer={answer} />
      </main>
    </div>
  );
}
