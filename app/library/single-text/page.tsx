import Nav from "@/components/nav";
import Link from "next/link";
import LibraryTabs from "@/components/library/LibraryTabs";
import TextNoteRow, { type TextNoteRowData } from "@/components/library/TextNoteRow";
import { getLibraryCounts } from "@/lib/library/getCounts";
import { getServerSupabase } from "@/lib/supabase/server";

async function getSingleTextRows(): Promise<TextNoteRowData[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("text_notes")
    .select("id, generated_at, display_subject, note_type, word_count")
    .order("generated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    generated_at: r.generated_at,
    display_subject: r.display_subject ?? null,
    note_type: r.note_type ?? null,
    word_count: r.word_count ?? null,
    href: `/library/single-text/${r.id}`,
  }));
}

export default async function SingleTextLibraryPage() {
  const [rows, counts] = await Promise.all([getSingleTextRows(), getLibraryCounts()]);
  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-navy mb-6">Library</h1>
        <LibraryTabs counts={counts} />
        {rows.length === 0 ? (
          <EmptyState message="No single text notes generated yet." cta={{ href: "/single-text", label: "Generate text note" }} />
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {rows.map((r) => (
              <TextNoteRow key={r.id} row={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ message, cta }: { message: string; cta: { href: string; label: string } }) {
  return (
    <div className="text-center py-20 text-slate-500">
      <p className="mb-4">{message}</p>
      <Link
        href={cta.href}
        className="inline-block px-4 py-2 bg-navy text-white text-sm rounded hover:bg-navy/90"
      >
        {cta.label}
      </Link>
    </div>
  );
}
