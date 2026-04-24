import { getServerSupabase } from "@/lib/supabase/server";
import { getCircularYears } from "@/data/circulars";
import Nav from "@/components/nav";
import GenerateForm from "./GenerateForm";

function currentExamCycle(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  return month >= 8 ? year + 1 : year;
}

async function getVerifiedPoets(): Promise<string[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("notes")
    .select("subject_key")
    .eq("content_type", "poem_notes")
    .eq("status", "verified")
    .order("subject_key");

  if (!data) return [];
  const unique = Array.from(new Set(data.map((r) => r.subject_key as string)));
  return unique.sort();
}

export default async function GeneratePage() {
  const poets = await getVerifiedPoets();
  const availableYears = getCircularYears();
  const defaultYear = Math.min(
    currentExamCycle(),
    Math.max(...availableYears),
  );

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-navy">Generate Sample Answer</h1>
            <p className="text-sm text-gray-500 mt-1">
              HL Poetry only. Select a poet, past question, and grade tier, then generate.
            </p>
          </div>
          <a href="/generate/history" className="text-sm text-teal-700 hover:underline whitespace-nowrap mt-1">
            View past generations →
          </a>
        </div>
        <GenerateForm poets={poets} availableYears={availableYears} defaultYear={defaultYear} />
      </main>
    </div>
  );
}
