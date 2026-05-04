import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";
import CopyDeleteBar from "./CopyDeleteBar";

interface TextNoteDetailProps {
  id: string;
}

export default async function TextNoteDetail({ id }: TextNoteDetailProps) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("text_notes")
    .select("id, display_subject, note_type, word_count, generation_model, generated_at, body_markdown")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/library/single-text" className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block">
          ← Back to single text
        </Link>
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <h1 className="text-xl font-semibold text-navy leading-tight mb-4">
            {data.display_subject ?? "Untitled"}
          </h1>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm text-slate-600">
            {data.note_type && (
              <>
                <dt className="text-slate-400">Type</dt>
                <dd className="col-span-1">{data.note_type}</dd>
              </>
            )}
            {data.word_count != null && (
              <>
                <dt className="text-slate-400">Words</dt>
                <dd className="col-span-1">{data.word_count}</dd>
              </>
            )}
            {data.generation_model && (
              <>
                <dt className="text-slate-400">Model</dt>
                <dd className="col-span-1 text-xs">{data.generation_model}</dd>
              </>
            )}
            <dt className="text-slate-400">Generated</dt>
            <dd className="col-span-1">
              {new Date(data.generated_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </dl>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
            {data.body_markdown}
          </pre>
        </div>
        <CopyDeleteBar
          bodyText={data.body_markdown}
          bodyHtml={null}
          deleteHref={`/api/text-notes/${id}`}
          backHref="/library/single-text"
        />
      </main>
    </div>
  );
}
