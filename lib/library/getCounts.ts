import { getServerSupabase } from "@/lib/supabase/server";

export async function getLibraryCounts() {
  const supabase = getServerSupabase();
  const [
    { count: poetry },
    { count: singleText },
    { count: comparative },
    { count: sampleAnswers },
  ] = await Promise.all([
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poetry"),
    supabase.from("text_notes").select("id", { count: "exact", head: true }),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "comparative"),
    supabase.from("sample_answers").select("id", { count: "exact", head: true }),
  ]);
  return {
    poetry: poetry ?? 0,
    singleText: singleText ?? 0,
    comparative: comparative ?? 0,
    sampleAnswers: sampleAnswers ?? 0,
  };
}
