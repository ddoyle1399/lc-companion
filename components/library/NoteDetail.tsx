import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";
import CopyDeleteBar from "./CopyDeleteBar";

interface NoteDetailProps {
  id: string;
  backHref: string;
  backLabel: string;
}

export default async function NoteDetail({ id, backHref, backLabel }: NoteDetailProps) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, subject_key, sub_key, status, generation_model, generated_at, exam_year, level, body_html, body_text")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block">
          ← {backLabel}
        </Link>
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-semibold text-navy leading-tight">{data.title ?? "Untitled"}</h1>
            <StatusPill status={data.status} />
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm text-slate-600">
            {data.subject_key && (
              <>
                <dt className="text-slate-400">Subject</dt>
                <dd className="col-span-1">{data.subject_key}</dd>
              </>
            )}
            {data.sub_key && (
              <>
                <dt className="text-slate-400">Poem/Text</dt>
                <dd className="col-span-1">{data.sub_key}</dd>
              </>
            )}
            {data.level && (
              <>
                <dt className="text-slate-400">Level</dt>
                <dd className="col-span-1 capitalize">{data.level}</dd>
              </>
            )}
            {data.exam_year && (
              <>
                <dt className="text-slate-400">Year</dt>
                <dd className="col-span-1">{data.exam_year}</dd>
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
        <div
          className="prose prose-slate max-w-none bg-white border border-slate-200 rounded-lg p-6"
          dangerouslySetInnerHTML={{ __html: data.body_html }}
        />
        <CopyDeleteBar
          bodyText={data.body_text}
          bodyHtml={data.body_html}
          deleteHref={`/api/notes/${id}`}
          backHref={backHref}
        />
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const label = status ?? "draft";
  const tone =
    label === "verified"
      ? "bg-green-100 text-green-700"
      : label === "draft"
      ? "bg-amber-100 text-amber-700"
      : label === "locked"
      ? "bg-slate-100 text-slate-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${tone}`}>
      {label}
    </span>
  );
}
