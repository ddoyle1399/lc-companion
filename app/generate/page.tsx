import { getServerSupabase } from "@/lib/supabase/server";
import Nav from "@/components/nav";
import GenerateForm from "./GenerateForm";

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

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy">Generate Sample Answer</h1>
          <p className="text-sm text-gray-500 mt-1">
            HL Poetry only. Select a poet, past question, and grade tier, then generate.
          </p>
        </div>
        <GenerateForm poets={poets} />
      </main>
    </div>
  );
}
