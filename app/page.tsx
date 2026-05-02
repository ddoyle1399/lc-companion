import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard. Generation-first.
 *
 * The app exists to generate content. The first thing the operator's eye
 * lands on is the three big generation tiles. Resume sits below that for
 * one-click pickup. Catalogue stats and coverage are supporting context,
 * shown smaller and lower so they do not compete with the action.
 *
 * Hierarchy:
 *   1. Greeting + activity pill
 *   2. Generate row — three large prominent tiles (Poetry, Single Text,
 *      Comparative) with the icon + name + subtitle + arrow
 *   3. Resume tile (full width, single click into the most recent note)
 *   4. Stats strip (compact KPI row, secondary)
 *   5. Coverage block (signal of where to point your generator next)
 *   6. Other tools row (Sample answer, Worksheet, Slides, Video, etc)
 */

const ACTIVE_YEAR = 2026;

const PRESCRIBED_HL: Record<string, number> = {
  "Elizabeth Bishop": 10,
  "Seamus Heaney": 13,
  "Tracy K. Smith": 12,
  "Adrienne Rich": 7,
  "Patrick Kavanagh": 13,
  "W.B. Yeats": 13,
  "John Donne": 10,
  "Eiléan Ní Chuilleanáin": 12,
  "Paula Meehan": 10,
  "T.S. Eliot": 8,
};

interface DashboardData {
  poetryRows: number;
  poetryVerified: number;
  textNotes: number;
  textTexts: number;
  comparativeProfiles: number;
  textLast7Days: number;
  lastGen: { href: string; title: string; subtitle: string; whenIso: string } | null;
  coverage: { poet: string; covered: number; total: number; percent: number }[];
  lastActivityIso: string | null;
}

async function loadDashboard(): Promise<DashboardData> {
  const supabase = getServerSupabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [poetryAll, poetryVerified, textTotal, textKeys, text7d, lastText, poetRows] =
    await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes"),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes").eq("status", "verified"),
      supabase.from("text_notes").select("id", { count: "exact", head: true }),
      supabase.from("text_notes").select("text_key"),
      supabase.from("text_notes").select("id", { count: "exact", head: true }).gte("generated_at", sevenDaysAgo),
      supabase
        .from("text_notes")
        .select("id, text_key, display_subject, note_type, generated_at")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("notes").select("subject_key, sub_key").eq("content_type", "poem_notes"),
    ]);

  const distinctTexts = new Set(((textKeys.data ?? []) as Array<{ text_key: string }>).map((r) => r.text_key)).size;

  const lastGen = lastText.data
    ? (() => {
        const r = lastText.data as { id: string; text_key: string; display_subject: string; note_type: string; generated_at: string };
        const niceType = r.note_type.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
        return {
          href: `/single-text/library/${r.id}`,
          title: r.display_subject,
          subtitle: `${r.text_key} · ${niceType}`,
          whenIso: r.generated_at,
        };
      })()
    : null;

  const poetSubKeys = new Map<string, Set<string>>();
  for (const r of (poetRows.data ?? []) as Array<{ subject_key: string; sub_key: string }>) {
    if (!poetSubKeys.has(r.subject_key)) poetSubKeys.set(r.subject_key, new Set());
    poetSubKeys.get(r.subject_key)!.add(r.sub_key);
  }
  const coverage = Object.entries(PRESCRIBED_HL)
    .map(([poet, total]) => {
      const covered = poetSubKeys.get(poet)?.size ?? 0;
      return { poet, covered, total, percent: Math.round((covered / total) * 100) };
    })
    .sort((a, b) => a.percent - b.percent) // worst first - shows where to focus
    .slice(0, 5);

  return {
    poetryRows: poetryAll.count ?? 0,
    poetryVerified: poetryVerified.count ?? 0,
    textNotes: textTotal.count ?? 0,
    textTexts: distinctTexts,
    comparativeProfiles: 7,
    textLast7Days: text7d.count ?? 0,
    lastGen,
    coverage,
    lastActivityIso: lastGen?.whenIso ?? null,
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
  const d = await loadDashboard();
  const verificationRate = d.poetryRows > 0 ? Math.round((d.poetryVerified / d.poetryRows) * 100) : 0;

  return (
    <div className="px-10 lg:px-14 py-10 lg:py-14 max-w-[1400px]">

      {/* Header */}
      <header className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-tight text-slate-900 leading-tight">
            Hello, Diarmuid
          </h1>
          <p className="text-[15px] text-slate-500 mt-1.5">
            What do you want to generate today?
          </p>
        </div>
        {d.lastActivityIso && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[12px] font-medium text-slate-600 tabular-nums">
              Last activity {relativeTime(d.lastActivityIso)}
            </span>
          </div>
        )}
      </header>

      {/* GENERATE — hero row, three big tiles */}
      <SectionLabel>Generate</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <BigGenerateTile
          href="/poetry"
          title="Poetry"
          subtitle="Notes for prescribed poems"
          icon={<IconPoetry />}
          accent="from-teal to-[#1F7A6F]"
        />
        <BigGenerateTile
          href="/single-text"
          title="Single Text"
          subtitle="Notes for novels, plays, Shakespeare"
          icon={<IconText />}
          accent="from-[#3B82F6] to-[#1D4ED8]"
        />
        <BigGenerateTile
          href="/comparative"
          title="Comparative"
          subtitle="Cross-text essays and mode notes"
          icon={<IconCompare />}
          accent="from-[#8B5CF6] to-[#6D28D9]"
        />
      </div>

      {/* Resume */}
      {d.lastGen && (
        <Link
          href={d.lastGen.href}
          className="group relative block bg-white rounded-2xl p-6 mb-10 overflow-hidden transition-all duration-200 ring-1 ring-slate-200 hover:ring-teal hover:shadow-[0_8px_30px_-8px_rgba(42,157,143,0.18)]"
        >
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">Resume</span>
                <span className="text-[10px] text-slate-400 tabular-nums">· {relativeTime(d.lastGen.whenIso)}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight truncate">
                {d.lastGen.title}
              </h2>
              <p className="text-[13.5px] text-slate-500 mt-0.5 truncate">{d.lastGen.subtitle}</p>
            </div>
            <Arrow size={18} />
          </div>
        </Link>
      )}

      {/* Compact stats strip — secondary */}
      <SectionLabel>At a glance</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <MiniStat label="Poetry notes" value={d.poetryRows} sub={`${d.poetryVerified} verified`} />
        <MiniStat label="Text notes" value={d.textNotes} sub={`${d.textLast7Days} this week`} />
        <MiniStat label="Comparative" value={d.comparativeProfiles} sub="text profiles" />
        <MiniStat
          label="Verification"
          value={`${verificationRate}%`}
          sub="poetry only"
          tone={verificationRate >= 80 ? "good" : verificationRate >= 50 ? "warn" : "miss"}
        />
      </div>

      {/* Coverage — where to focus next */}
      <SectionLabel right={<Link href="/coverage" className="text-[11px] font-medium text-teal hover:text-navy normal-case tracking-normal">View all &rarr;</Link>}>
        Where to focus next
      </SectionLabel>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 mb-10">
        <ul className="space-y-3.5">
          {d.coverage.map((c) => (
            <li key={c.poet}>
              <Link
                href="/poetry"
                className="group block hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[14px] font-medium text-slate-800 group-hover:text-teal transition-colors">
                    {c.poet}
                  </span>
                  <span className="text-[12px] text-slate-500 tabular-nums">
                    <span className="font-semibold text-slate-700">{c.covered}</span>
                    <span className="text-slate-400">/{c.total}</span>
                  </span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${c.percent}%`,
                      background:
                        c.percent === 100
                          ? "linear-gradient(90deg, #10B981 0%, #059669 100%)"
                          : c.percent >= 60
                            ? "linear-gradient(90deg, #34D1BF 0%, #2A9D8F 100%)"
                            : c.percent > 0
                              ? "linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)"
                              : "#E2E8F0",
                    }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Other tools */}
      <SectionLabel>More</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CompactTile href="/generate" title="Sample answer" />
        <CompactTile href="/single-text/library" title="Library" />
        <CompactTile href="/coverage" title="Coverage" />
        <CompactTile href="/worksheet" title="Worksheet" />
        <CompactTile href="/slides" title="Slides" />
        <CompactTile href="/video" title="Video" />
        <CompactTile href="/comprehension" title="Comprehension" />
        <CompactTile href="/composition" title="Composition" />
      </div>
    </div>
  );
}

/* ───── components ───── */

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {children}
      </h2>
      {right}
    </div>
  );
}

/**
 * Big generation tile. Distinct from the rest of the dashboard tiles —
 * larger padding, an accent-coloured gradient mark on the icon, an arrow
 * that nudges further on hover. These three are the primary action.
 */
function BigGenerateTile({
  href,
  title,
  subtitle,
  icon,
  accent,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl p-7 ring-1 ring-slate-200 hover:ring-teal hover:shadow-[0_12px_40px_-10px_rgba(42,157,143,0.22)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-5 min-h-[180px]"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-teal opacity-0 group-hover:opacity-100 transition-opacity">
          Start generating
        </span>
        <span className="text-slate-300 group-hover:text-teal group-hover:translate-x-1 transition-all duration-200 ml-auto">
          <Arrow size={20} />
        </span>
      </div>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  tone?: "good" | "warn" | "miss";
}) {
  const valueColour =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "miss"
          ? "text-red-600"
          : "text-slate-900";
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`text-[22px] font-semibold tabular-nums mt-1 leading-none tracking-tight ${valueColour}`}>
        {value}
      </p>
      <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">{sub}</p>
    </div>
  );
}

function CompactTile({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3 hover:ring-teal hover:bg-slate-50 transition-all"
    >
      <span className="text-[13.5px] font-medium text-slate-800 group-hover:text-slate-900">
        {title}
      </span>
      <span className="text-slate-300 group-hover:text-teal group-hover:translate-x-0.5 transition-all">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </Link>
  );
}

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ───── tile icons ───── */

function IconPoetry() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconText() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
