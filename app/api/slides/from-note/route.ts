/**
 * app/api/slides/from-note/route.ts
 *
 * POST /api/slides/from-note
 * Body: { noteId: string }
 *
 * Loads a saved note, parses its markdown structure, builds a deck plan
 * via Sonnet 4.6 (parallel section condensing), renders to .pptx, uploads
 * to Supabase Storage, persists a slide_decks row, and returns a signed
 * download URL.
 *
 * Errors:
 *   400 — missing noteId
 *   404 — note not found
 *   422 — note had no recognisable sections to slide
 *   500 — Anthropic, render, or storage failure (with detail)
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import { parseNoteStructure } from "@/lib/slides/parseNoteStructure";
import { buildDeckPlan } from "@/lib/slides/buildDeckPlan";
import { renderDeckToPptx } from "@/lib/slides/renderDeckToPptx";

export const maxDuration = 120;

const BUCKET = "slide-decks";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  let noteId: string;
  try {
    const body = await req.json();
    noteId = body?.noteId;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }
  if (!noteId || typeof noteId !== "string") {
    return NextResponse.json({ error: "missing_noteId" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: note, error: noteErr } = await (supabase as any)
    .from("notes")
    .select("id, subject_key, sub_key, body_text, quotes, metadata, content_type")
    .eq("id", noteId)
    .single();

  if (noteErr || !note) {
    return NextResponse.json(
      { error: "note_not_found", detail: noteErr?.message },
      { status: 404 },
    );
  }
  if (typeof note.body_text !== "string" || note.body_text.trim().length === 0) {
    return NextResponse.json(
      { error: "note_has_no_body_text" },
      { status: 422 },
    );
  }

  const parsed = parseNoteStructure({
    poet: note.subject_key ?? "Unknown",
    poem: note.sub_key ?? "Untitled",
    bodyMarkdown: note.body_text,
    quotes: note.quotes,
    metadata: (note.metadata as Record<string, unknown> | null) ?? null,
  });

  const hasSlides =
    parsed.stanzas.length > 0 ||
    parsed.themes.length > 0 ||
    Boolean(parsed.overview) ||
    Boolean(parsed.form_and_structure) ||
    Boolean(parsed.exam_use);
  if (!hasSlides) {
    return NextResponse.json(
      {
        error: "no_recognisable_sections",
        detail: `Parsed note had 0 stanza, 0 theme, and no top-level sections. Unrecognised headings: ${parsed.unrecognised
          .map((u) => u.heading)
          .slice(0, 10)
          .join(", ")}`,
      },
      { status: 422 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_anthropic_key" }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  let deckPlan;
  try {
    deckPlan = await buildDeckPlan(parsed, { client, concurrency: 5 });
  } catch (err) {
    return NextResponse.json(
      { error: "deck_plan_failed", detail: (err as Error).message },
      { status: 500 },
    );
  }

  let buffer: Buffer;
  let slideCount: number;
  let byteLength: number;
  try {
    const out = await renderDeckToPptx(deckPlan);
    buffer = out.buffer;
    slideCount = out.slideCount;
    byteLength = out.byteLength;
  } catch (err) {
    return NextResponse.json(
      { error: "render_failed", detail: (err as Error).message },
      { status: 500 },
    );
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${slugify(parsed.poet)}-${slugify(parsed.poem)}-${ts}.pptx`;
  const storagePath = `${noteId}/${filename}`;

  const { error: uploadErr } = await (supabase as any).storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: "upload_failed", detail: uploadErr.message },
      { status: 500 },
    );
  }

  const { data: deckRow, error: insertErr } = await (supabase as any)
    .from("slide_decks")
    .insert({
      note_id: noteId,
      deck_plan: deckPlan,
      storage_path: storagePath,
      slide_count: slideCount,
      file_size_bytes: byteLength,
      generation_model: "claude-sonnet-4-6",
    })
    .select("id, generated_at")
    .single();

  if (insertErr) {
    // The file is in storage but the row insert failed. Surface it but do
    // not delete the file; manual cleanup is preferable to losing artefacts.
    return NextResponse.json(
      {
        error: "row_insert_failed",
        detail: insertErr.message,
        storage_path: storagePath,
      },
      { status: 500 },
    );
  }

  const { data: signed, error: signErr } = await (supabase as any).storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      {
        error: "signed_url_failed",
        detail: signErr?.message,
        deck_id: deckRow.id,
        storage_path: storagePath,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    deck_id: deckRow.id,
    note_id: noteId,
    slide_count: slideCount,
    file_size_bytes: byteLength,
    download_url: signed.signedUrl,
    expires_in_seconds: 3600,
  });
}
