import Link from "next/link";

export interface TextNoteRowData {
  id: string;
  generated_at: string;
  display_subject: string | null;
  note_type: string | null;
  word_count: number | null;
  href: string;
}

export default function TextNoteRow({ row }: { row: TextNoteRowData }) {
  return (
    <Link
      href={row.href}
      className="flex items-start justify-between px-4 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-xs text-slate-400 mb-1">
          {formatDate(row.generated_at)}
          {row.note_type && ` · ${row.note_type}`}
          {row.word_count != null && ` · ${row.word_count}w`}
        </div>
        <p className="text-sm text-slate-800 truncate">
          {row.display_subject ?? "Untitled"}
        </p>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
