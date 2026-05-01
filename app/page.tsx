import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard.
 *
 * Six-tile grid. Each tile is one function with one primary number.
 * Coverage table moved to /coverage. Recent activity moved to /library.
 * The dashboard is an entry point, not a data view. If the operator wants
 * detail, they click in.
 */

interface Counts {
  poetryRows: number;
  poetryVerified: number;
  textNotes: number;
  comparativeProfiles: number;
  lastActivityIso: string | null;
}

async function loadCounts(): Promise<Counts> {
  const supabase = getServerSupabase();
  const [poetryAll, poetryVerified, textNotesTotal, latestText, latestPoem] =
    await Promise.all([
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("content_type", "poem_notes"),
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("content_type", "poem_notes")
        .eq("status", "verified"),
      supabase.from("text_notes").select("id", { count: "exact", head: true }),
      supabase
        .from("text_notes")
        .select("generated_at")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notes")
        .select("generated_at")
        .eq("content_type", "poem_notes")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const candidates = [
    (latestText.data as { generated_at?: string } | null)?.generated_at ?? null,
    (latestPoem.data as { generated_at?: string } | null)?.generated_at ?? null,
  ].filter((s): s is string => !!s);
  candidates.sort((a, b) => (a < b ? 1 : -1));

  return {
    poetryRows: poetryAll.count ?? 0,
    poetryVerified: poetryVerified.count ?? 0,
    textNotes: textNotesTotal.count ?? 0,
    comparativeProfiles: 7, // file-based, see data/profiles/comparative/2026
    lastActivityIso: candidates[0] ?? null,
  };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - t) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const counts = await loadCounts();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Header — minimal. Title + last activity timestamp. */}
        <header className="mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold text-navy tracking-tight">
            LC Companion
          </h1>
          <p className="text-sm text-gray-500 mt-3">
            Last generation {relativeTime(counts.lastActivityIso)}
          </p>
        </header>

        {/* Primary tiles: 3 across on desktop. The three things created daily. */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <Tile
            href="/poetry"
            title="Poetry"
            subtitle="Notes for prescribed poems"
            metric={`${counts.poetryRows}`}
            metricLabel={`${counts.poetryVerified} verified`}
          />
          <Tile
            href="/single-text"
            title="Single Text"
            subtitle="Notes for novels, plays, Shakespeare"
            metric={`${counts.textNotes}`}
            metricLabel="notes generated"
          />
          <Tile
            href="/comparative"
            title="Comparative"
            subtitle="Cross-text essays and mode notes"
            metric={`${counts.comparativeProfiles}`}
            metricLabel="text profiles"
          />
        </section>

        {/* Secondary tiles: same shape, lighter accent. Admin functions. */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          <Tile
            href="/generate"
            title="Sample Answer"
            subtitle="H1, H2, H3 graded model answers"
            tone="subtle"
          />
          <Tile
            href="/coverage"
            title="Coverage"
            subtitle="Catalogue gaps by poet and text"
            tone="subtle"
          />
          <Tile
            href="/single-text/library"
            title="Library"
            subtitle="Browse and edit generated notes"
            tone="subtle"
          />
        </section>

        {/* Tools: a single quiet row of plain links, no chrome. */}
        <section className="border-t border-gray-200 pt-8">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
            More
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <li>
              <Link href="/worksheet" className="text-navy hover:text-teal transition-colors">
                Worksheet
              </Link>
            </li>
            <li>
              <Link href="/slides" className="text-navy hover:text-teal transition-colors">
                Slides
              </Link>
            </li>
            <li>
              <Link href="/video" className="text-navy hover:text-teal transition-colors">
                Video
              </Link>
            </li>
            <li>
              <Link href="/unseen-poetry" className="text-navy hover:text-teal transition-colors">
                Unseen poetry
              </Link>
            </li>
            <li>
              <Link href="/comprehension" className="text-navy hover:text-teal transition-colors">
                Comprehension
              </Link>
            </li>
            <li>
              <Link href="/composition" className="text-navy hover:text-teal transition-colors">
                Composition
              </Link>
            </li>
            <li>
              <Link href="/poem-texts" className="text-navy hover:text-teal transition-colors">
                Poem texts
              </Link>
            </li>
            <li>
              <Link href="/generate/history" className="text-gray-500 hover:text-teal transition-colors">
                History
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

/**
 * Tile.
 *
 * Two tones:
 *   - default (primary actions): white card, larger, primary metric on the
 *     bottom-right, hover lifts the border to teal.
 *   - subtle (admin/secondary): same dimensions, no metric, slightly muted.
 *
 * No icons. No coloured tags. The label IS the icon.
 */
function Tile({
  href,
  title,
  subtitle,
  metric,
  metricLabel,
  tone = "default",
}: {
  href: string;
  title: string;
  subtitle: string;
  metric?: string;
  metricLabel?: string;
  tone?: "default" | "subtle";
}) {
  const base =
    "group block bg-white border rounded-xl p-7 sm:p-8 transition-all hover:border-teal hover:shadow-[0_2px_12px_rgba(27,42,74,0.05)]";
  const border = tone === "subtle" ? "border-gray-100" : "border-gray-200";
  return (
    <Link href={href} className={`${base} ${border} min-h-[160px] flex flex-col`}>
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-navy group-hover:text-teal transition-colors tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
      {metric !== undefined && (
        <div className="mt-6 flex items-baseline gap-2 tabular-nums">
          <span className="text-2xl font-semibold text-navy">{metric}</span>
          {metricLabel && (
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              {metricLabel}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
