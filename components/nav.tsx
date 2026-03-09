"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [{ href: "/", label: "Dashboard" }],
  },
  {
    label: "Paper 2",
    items: [
      { href: "/poetry", label: "Poetry" },
      { href: "/single-text", label: "Single Text" },
      { href: "/comparative", label: "Comparative" },
      { href: "/unseen-poetry", label: "Unseen Poetry" },
    ],
  },
  {
    label: "Paper 1",
    items: [
      { href: "/comprehension", label: "Comprehension" },
      { href: "/composition", label: "Composition" },
    ],
  },
  {
    items: [
      { href: "/poems", label: "Poem Texts" },
      { href: "/worksheet", label: "Worksheets" },
      { href: "/slides", label: "Slides" },
      { href: "/video", label: "Video" },
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors"
            >
              LC Companion
            </Link>
            {navGroups.map((group, gi) => {
              return (
                <div key={gi} className="flex items-center gap-1">
                  <div className="h-4 w-px bg-white/20 mx-1" />
                  {group.label && (
                    <span className="text-[10px] uppercase tracking-wider text-white/30 mr-1">
                      {group.label}
                    </span>
                  )}
                  {group.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`text-sm px-3 py-1 rounded transition-colors ${
                          active
                            ? "bg-teal text-white"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
