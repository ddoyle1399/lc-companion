import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";

// LC English Paper 1 sits on the first Wednesday in June. The
// 2026 cycle date is locked at 3 June 2026 in the project's CLAUDE.md.
// Update this when each year's date is confirmed.
const LC_PAPER_1_DATE = new Date("2026-06-03T09:30:00+01:00");

function daysUntilLC(): number {
  const now = new Date();
  const ms = LC_PAPER_1_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

interface NoteCount {
  verified: number;
  draft: number;
}

interface RecentNote {
  href: string;
  label: string;
  subtitle: string;
  when: string;
}

async function loadDashboard(): Promise<{
  poetry: NoteCount;
  singleText: number;
  comparativeProfiles: number;
  recent: RecentNote[];
}> {
  const supabase = getServerSupabase();

  const [poetryAll, poetryVerified, textNotesRecent, textNotesTotal] =
    await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes"),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes").eq("status", "verified"),
      supabase
        .from("text_notes")
        .select("id, text_key, note_type, display_subject, generated_at")
        .order("generated_at", { ascending: false })
        .limit(5),
      supabase.from("text_notes").select("id", { count: "exact", head: true }),
    ]);

  const poetryTotal = poetryAll.count ?? 0;
  const poetryVerifiedCount = poetryVerified.count ?? 0;
  const recent: RecentNote[] = (textNotesRecent.data ?? []).map((row) => {
    const r = row as {
      id: string;
      text_key: string;
      note_type: string;
      display_subject: string;
      generated_at: string;
    };
    const niceType = r.note_type
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    return {
      href: `/single-text/library/${r.id}`,
      label: `${r.display_subject}`,
      subtitle: `${r.text_key}, ${niceType}`,
      when: r.generated_at,
    };
  });

  return {
    poetry: { verified: poetryVerifiedCount, draft: Math.max(0, poetryTotal - poetryVerifiedCount) },
    singleText: textNotesTotal.count ?? 0,
    // Comparative profiles live as files on disk, not in Supabase. Hardcoded count
    // matches the data/profiles/comparative/2026 directory listing as of the last
    // shipped commit. Bump this when new profiles are added.
    comparativeProfiles: 7,
    recent,
  };
}

function relativeTime(iso: string): string {
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
  const { poetry, singleText, comparativeProfiles, recent } = await loadDashboard();
  const days = daysUntilLC();

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header: dashboard title + countdown. The countdown is the one piece
            of ambient context that actually affects priorities every day. */}
        <header className="flex items-baseline justify-between mb-8 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-semibold text-navy tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Leaving Certificate English content tooling.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-navy tabular-nums leading-none">{days}</p>
            <p className="text-xs uppercase tracking-wider text-gray-400 mt-1">
              days to Paper 1
            </p>
          </div>
        </header>

        {/* Primary trio: the three actions you actually run. Larger tiles, no
            descriptions, library counts in their place to give a feel for the
            substrate as you walk in. */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <Link
            href="/poetry"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-teal hover:shadow-sm transition-all group flex flex-col"
          >
            <h2 className="text-lg font-semibold text-navy group-hover:text-teal transition-colors">
              Poetry
            </h2>
            <p className="text-sm text-gray-500 mt-1">Notes for prescribed poems</p>
            <div className="mt-auto pt-4 text-xs text-gray-400 tabular-nums">
              <span className="font-medium text-gray-600">{poetry.verified}</span> verified
              {poetry.draft > 0 && (
                <>
                  {" "}
                  &middot; <span className="font-medium text-gray-600">{poetry.draft}</span> draft
                </>
              )}
            </div>
          </Link>

          <Link
            href="/single-text"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-teal hover:shadow-sm transition-all group flex flex-col"
          >
            <h2 className="text-lg font-semibold text-navy group-hover:text-teal transition-colors">
              Single Text
            </h2>
            <p className="text-sm text-gray-500 mt-1">Notes for novels, plays, Shakespeare</p>
            <div className="mt-auto pt-4 text-xs text-gray-400 tabular-nums">
              <span className="font-medium text-gray-600">{singleText}</span> notes generated
            </div>
          </Link>

          <Link
            href="/comparative"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-teal hover:shadow-sm transition-all group flex flex-col"
          >
            <h2 className="text-lg font-semibold text-navy group-hover:text-teal transition-colors">
              Comparative
            </h2>
            <p className="text-sm text-gray-500 mt-1">Cross-text essays and mode notes</p>
            <div className="mt-auto pt-4 text-xs text-gray-400 tabular-nums">
              <span className="font-medium text-gray-600">{comparativeProfiles}</span> text profiles
            </div>
          </Link>
        </section>

        {/* Recent activity: what you generated last, with one-click resume. The
            fastest path back into work-in-progress. Hidden when empty so the
            page doesn't carry a placeholder. */}
        {recent.length > 0 && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy uppercase tracking-wider">
                Recent
              </h2>
              <Link
                href="/single-text/library"
                className="text-xs text-teal hover:underline"
              >
                View library
              </Link>
            </div>
            <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {recent.map((note) => (
                <li key={note.href}>
                  <Link
                    href={note.href}
                    className="flex items-baseline justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy truncate">
                        {note.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {note.subtitle}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap ml-4">
                      {relativeTime(note.when)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Secondary tools: a single dense row, no descriptions. These get
            occasional use, not daily. Plain link list, no tile chrome. */}
        <section>
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-3">
            More tools
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/generate" className="text-navy hover:text-teal transition-colors">
                Sample answer
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
              <Link href="/generate/history" className="text-gray-500 hover:text-teal transition-colors">
                Generation history
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
