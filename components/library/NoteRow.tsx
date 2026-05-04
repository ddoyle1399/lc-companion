import Link from "next/link";

export interface NoteRowData {
  id: string;
  generated_at: string;
  subject_key: string | null;
  title: string | null;
  status: string | null;
  body_chars: number;
  href: string;
}

export default function NoteRow({ row }: { row: NoteRowData }) {
  return (
    <Link
      href={row.href}
      className="flex items-start justify-between px-4 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-xs text-slate-400 mb-1">
          {formatDate(row.generated_at)} · {row.subject_key ?? "—"} · {fmtChars(row.body_chars)}
        </div>
        <p className="text-sm text-slate-800 truncate">
          {row.title ?? "Untitled"}
        </p>
      </div>
      <div className="flex items-center flex-shrink-0">
        <StatusPill status={row.status} />
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const label = status ?? "draft";
  const tone =
    label === "verified"
      ? "bg-green-100 text-green-700"
      : label === "draft"
      ? "bg-amber-100 text-amber-700"
      : label === "locked"
      ? "bg-slate-100 text-slate-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tone}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtChars(n: number): string {
  return n >= 1000 ? `~${Math.round(n / 1000)}k chars` : `${n} chars`;
}
