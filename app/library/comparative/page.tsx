import Nav from "@/components/nav";
import Link from "next/link";
import LibraryTabs from "@/components/library/LibraryTabs";
import NoteRow, { type NoteRowData } from "@/components/library/NoteRow";
import { getLibraryCounts } from "@/lib/library/getCounts";
import { getServerSupabase } from "@/lib/supabase/server";

async function getComparativeRows(): Promise<NoteRowData[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("notes")
    .select("id, generated_at, subject_key, title, status, body_text")
    .eq("content_type", "comparative")
    .order("generated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    generated_at: r.generated_at,
    subject_key: r.subject_key ?? null,
    title: r.title ?? null,
    status: r.status ?? null,
    body_chars: typeof r.body_text === "string" ? r.body_text.length : 0,
    href: `/library/comparative/${r.id}`,
  }));
}

export default async function ComparativeLibraryPage() {
  const [rows, counts] = await Promise.all([getComparativeRows(), getLibraryCounts()]);
  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-navy mb-6">Library</h1>
        <LibraryTabs counts={counts} />
        {rows.length === 0 ? (
          <EmptyState message="No comparative notes generated yet." cta={{ href: "/comparative", label: "Generate comparative" }} />
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {rows.map((r) => (
              <NoteRow key={r.id} row={r} />
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
