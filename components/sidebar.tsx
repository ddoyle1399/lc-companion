"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Sidebar navigation. Generation-first.
 *
 * The app exists to generate content. The nav is structured so the
 * generation routes are the most prominent thing in view: a primary
 * "+ New note" CTA right under the logo, then a GENERATE section as
 * the first nav group with larger items than the admin/production
 * groups below.
 */

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Group {
  label?: string;
  items: Item[];
  // primary group items are slightly larger/bolder. Used for the
  // generation routes.
  primary?: boolean;
}

const NAV: Group[] = [
  {
    label: "Generate",
    primary: true,
    items: [
      { href: "/poetry", label: "Poetry", icon: <IconBook /> },
      { href: "/single-text", label: "Single Text", icon: <IconBookOpen /> },
      { href: "/comparative", label: "Comparative", icon: <IconCompare /> },
      { href: "/comprehension", label: "Comprehension", icon: <IconSearch /> },
      { href: "/composition", label: "Composition", icon: <IconPen /> },
      { href: "/unseen-poetry", label: "Unseen poetry", icon: <IconEye /> },
      { href: "/generate", label: "Sample answer", icon: <IconStar /> },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/", label: "Dashboard", icon: <IconHome /> },
      { href: "/coverage", label: "Coverage", icon: <IconChart /> },
      { href: "/single-text/library", label: "Library", icon: <IconFolder /> },
    ],
  },
  {
    label: "Production",
    items: [
      { href: "/worksheet", label: "Worksheet", icon: <IconClipboard /> },
      { href: "/slides", label: "Slides", icon: <IconSlides /> },
      { href: "/video", label: "Video", icon: <IconVideo /> },
      { href: "/poems", label: "Poem texts", icon: <IconText /> },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="w-64 shrink-0 sticky top-0 h-screen flex flex-col text-slate-300"
      style={{
        background: "linear-gradient(180deg, #0F172A 0%, #0B1220 100%)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            style={{
              background: "linear-gradient(135deg, #2A9D8F 0%, #1F7A6F 100%)",
            }}
          >
            LC
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-white tracking-tight">
              Companion
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase">
              LC English
            </span>
          </div>
        </Link>
      </div>

      {/* Primary CTA: New note. Defaults to the poetry generator (the most
          frequent starting point). The big visual weight here is intentional;
          this is the action that fires every day. */}
      <div className="px-3 pb-3">
        <Link
          href="/poetry"
          className="group flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] hover:brightness-110 transition-all"
          style={{
            background: "linear-gradient(135deg, #34D1BF 0%, #2A9D8F 100%)",
          }}
        >
          <span className="flex items-center gap-2">
            <IconPlus />
            New note
          </span>
          <kbd className="text-[10px] text-white/70 font-mono bg-white/10 px-1.5 py-0.5 rounded">
            P
          </kbd>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-5">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const sizeClasses = group.primary
                  ? "py-2 text-[13.5px]"
                  : "py-2 text-[13px]";
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`relative flex items-center gap-3 px-3 rounded-lg transition-all duration-150 ${sizeClasses} ${
                        active
                          ? "bg-white/[0.07] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          : group.primary
                            ? "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-sm"
                          style={{
                            background:
                              "linear-gradient(180deg, #34D1BF 0%, #2A9D8F 100%)",
                          }}
                        />
                      )}
                      <span
                        className={`flex-shrink-0 transition-colors ${
                          active ? "text-teal" : group.primary ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: sign out */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
        >
          <span className="text-slate-500 flex-shrink-0">
            <IconLogout />
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

/* ───── icons ───── */

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  );
}
function IconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconBookOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconPen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}
function IconSlides() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="14" rx="2"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function IconVideo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}
function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
