import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard. Just clickable tiles. No tables, no lists, no progress bars.
 *
 * Each tile is a single clear function with a single clear destination.
 * The 'Last generation' tile deep-links straight to the most recent note
 * in the library so the operator can resume work in one click.
 */

interface LastGen {
  href: string;
  title: string;
  subtitle: string;
  whenIso: string;
}

async function loadLastGen(): Promise<LastGen | null> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("text_notes")
    .select("id, text_key, display_subject, note_type, generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    id: string;
    text_key: string;
    display_subject: string;
    note_type: string;
    generated_at: string;
  };
  const niceType = r.note_type
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return {
    href: `/single-text/library/${r.id}`,
    title: r.display_subject,
    subtitle: `${r.text_key} · ${niceType}`,
    whenIso: r.generated_at,
  };
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - t) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const lastGen = await loadLastGen();

  return (
    <main className="px-8 lg:px-12 py-10 lg:py-12 max-w-[1400px]">

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
          Hello, Diarmuid
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick something to work on.
        </p>
      </header>

      {/* Resume row: 1 wide tile linking to the last generation */}
      {lastGen && (
        <div className="mb-10">
          <Link
            href={lastGen.href}
            className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-teal hover:shadow-[0_4px_20px_-4px_rgba(42,157,143,0.12)] transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  Last generation · {relativeTime(lastGen.whenIso)}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 mt-1 truncate">
                  {lastGen.title}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {lastGen.subtitle}
                </p>
              </div>
              <Arrow />
            </div>
          </Link>
        </div>
      )}

      {/* Create */}
      <SectionLabel>Create</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <Tile href="/poetry" title="Poetry note" subtitle="Notes for prescribed poems" />
        <Tile href="/single-text" title="Single text note" subtitle="Notes for novels, plays, Shakespeare" />
        <Tile href="/comparative" title="Comparative note" subtitle="Cross-text essays and mode notes" />
      </div>

      {/* Manage */}
      <SectionLabel>Manage</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <Tile href="/single-text/library" title="Library" subtitle="Browse and edit generated notes" />
        <Tile href="/coverage" title="Coverage" subtitle="Catalogue gaps by poet and text" />
        <Tile href="/generate" title="Sample answer" subtitle="H1, H2, H3 graded model answers" />
      </div>

      {/* Production */}
      <SectionLabel>Production</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile href="/worksheet" title="Worksheet" subtitle="Class activities and exercises" />
        <Tile href="/slides" title="Slides" subtitle="PowerPoint decks for class" />
        <Tile href="/video" title="Video" subtitle="Narrated analysis from a poetry note" />
        <Tile href="/comprehension" title="Comprehension" subtitle="Paper 1 strategy" />
        <Tile href="/composition" title="Composition" subtitle="Paper 1 essay guides" />
        <Tile href="/unseen-poetry" title="Unseen poetry" subtitle="Skills guides for unseen analysis" />
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-3">
      {children}
    </h2>
  );
}

function Tile({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-teal hover:shadow-[0_4px_20px_-4px_rgba(42,157,143,0.12)] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <Arrow />
      </div>
    </Link>
  );
}

function Arrow() {
  return (
    <span
      aria-hidden
      className="text-gray-300 group-hover:text-teal group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </span>
  );
}
