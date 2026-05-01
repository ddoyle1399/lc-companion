import Link from "next/link";
import Nav from "@/components/nav";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPoetsHL, getPoemsForPoet, getSingleTexts } from "@/data/circulars";

const ACTIVE_YEAR = 2026;

interface RecentItem {
  href: string;
  title: string;
  subtitle: string;
  when: string;
  kind: "poetry" | "single-text";
}

interface PoetCoverage {
  poet: string;
  prescribedPoems: number;
  versePoems: number; // number of distinct sub_keys with at least one row
  verifiedRows: number;
  totalRows: number;
}

interface TextCoverage {
  text: string;
  noteCount: number;
}

async function loadDashboard(): Promise<{
  totals: { textNotes: number; poemNotes: number; poemVerified: number };
  recent: RecentItem[];
  poets: PoetCoverage[];
  texts: TextCoverage[];
  comparativeProfiles: number;
}> {
  const supabase = getServerSupabase();

  const [
    textNotesTotal,
    poemNotesAll,
    textNotesRecent,
    poemNotesRecent,
    poemRows,
    textRows,
  ] = await Promise.all([
    supabase.from("text_notes").select("id", { count: "exact", head: true }),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("content_type", "poem_notes"),
    supabase
      .from("text_notes")
      .select("id, text_key, note_type, display_subject, generated_at")
      .order("generated_at", { ascending: false })
      .limit(8),
    supabase
      .from("notes")
      .select("id, subject_key, sub_key, content_type, generated_at, status")
      .eq("content_type", "poem_notes")
      .order("generated_at", { ascending: false })
      .limit(8),
    supabase
      .from("notes")
      .select("subject_key, sub_key, status")
      .eq("content_type", "poem_notes"),
    supabase.from("text_notes").select("text_key"),
  ]);

  // Build per-poet coverage by comparing the prescribed HL list for the active
  // year with what we actually have in the notes table. This is the admin
  // signal: "Yeats has 24 verified-or-draft rows for 13 prescribed poems —
  // I am over-producing OR I have stale rows. Kavanagh has 10 verified rows
  // for 13 prescribed poems — I am under by 3."
  const poetSubKeyCount = new Map<string, Set<string>>();
  const poetVerified = new Map<string, number>();
  const poetTotal = new Map<string, number>();
  for (const r of (poemRows.data ?? []) as Array<{
    subject_key: string;
    sub_key: string;
    status: string;
  }>) {
    if (!poetSubKeyCount.has(r.subject_key)) {
      poetSubKeyCount.set(r.subject_key, new Set());
    }
    poetSubKeyCount.get(r.subject_key)!.add(r.sub_key);
    poetTotal.set(r.subject_key, (poetTotal.get(r.subject_key) ?? 0) + 1);
    if (r.status === "verified") {
      poetVerified.set(r.subject_key, (poetVerified.get(r.subject_key) ?? 0) + 1);
    }
  }
  const prescribedPoets = getPoetsHL(ACTIVE_YEAR);
  // Union: poets with notes + poets prescribed. Anything in Supabase but not
  // prescribed for this year is still shown so it doesn't disappear.
  const allPoets = Array.from(
    new Set([...prescribedPoets, ...poetSubKeyCount.keys()]),
  ).sort();
  const poets: PoetCoverage[] = allPoets.map((poet) => {
    const prescribedCount = prescribedPoets.includes(poet)
      ? getPoemsForPoet(ACTIVE_YEAR, poet).length
      : 0;
    return {
      poet,
      prescribedPoems: prescribedCount,
      versePoems: poetSubKeyCount.get(poet)?.size ?? 0,
      verifiedRows: poetVerified.get(poet) ?? 0,
      totalRows: poetTotal.get(poet) ?? 0,
    };
  });

  // Per-single-text counts from text_notes. A text with zero notes shows as
  // a coverage gap (red dot).
  const textCount = new Map<string, number>();
  for (const r of (textRows.data ?? []) as Array<{ text_key: string }>) {
    textCount.set(r.text_key, (textCount.get(r.text_key) ?? 0) + 1);
  }
  const prescribedTexts = Array.from(
    new Set(getSingleTexts(ACTIVE_YEAR).map((t) => t.title)),
  ).sort();
  const allTexts = Array.from(
    new Set([...prescribedTexts, ...textCount.keys()]),
  ).sort();
  const texts: TextCoverage[] = allTexts.map((text) => ({
    text,
    noteCount: textCount.get(text) ?? 0,
  }));

  // Recent feed combines text_notes and poem_notes, sorted by timestamp.
  const recent: RecentItem[] = [
    ...(textNotesRecent.data ?? []).map((row) => {
      const r = row as {
        id: string;
        text_key: string;
        note_type: string;
        display_subject: string;
        generated_at: string;
      };
      return {
        href: `/single-text/library/${r.id}`,
        title: r.display_subject,
        subtitle: `${r.text_key} · ${prettyNoteType(r.note_type)}`,
        when: r.generated_at,
        kind: "single-text" as const,
      };
    }),
    ...(poemNotesRecent.data ?? []).map((row) => {
      const r = row as {
        id: string;
        subject_key: string;
        sub_key: string;
        generated_at: string | null;
        status: string;
      };
      return {
        href: `/poetry`,
        title: r.sub_key,
        subtitle: `${r.subject_key} · poetry · ${r.status}`,
        when: r.generated_at ?? "",
        kind: "poetry" as const,
      };
    }),
  ]
    .filter((r) => r.when)
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, 8);

  return {
    totals: {
      textNotes: textNotesTotal.count ?? 0,
      poemNotes: poemNotesAll.count ?? 0,
      poemVerified: Array.from(poetVerified.values()).reduce((s, n) => s + n, 0),
    },
    recent,
    poets,
    texts,
    comparativeProfiles: 7, // file-based, see data/profiles/comparative/2026
  };
}

function prettyNoteType(s: string): string {
  return s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function relativeTime(iso: string): string {
  if (!iso) return "";
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
  const { totals, recent, poets, texts, comparativeProfiles } =
    await loadDashboard();

  const lastActivity = recent[0]?.when ?? null;

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header: current state of the catalogue at a glance. No emoji,
            no celebratory framing. Three numbers + a last-activity stamp. */}
        <header className="flex items-baseline justify-between mb-8 pb-6 border-b border-gray-200 flex-wrap gap-y-3">
          <div>
            <h1 className="text-3xl font-semibold text-navy tracking-tight">Catalogue</h1>
            <p className="text-sm text-gray-500 mt-1">
              {lastActivity
                ? `Last generation ${relativeTime(lastActivity)}.`
                : "No generations yet."}
            </p>
          </div>
          <div className="flex items-baseline gap-8 tabular-nums">
            <Stat label="poetry" value={totals.poemNotes} sub={`${totals.poemVerified} verified`} />
            <Stat label="text notes" value={totals.textNotes} />
            <Stat label="comparative" value={comparativeProfiles} sub="profiles" />
          </div>
        </header>

        {/* Two columns: coverage on the left (where the gaps are), recent on
            the right (what you just touched). On narrow screens they stack. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

          {/* Coverage: 2/3 width on desktop, the main signal. */}
          <section className="lg:col-span-2">
            <SectionTitle right={<Link href="/poetry" className="text-xs text-teal hover:underline">Generate poetry</Link>}>
              Poetry coverage ({ACTIVE_YEAR} HL)
            </SectionTitle>
            <CoverageTable>
              {poets.map((p) => {
                const ratio = p.prescribedPoems > 0
                  ? `${p.versePoems} / ${p.prescribedPoems}`
                  : `${p.versePoems}`;
                const isPrescribed = p.prescribedPoems > 0;
                const isComplete = isPrescribed && p.versePoems >= p.prescribedPoems;
                const isUnverified = p.totalRows > p.verifiedRows;
                return (
                  <CoverageRow
                    key={p.poet}
                    href={`/poetry`}
                    label={p.poet}
                    primary={ratio}
                    primaryLabel={isPrescribed ? "poems with notes" : "poems with notes (not in active list)"}
                    secondary={
                      isUnverified
                        ? `${p.verifiedRows} verified · ${p.totalRows - p.verifiedRows} draft`
                        : `${p.verifiedRows} verified`
                    }
                    statusDot={
                      !isPrescribed ? "neutral"
                        : isComplete && !isUnverified ? "ok"
                        : isComplete && isUnverified ? "warn"
                        : p.versePoems === 0 ? "miss"
                        : "warn"
                    }
                  />
                );
              })}
            </CoverageTable>

            <SectionTitle className="mt-8" right={<Link href="/single-text" className="text-xs text-teal hover:underline">Generate text note</Link>}>
              Single texts ({ACTIVE_YEAR})
            </SectionTitle>
            <CoverageTable>
              {texts.map((t) => (
                <CoverageRow
                  key={t.text}
                  href={`/single-text`}
                  label={t.text}
                  primary={String(t.noteCount)}
                  primaryLabel="notes"
                  secondary={t.noteCount === 0 ? "no production yet" : `${t.noteCount} generated`}
                  statusDot={t.noteCount === 0 ? "miss" : t.noteCount < 5 ? "warn" : "ok"}
                />
              ))}
            </CoverageTable>
          </section>

          {/* Recent: 1/3 width sidebar. */}
          <aside>
            <SectionTitle right={<Link href="/single-text/library" className="text-xs text-teal hover:underline">Library</Link>}>
              Recent
            </SectionTitle>
            {recent.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm text-gray-500">
                Nothing generated yet. Pick a generator above.
              </div>
            ) : (
              <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                {recent.map((r) => (
                  <li key={r.href + r.when}>
                    <Link
                      href={r.href}
                      className="flex flex-col px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-navy truncate">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{r.subtitle}</p>
                      <p className="text-xs text-gray-400 mt-1 tabular-nums">{relativeTime(r.when)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {/* Quick generators at the bottom: one row of plain links, no chrome. */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">Generate</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-2 text-sm">
            <li><Link href="/poetry" className="text-navy hover:text-teal transition-colors">Poetry note</Link></li>
            <li><Link href="/single-text" className="text-navy hover:text-teal transition-colors">Text note</Link></li>
            <li><Link href="/comparative" className="text-navy hover:text-teal transition-colors">Comparative</Link></li>
            <li><Link href="/generate" className="text-navy hover:text-teal transition-colors">Sample answer</Link></li>
            <li><Link href="/worksheet" className="text-navy hover:text-teal transition-colors">Worksheet</Link></li>
            <li><Link href="/slides" className="text-navy hover:text-teal transition-colors">Slides</Link></li>
            <li><Link href="/video" className="text-navy hover:text-teal transition-colors">Video</Link></li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-navy leading-none tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wider text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  );
}

function SectionTitle({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between mb-3 ${className}`}>
      <h2 className="text-sm font-semibold text-navy uppercase tracking-wider">{children}</h2>
      {right}
    </div>
  );
}

function CoverageTable({ children }: { children: React.ReactNode }) {
  return (
    <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
      {children}
    </ul>
  );
}

function CoverageRow({
  href,
  label,
  primary,
  primaryLabel,
  secondary,
  statusDot,
}: {
  href: string;
  label: string;
  primary: string;
  primaryLabel: string;
  secondary: string;
  statusDot: "ok" | "warn" | "miss" | "neutral";
}) {
  const dotColour =
    statusDot === "ok"
      ? "bg-teal"
      : statusDot === "warn"
        ? "bg-amber-400"
        : statusDot === "miss"
          ? "bg-red-400"
          : "bg-gray-300";
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
        title={primaryLabel}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColour} flex-shrink-0`} />
        <span className="text-sm font-medium text-navy flex-1 truncate">{label}</span>
        <span className="text-sm text-gray-700 tabular-nums">{primary}</span>
        <span className="text-xs text-gray-400 hidden sm:inline tabular-nums w-44 text-right truncate">
          {secondary}
        </span>
      </Link>
    </li>
  );
}
