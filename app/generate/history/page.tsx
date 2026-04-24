import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";

interface HistoryRow {
  id: string;
  generated_at: string;
  grade_tier: string;
  word_count: number;
  approved: boolean;
  question_id: string;
  question_text: string | null;
  subject_key: string | null;
}

async function getSampleAnswers(): Promise<HistoryRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sample_answers")
    .select(`
      id,
      generated_at,
      grade_tier,
      word_count,
      approved,
      question_id,
      past_questions (
        question_text,
        subject_key
      )
    `)
    .order("generated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const pq = Array.isArray(row.past_questions)
      ? row.past_questions[0]
      : row.past_questions;
    return {
      id: row.id as string,
      generated_at: row.generated_at as string,
      grade_tier: row.grade_tier as string,
      word_count: row.word_count as number,
      approved: row.approved as boolean,
      question_id: row.question_id as string,
      question_text: (pq as { question_text?: string } | null)?.question_text ?? null,
      subject_key: (pq as { subject_key?: string } | null)?.subject_key ?? null,
    };
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

export default async function HistoryPage() {
  const rows = await getSampleAnswers();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-navy">Past Generations</h1>
            <p className="text-sm text-gray-500 mt-1">All saved sample answers, newest first.</p>
          </div>
          <Link
            href="/generate"
            className="text-sm text-teal-700 hover:underline"
          >
            ← New generation
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-4">No sample answers generated yet.</p>
            <Link
              href="/generate"
              className="inline-block px-4 py-2 bg-navy text-white text-sm rounded hover:bg-navy/90"
            >
              Generate your first answer
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/generate/history/${row.id}`}
                className="flex items-start justify-between px-4 py-4 hover:bg-gray-50 transition-colors block"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="text-xs text-gray-400 mb-1">
                    {formatDate(row.generated_at)} · {row.subject_key ?? "Unknown poet"} · {row.word_count} w
                  </div>
                  <p className="text-sm text-gray-800 truncate">
                    {row.question_text ? truncate(row.question_text, 80) : "No question text"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono font-semibold text-navy">{row.grade_tier}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      row.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {row.approved ? "Approved" : "Pending"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
