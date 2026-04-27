import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { generateTextNote } from "@/lib/claude/generateTextNote";
import { findSingleTextAuthor } from "@/data/circulars";
import type {
  Depth,
  Level,
  NoteType,
} from "@/lib/claude/textNotePrompts";

const VALID_LEVELS: Level[] = ["higher", "ordinary"];
const VALID_DEPTHS: Depth[] = ["quick", "standard", "deep"];
const VALID_NOTE_TYPES: NoteType[] = [
  "character_profile",
  "theme_study",
  "relationship_study",
  "scene_analysis",
  "plot_summary",
  "quote_bank_theme",
  "quote_bank_character",
  "quote_bank_act",
  "dramatic_technique",
  "critical_reading",
  "past_question_walkthrough",
];

// Author for a given text title is resolved at request time from the
// prescribed circulars (2026/2027/2028). To add a new prescribed single text
// in future, add it to the circular JSON files only; no code change needed
// here. The route accepts any title that:
//   (a) appears as a prescribed single text in any cycle, AND
//   (b) has a verified quote bank in the notes table.

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const textKey = typeof b.textKey === "string" ? b.textKey : null;
  const noteType = typeof b.noteType === "string" ? (b.noteType as NoteType) : null;
  const subjectKey = typeof b.subjectKey === "string" ? b.subjectKey : null;
  const level = typeof b.level === "string" ? (b.level as Level) : null;
  const depth = typeof b.depth === "string" ? (b.depth as Depth) : "standard";
  const userInstructions =
    typeof b.userInstructions === "string" ? b.userInstructions : "";

  if (
    !textKey ||
    !noteType ||
    !subjectKey ||
    !level ||
    !VALID_LEVELS.includes(level) ||
    !VALID_DEPTHS.includes(depth) ||
    !VALID_NOTE_TYPES.includes(noteType)
  ) {
    return NextResponse.json(
      {
        error: "missing_or_invalid_fields",
        required: ["textKey", "noteType", "subjectKey", "level (higher|ordinary)", "depth (quick|standard|deep)"],
      },
      { status: 400 },
    );
  }

  const author = findSingleTextAuthor(textKey);
  if (!author) {
    return NextResponse.json(
      {
        error: "unsupported_text",
        detail: `${textKey} is not prescribed as a single text in any current cycle.`,
      },
      { status: 400 },
    );
  }

  const supabase = getServerSupabase();

  // Resolve subject from catalogue (so display name and meta are correct).
  // For past_question_walkthrough the subjectKey may be a question_id rather
  // than a catalogue subject; handle that path separately.
  let displaySubject = subjectKey;
  let subjectMeta: Record<string, unknown> = {};

  if (noteType === "past_question_walkthrough") {
    // subjectKey is a past_questions.id
    const { data: q } = await supabase
      .from("past_questions")
      .select("question_text, exam_year")
      .eq("id", subjectKey)
      .single();
    if (!q) {
      return NextResponse.json({ error: "past_question_not_found" }, { status: 404 });
    }
    displaySubject = `${q.exam_year}: ${q.question_text}`;
  } else {
    const { data: asset } = await supabase
      .from("single_text_assets")
      .select("display_name, meta, asset_type")
      .eq("text_key", textKey)
      .eq("subject_key", subjectKey)
      .single();
    if (!asset) {
      return NextResponse.json(
        { error: "subject_not_in_catalogue", textKey, subjectKey },
        { status: 400 },
      );
    }
    displaySubject = asset.display_name as string;
    subjectMeta = (asset.meta as Record<string, unknown>) ?? {};
  }

  // Pull the verified quote bank
  const { data: notesRows, error: notesErr } = await supabase
    .from("notes")
    .select("quotes")
    .eq("subject_key", textKey)
    .eq("content_type", "single_text_notes")
    .eq("status", "verified");

  if (notesErr || !notesRows || notesRows.length === 0) {
    return NextResponse.json(
      { error: "no_verified_bank", detail: `No verified quote bank for ${textKey}` },
      { status: 400 },
    );
  }

  const quoteBank: string[] = notesRows.flatMap((row) => {
    const q = row.quotes;
    if (!Array.isArray(q)) return [];
    return q
      .map((x) => {
        if (typeof x === "string") return x;
        if (
          x &&
          typeof x === "object" &&
          typeof (x as { text?: unknown }).text === "string"
        ) {
          return (x as { text: string }).text;
        }
        return null;
      })
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  });

  if (quoteBank.length < 10) {
    return NextResponse.json(
      { error: "quote_bank_too_thin", count: quoteBank.length },
      { status: 400 },
    );
  }

  const result = await generateTextNote({
    noteType,
    textKey,
    author,
    subjectDisplay: displaySubject,
    subjectMeta,
    level,
    depth,
    quoteBank,
    userInstructions,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "generation_failed", detail: result.error },
      { status: 500 },
    );
  }

  // Persist
  const { data: saved, error: saveErr } = await supabase
    .from("text_notes")
    .insert({
      text_key: textKey,
      level,
      note_type: noteType,
      subject_key: subjectKey,
      display_subject: displaySubject,
      depth,
      body_markdown: result.body_markdown,
      word_count: result.word_count,
      generation_model: result.model,
      user_instructions: userInstructions || null,
    })
    .select("id")
    .single();

  if (saveErr || !saved) {
    return NextResponse.json(
      { error: "save_failed", detail: saveErr?.message ?? "unknown" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "success",
    note: {
      id: saved.id,
      text_key: textKey,
      level,
      note_type: noteType,
      subject_key: subjectKey,
      display_subject: displaySubject,
      depth,
      body_markdown: result.body_markdown,
      word_count: result.word_count,
      generation_model: result.model,
    },
  });
}

// GET: list assets for a text (for UI dropdown population)
export async function GET(request: NextRequest) {
  const textKey = request.nextUrl.searchParams.get("textKey");
  const assetType = request.nextUrl.searchParams.get("assetType");
  if (!textKey) {
    return NextResponse.json({ error: "missing_textKey" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  let q = supabase
    .from("single_text_assets")
    .select("asset_type, subject_key, display_name, sort_order, meta")
    .eq("text_key", textKey)
    .order("asset_type")
    .order("sort_order");

  if (assetType) {
    q = q.eq("asset_type", assetType);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data ?? [] });
}
