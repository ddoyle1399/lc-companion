import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Dashboard. SaaSBold-style admin layout.
 *
 * Reference: light gray bg, white sidebar, KPI cards with circular
 * coloured icons + delta percentages, content-type tiles below.
 *
 * Adapted for a generation tool: KPI metrics show production state,
 * the second section is the three big generation tiles instead of
 * revenue charts.
 */

const ACTIVE_YEAR = 2026;

interface DashboardData {
  poetryRows: number;
  poetryVerified: number;
  textNotes: number;
  textTexts: number;
  comparativeProfiles: number;
  poetryLast7: number;
  poetryPrior7: number;
  textLast7: number;
  textPrior7: number;
  lastGen: { href: string; title: string; subtitle: string; whenIso: string } | null;
}

async function loadDashboard(): Promise<DashboardData> {
  const supabase = getServerSupabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

  const [
    poetryAll,
    poetryVerified,
    textTotal,
    textKeys,
    poetry7d,
    poetry14d,
    text7d,
    text14d,
    lastText,
  ] = await Promise.all([
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes"),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes").eq("status", "verified"),
    supabase.from("text_notes").select("id", { count: "exact", head: true }),
    supabase.from("text_notes").select("text_key"),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes").gte("generated_at", sevenDaysAgo),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("content_type", "poem_notes").gte("generated_at", fourteenDaysAgo),
    supabase.from("text_notes").select("id", { count: "exact", head: true }).gte("generated_at", sevenDaysAgo),
    supabase.from("text_notes").select("id", { count: "exact", head: true }).gte("generated_at", fourteenDaysAgo),
    supabase
      .from("text_notes")
      .select("id, text_key, display_subject, note_type, generated_at")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  return {
    poetryRows: poetryAll.count ?? 0,
    poetryVerified: poetryVerified.count ?? 0,
    textNotes: textTotal.count ?? 0,
    textTexts: distinctTexts,
    comparativeProfiles: 7,
    poetryLast7: poetry7d.count ?? 0,
    poetryPrior7: (poetry14d.count ?? 0) - (poetry7d.count ?? 0),
    textLast7: text7d.count ?? 0,
    textPrior7: (text14d.count ?? 0) - (text7d.count ?? 0),
    lastGen,
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

function pctDelta(now: number, prior: number): number | null {
  if (prior === 0) return now > 0 ? 100 : null;
  return Math.round(((now - prior) / prior) * 100);
}

export default async function DashboardPage() {
  const d = await loadDashboard();
  const poetryDelta = pctDelta(d.poetryLast7, d.poetryPrior7);
  const textDelta = pctDelta(d.textLast7, d.textPrior7);
  const verificationRate = d.poetryRows > 0 ? Math.round((d.poetryVerified / d.poetryRows) * 100) : 0;

  return (
    <div className="bg-[#F4F5F7] min-h-screen">

      {/* Top bar */}
      <div className="px-10 pt-8 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-medium text-slate-700">
            Welcome Diarmuid!
          </span>
          <span className="text-[18px]" role="img" aria-label="wave">
            👋
          </span>
        </div>
        {d.lastGen && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[12px] font-medium text-slate-600 tabular-nums">
              Last activity {relativeTime(d.lastGen.whenIso)}
            </span>
          </div>
        )}
      </div>

      {/* Page header */}
      <div className="px-10 pt-6 pb-8 flex items-end justify-between">
        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <div className="text-[13px] text-slate-500">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 text-slate-400">/</span>
          <span className="text-slate-700 font-medium">Dashboard</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-10 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            iconBg="bg-emerald-500"
            icon={<IconBook />}
            value={d.poetryRows}
            label="Poetry Notes"
            delta={poetryDelta}
            sub={`${d.poetryVerified} verified`}
          />
          <KpiCard
            iconBg="bg-orange-500"
            icon={<IconText />}
            value={d.textNotes}
            label="Text Notes"
            delta={textDelta}
            sub={`across ${d.textTexts} text${d.textTexts === 1 ? "" : "s"}`}
          />
          <KpiCard
            iconBg="bg-violet-500"
            icon={<IconCompare />}
            value={d.comparativeProfiles}
            label="Comparative Profiles"
            sub={`${ACTIVE_YEAR} cycle`}
          />
          <KpiCard
            iconBg="bg-sky-500"
            icon={<IconCheck />}
            value={`${verificationRate}%`}
            label="Verification Rate"
            sub={`${d.poetryVerified} of ${d.poetryRows}`}
            tone={verificationRate >= 80 ? "good" : verificationRate >= 50 ? "warn" : "miss"}
          />
        </div>
      </div>

      {/* Generate section */}
      <div className="px-10 mb-10">
        <div className="mb-5">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Generate
          </h2>
          <p className="text-[13.5px] text-slate-500 mt-1">
            Choose a content type to begin generating notes for your students.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <GenerateCard
            href="/poetry"
            title="Poetry"
            subtitle="Notes for prescribed poems"
            iconBg="bg-emerald-500"
            icon={<IconBook />}
          />
          <GenerateCard
            href="/single-text"
            title="Single Text"
            subtitle="Notes for novels, plays, Shakespeare"
            iconBg="bg-orange-500"
            icon={<IconText />}
          />
          <GenerateCard
            href="/comparative"
            title="Comparative"
            subtitle="Cross-text essays and mode notes"
            iconBg="bg-violet-500"
            icon={<IconCompare />}
          />
        </div>
      </div>

      {/* Resume + Quick links */}
      {d.lastGen && (
        <div className="px-10 pb-10">
          <div className="mb-5">
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
              Continue
            </h2>
            <p className="text-[13.5px] text-slate-500 mt-1">
              Pick up where you left off, or jump to a tool.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Link
              href={d.lastGen.href}
              className="group lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80 hover:border-teal hover:shadow-[0_8px_30px_-8px_rgba(42,157,143,0.18)] transition-all flex items-center justify-between gap-5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal mb-1.5">
                  Last generation · {relativeTime(d.lastGen.whenIso)}
                </p>
                <h3 className="text-[18px] font-semibold text-slate-900 truncate tracking-tight">
                  {d.lastGen.title}
                </h3>
                <p className="text-[13.5px] text-slate-500 mt-0.5 truncate">
                  {d.lastGen.subtitle}
                </p>
              </div>
              <span className="text-slate-300 group-hover:text-teal group-hover:translate-x-1 transition-all flex-shrink-0">
                <Arrow size={20} />
              </span>
            </Link>
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                Quick links
              </p>
              <ul className="space-y-1.5">
                <QuickLink href="/single-text/library">Library</QuickLink>
                <QuickLink href="/coverage">Coverage</QuickLink>
                <QuickLink href="/generate">Sample Answer</QuickLink>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── components ───── */

function KpiCard({
  iconBg,
  icon,
  value,
  label,
  delta,
  sub,
  tone,
}: {
  iconBg: string;
  icon: React.ReactNode;
  value: number | string;
  label: string;
  delta?: number | null;
  sub?: string;
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
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80">
      <div
        className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center text-white mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]`}
      >
        {icon}
      </div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className={`text-[28px] font-bold leading-none tabular-nums tracking-tight ${valueColour}`}>
          {value}
        </p>
        {delta !== undefined && delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums ${
              delta >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-[13px] text-slate-500 mt-1">{label}</p>
      {sub && (
        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">{sub}</p>
      )}
    </div>
  );
}

function GenerateCard({
  href,
  title,
  subtitle,
  iconBg,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80 hover:border-teal hover:shadow-[0_8px_30px_-8px_rgba(42,157,143,0.18)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col min-h-[180px]"
    >
      <div
        className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center text-white mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]`}
      >
        {icon}
      </div>
      <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-teal opacity-0 group-hover:opacity-100 transition-opacity">
          Start &rarr;
        </span>
        <span className="text-slate-300 group-hover:text-teal group-hover:translate-x-1 transition-all ml-auto">
          <Arrow size={18} />
        </span>
      </div>
    </Link>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <span>{children}</span>
        <span className="text-slate-300 group-hover:text-teal group-hover:translate-x-0.5 transition-all">
          <Arrow size={14} />
        </span>
      </Link>
    </li>
  );
}

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ───── icons ───── */

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
