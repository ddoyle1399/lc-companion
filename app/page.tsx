import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard. Customer-facing SaaS quality.
 *
 * Reference bar: Linear, Resend, Vercel, Cal.com. Light neutral background,
 * white cards with proper rounded corners, generous whitespace, restrained
 * accent. KPI strip at the top, two action sections below, a quiet tools
 * row at the bottom.
 */

interface Counts {
  poetryRows: number;
  poetryVerified: number;
  textNotes: number;
  textTexts: number; // distinct text_keys touched
  comparativeProfiles: number;
  lastActivityIso: string | null;
}

async function loadCounts(): Promise<Counts> {
  const supabase = getServerSupabase();
  const [
    poetryAll,
    poetryVerified,
    textNotesTotal,
    textKeys,
    latestText,
    latestPoem,
  ] = await Promise.all([
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
    supabase.from("text_notes").select("text_key"),
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

  const distinctTexts = new Set(
    ((textKeys.data ?? []) as Array<{ text_key: string }>).map((r) => r.text_key),
  ).size;

  const candidates = [
    (latestText.data as { generated_at?: string } | null)?.generated_at ?? null,
    (latestPoem.data as { generated_at?: string } | null)?.generated_at ?? null,
  ].filter((s): s is string => !!s);
  candidates.sort((a, b) => (a < b ? 1 : -1));

  return {
    poetryRows: poetryAll.count ?? 0,
    poetryVerified: poetryVerified.count ?? 0,
    textNotes: textNotesTotal.count ?? 0,
    textTexts: distinctTexts,
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
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const counts = await loadCounts();
  const last = relativeTime(counts.lastActivityIso);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10 sm:py-12">

        {/* Header */}
        <header className="flex items-end justify-between flex-wrap gap-4 mb-10 pb-8 border-b border-gray-200">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Generate, review and manage Leaving Certificate English content.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-xs font-medium text-gray-700 tabular-nums">
              Last activity {last}
            </span>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <Stat
            label="Poetry notes"
            value={counts.poetryRows}
            sub={`${counts.poetryVerified} verified`}
          />
          <Stat
            label="Single text notes"
            value={counts.textNotes}
            sub={`across ${counts.textTexts} text${counts.textTexts === 1 ? "" : "s"}`}
          />
          <Stat
            label="Comparative profiles"
            value={counts.comparativeProfiles}
            sub="2026 cycle"
          />
        </div>

        {/* Generate */}
        <section className="mb-10">
          <SectionHeading>Generate</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              href="/poetry"
              title="Poetry"
              description="Notes for prescribed poems"
            />
            <ActionCard
              href="/single-text"
              title="Single Text"
              description="Notes for novels, plays, Shakespeare"
            />
            <ActionCard
              href="/comparative"
              title="Comparative"
              description="Cross-text essays and mode notes"
            />
          </div>
        </section>

        {/* Manage */}
        <section className="mb-10">
          <SectionHeading>Manage</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              href="/generate"
              title="Sample answer"
              description="H1, H2, H3 graded model answers"
              tone="muted"
            />
            <ActionCard
              href="/coverage"
              title="Coverage"
              description="Catalogue gaps by poet and text"
              tone="muted"
            />
            <ActionCard
              href="/single-text/library"
              title="Library"
              description="Browse and edit generated notes"
              tone="muted"
            />
          </div>
        </section>

        {/* Tools */}
        <section>
          <SectionHeading>Tools</SectionHeading>
          <div className="bg-white border border-gray-200 rounded-xl p-2">
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <ToolLink href="/worksheet">Worksheet</ToolLink>
              <ToolLink href="/slides">Slides</ToolLink>
              <ToolLink href="/video">Video</ToolLink>
              <ToolLink href="/unseen-poetry">Unseen poetry</ToolLink>
              <ToolLink href="/comprehension">Comprehension</ToolLink>
              <ToolLink href="/composition">Composition</ToolLink>
              <ToolLink href="/poem-texts">Poem texts</ToolLink>
              <ToolLink href="/generate/history">Generation history</ToolLink>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-900 mb-4">
      {children}
    </h2>
  );
}

/**
 * KPI card. Big tabular number, small label, sub-text.
 * White card on gray-50 page, rounded-xl, fine border, very subtle shadow.
 */
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-3xl font-semibold text-gray-900 tabular-nums mt-2 leading-none">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-500 mt-2 tabular-nums">{sub}</p>
      )}
    </div>
  );
}

/**
 * ActionCard. Primary clickable tile.
 *
 * Default tone: navy-friendly heading, hover border lifts to teal with a
 * subtle teal-tinted shadow and an arrow that nudges right.
 * Muted tone: lighter type weight, otherwise identical interaction.
 */
function ActionCard({
  href,
  title,
  description,
  tone = "default",
}: {
  href: string;
  title: string;
  description: string;
  tone?: "default" | "muted";
}) {
  const titleClass =
    tone === "muted"
      ? "text-base font-semibold text-gray-800"
      : "text-base font-semibold text-gray-900";
  return (
    <Link
      href={href}
      className="group block bg-white border border-gray-200 rounded-xl p-6 transition-all hover:border-teal hover:shadow-[0_4px_20px_-4px_rgba(42,157,143,0.12)] hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`${titleClass} tracking-tight`}>{title}</h3>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
        <span
          aria-hidden
          className="text-gray-300 group-hover:text-teal group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function ToolLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
