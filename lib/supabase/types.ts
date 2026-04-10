export interface NotesRow {
  id: string;
  schema_version: number;
  content_type: string;
  subject_key: string;
  sub_key: string | null;
  level: "higher" | "ordinary";
  exam_year: number;
  title: string;
  body_html: string;
  body_text: string;
  quotes: unknown | null;
  themes: unknown | null;
  metadata: unknown | null;
  generation_model: string | null;
  generated_at: string;
  status: string;
}

export interface SaveNoteInput {
  content_type: string;
  subject_key: string;
  sub_key?: string | null;
  level: "higher" | "ordinary";
  exam_year: number;
  title: string;
  body_html: string;
  body_text: string;
  quotes?: string[] | null;
  themes?: string[] | null;
  metadata?: unknown | null;
  generation_model?: string | null;
  status?: string;
}

export type SaveNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; error: string };
