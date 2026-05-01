import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard. Six-tile grid, SaaS-clean.
 *
 * Visual direction: Stripe / Resend / Linear. Pure white, fine borders,
 * generous whitespace, hover via shadow not colour. The cream/navy/teal
 * brand is kept but the background loses the cream tint here so the
 * dashboard reads as a polished tool rather than a poster.
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
    comparativeProfiles: 7,
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
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-14 sm:py-20">

        {/* Header */}
        <header className="mb-14 sm:mb-16">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal" aria-hidden />
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 font-medium">
              Last generation {relativeTime(counts.lastActivityIso)}
            </p>
          </div>
          <h1 className="text-[2.75rem] sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.05]">
            LC Companion
          </h1>
          <p className="text-base text-gray-500 mt-3 max-w-xl">
            Generate, review, and manage Leaving Certificate English content.
          </p>
        </header>

        {/* Primary tiles */}
        <SectionLabel>Generate</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden mb-10 ring-1 ring-gray-100">
          <PrimaryTile
            href="/poetry"
            title="Poetry"
            subtitle="Notes for prescribed poems"
            metric={counts.poetryRows}
            metricLabel={`${counts.poetryVerified} verified`}
          />
          <PrimaryTile
            href="/single-text"
            title="Single Text"
            subtitle="Notes for novels, plays, Shakespeare"
            metric={counts.textNotes}
            metricLabel="notes generated"
          />
          <PrimaryTile
            href="/comparative"
            title="Comparative"
            subtitle="Cross-text essays and mode notes"
            metric={counts.comparativeProfiles}
            metricLabel="text profiles"
          />
        </div>

        {/* Admin tiles */}
        <SectionLabel>Manage</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden mb-14 ring-1 ring-gray-100">
          <AdminTile
            href="/generate"
            title="Sample answer"
            subtitle="H1, H2, H3 graded model answers"
          />
          <AdminTile
            href="/coverage"
            title="Coverage"
            subtitle="Catalogue gaps by poet and text"
          />
          <AdminTile
            href="/single-text/library"
            title="Library"
            subtitle="Browse and edit generated notes"
          />
        </div>

        {/* Tools — tertiary, plain link list */}
        <section>
          <SectionLabel>More</SectionLabel>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3 text-sm">
            <ToolLink href="/worksheet">Worksheet</ToolLink>
            <ToolLink href="/slides">Slides</ToolLink>
            <ToolLink href="/video">Video</ToolLink>
            <ToolLink href="/unseen-poetry">Unseen poetry</ToolLink>
            <ToolLink href="/comprehension">Comprehension</ToolLink>
            <ToolLink href="/composition">Composition</ToolLink>
            <ToolLink href="/poem-texts">Poem texts</ToolLink>
            <ToolLink href="/generate/history" muted>Generation history</ToolLink>
          </ul>
        </section>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.14em] text-gray-500 font-medium mb-3">
      {children}
    </p>
  );
}

/**
 * PrimaryTile.
 *
 * White card, subtle hover. Layout: title at top, metric large at bottom.
 * No icons. The metric IS the visual focal point.
 *
 * The grid uses gap-px on a gray-100 background so adjacent tiles share a
 * 1px hairline divider — Stripe-style, no double borders, no boxy frames.
 */
function PrimaryTile({
  href,
  title,
  subtitle,
  metric,
  metricLabel,
}: {
  href: string;
  title: string;
  subtitle: string;
  metric: number;
  metricLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white p-7 sm:p-8 flex flex-col min-h-[180px] transition-colors hover:bg-gray-50"
    >
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
      <div className="mt-8 flex items-baseline gap-2 tabular-nums">
        <span className="text-[2rem] font-semibold text-gray-900 leading-none tracking-tight">
          {metric}
        </span>
        <span className="text-xs text-gray-400">{metricLabel}</span>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal opacity-0 group-hover:opacity-100 transition-opacity">
        Open
        <span aria-hidden>&rarr;</span>
      </span>
    </Link>
  );
}

/**
 * AdminTile. Compact version of PrimaryTile, no metric, lighter weight.
 */
function AdminTile({
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
      className="group bg-white p-7 sm:p-8 flex flex-col min-h-[120px] transition-colors hover:bg-gray-50"
    >
      <h2 className="text-base font-semibold text-gray-900 tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{subtitle}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal opacity-0 group-hover:opacity-100 transition-opacity">
        Open
        <span aria-hidden>&rarr;</span>
      </span>
    </Link>
  );
}

function ToolLink({
  href,
  children,
  muted = false,
}: {
  href: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  const colour = muted
    ? "text-gray-400 hover:text-gray-700"
    : "text-gray-700 hover:text-gray-900";
  return (
    <li>
      <Link
        href={href}
        className={`${colour} transition-colors inline-flex items-center gap-1 group`}
      >
        <span>{children}</span>
        <span
          aria-hidden
          className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          &rarr;
        </span>
      </Link>
    </li>
  );
}
