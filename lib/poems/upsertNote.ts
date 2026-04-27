/**
 * Upsert a verified poem_notes row into the `notes` table.
 *
 * Pattern matches existing Heaney/Yeats versioning: any prior verified row for the
 * same (poet, poem) is marked 'superseded' before the new row is inserted, so the
 * audit history is preserved but the dropdown only sees the latest verified bank.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type { ExtractedBank } from "./extractBank";

export interface UpsertResult {
  insertedId: string;
  supersededIds: string[];
}

const GENERATION_MODEL = "claude-sonnet-4-6";
const DEFAULT_LEVEL = "higher";
const DEFAULT_EXAM_YEAR = 2026;
const CONTENT_TYPE = "poem_notes";

export async function upsertVerifiedPoemNote(
  poet: string,
  poem: string,
  bank: ExtractedBank,
  opts: { examYear?: number; level?: "higher" | "ordinary" } = {},
): Promise<UpsertResult> {
  const supabase = getServerSupabase();
  const examYear = opts.examYear ?? DEFAULT_EXAM_YEAR;
  const level = opts.level ?? DEFAULT_LEVEL;

  // Mark any existing verified row(s) for this poem as superseded so the dropdown
  // only ever sees one verified bank per poem.
  const { data: superseded, error: supersedeErr } = await supabase
    .from("notes")
    .update({ status: "superseded" })
    .eq("content_type", CONTENT_TYPE)
    .eq("subject_key", poet)
    .eq("sub_key", poem)
    .eq("status", "verified")
    .select("id");

  if (supersedeErr) {
    throw new Error(`supersede_failed:${supersedeErr.message}`);
  }

  // Insert the new verified bank.
  const { data: inserted, error: insertErr } = await supabase
    .from("notes")
    .insert({
      content_type: CONTENT_TYPE,
      subject_key: poet,
      sub_key: poem,
      level,
      exam_year: examYear,
      title: poem,
      body_html: "<p>Verified quote bank.</p>",
      body_text: `Verified quote bank for ${poem}.`,
      quotes: bank.quotes,
      metadata: bank.metadata,
      generation_model: GENERATION_MODEL,
      status: "verified",
      schema_version: 1,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    throw new Error(`insert_failed:${insertErr?.message ?? "unknown"}`);
  }

  return {
    insertedId: (inserted as { id: string }).id,
    supersededIds: ((superseded as { id: string }[]) ?? []).map((r) => r.id),
  };
}
