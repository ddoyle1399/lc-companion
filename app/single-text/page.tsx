import { getServerSupabase } from "@/lib/supabase/server";
import Nav from "@/components/nav";
import SingleTextNotesForm from "./SingleTextNotesForm";

export type Asset = {
  asset_type: string;
  subject_key: string;
  display_name: string;
  sort_order: number;
};

export type AssetsByText = Record<string, Asset[]>;

async function loadAssets(): Promise<AssetsByText> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("single_text_assets")
    .select("text_key, asset_type, subject_key, display_name, sort_order")
    .order("sort_order");
  if (!data) return {};
  const byText: AssetsByText = {};
  for (const row of data) {
    const key = row.text_key as string;
    if (!byText[key]) byText[key] = [];
    byText[key].push({
      asset_type: row.asset_type as string,
      subject_key: row.subject_key as string,
      display_name: row.display_name as string,
      sort_order: row.sort_order as number,
    });
  }
  return byText;
}

async function loadVerifiedTexts(): Promise<string[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("notes")
    .select("subject_key")
    .eq("content_type", "single_text_notes")
    .eq("status", "verified");
  if (!data) return [];
  return Array.from(new Set(data.map((r) => r.subject_key as string))).sort();
}

export default async function SingleTextPage() {
  const [assetsByText, verifiedTexts] = await Promise.all([
    loadAssets(),
    loadVerifiedTexts(),
  ]);

  // Only surface texts that have BOTH a verified quote bank AND a catalogue.
  const availableTexts = verifiedTexts.filter((t) => assetsByText[t]);

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-navy">Single Text Notes</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate study notes for any aspect of a prescribed single text.
            </p>
          </div>
          <a
            href="/single-text/library"
            className="text-sm text-teal-700 hover:underline whitespace-nowrap mt-1"
          >
            View notes library →
          </a>
        </div>
        <SingleTextNotesForm
          availableTexts={availableTexts}
          assetsByText={assetsByText}
        />
      </main>
    </div>
  );
}
