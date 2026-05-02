"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Sidebar navigation. Fixed left, full height, white card on gray-50 page.
 *
 * Visual reference: Linear / Resend / Cal.com sidebars. Logo at top, grouped
 * nav with subtle section labels, selected-state has a light grey background
 * and a 2px teal accent strip on the left.
 *
 * Active route: matches exact path (for /) or prefix (for nested routes).
 */

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Group {
  label?: string;
  items: Item[];
}

const NAV: Group[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: <IconHome /> },
      { href: "/coverage", label: "Coverage", icon: <IconChart /> },
      { href: "/single-text/library", label: "Library", icon: <IconFolder /> },
    ],
  },
  {
    label: "Generate",
    items: [
      { href: "/poetry", label: "Poetry", icon: <IconBook /> },
      { href: "/single-text", label: "Single Text", icon: <IconBookOpen /> },
      { href: "/comparative", label: "Comparative", icon: <IconCompare /> },
      { href: "/generate", label: "Sample answer", icon: <IconStar /> },
    ],
  },
  {
    label: "Paper 1",
    items: [
      { href: "/comprehension", label: "Comprehension", icon: <IconSearch /> },
      { href: "/composition", label: "Composition", icon: <IconPen /> },
      { href: "/unseen-poetry", label: "Unseen poetry", icon: <IconEye /> },
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
    <aside className="flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-gray-200 z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-navy flex items-center justify-center text-white text-xs font-bold tracking-tight">
            LC
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">
            Companion
          </span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal rounded-r"
                        />
                      )}
                      <span
                        className={`flex-shrink-0 ${
                          active ? "text-gray-900" : "text-gray-400"
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
      <div className="border-t border-gray-100 px-3 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-400 flex-shrink-0">
            <IconLogout />
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

// Simple line icons. 16x16, stroke 1.5. Match Lucide / Tabler conventions.
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
