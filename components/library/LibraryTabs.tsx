"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabSpec {
  href: string;
  label: string;
  count: number;
}

interface LibraryTabsProps {
  counts: {
    poetry: number;
    singleText: number;
    comparative: number;
    sampleAnswers: number;
  };
}

export default function LibraryTabs({ counts }: LibraryTabsProps) {
  const pathname = usePathname();
  const tabs: TabSpec[] = [
    { href: "/library/poetry",         label: "Poetry",         count: counts.poetry },
    { href: "/library/single-text",    label: "Single Text",    count: counts.singleText },
    { href: "/library/comparative",    label: "Comparative",    count: counts.comparative },
    { href: "/library/sample-answers", label: "Sample Answers", count: counts.sampleAnswers },
  ];
  return (
    <div className="border-b border-slate-200 mb-6">
      <nav className="flex gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2.5 text-sm rounded-t-md -mb-px border-b-2 transition-colors ${
                active
                  ? "border-teal-600 text-teal-700 font-semibold bg-teal-50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className="ml-2 text-xs text-slate-400">({t.count})</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
