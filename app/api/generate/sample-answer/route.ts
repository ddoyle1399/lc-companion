import { NextRequest, NextResponse } from "next/server";
import { findOutlineById } from "@/lib/supabase/findOutlineById";
import { findQuestionPclm } from "@/lib/supabase/findQuestionPclm";
import { saveSampleAnswer } from "@/lib/supabase/saveSampleAnswer";
import { isPoemVerified } from "@/lib/sampleAnswer/poemWhitelist";
import { validateQuotes } from "@/lib/sampleAnswer/quoteValidator";
import { generateSampleAnswer } from "@/lib/claude/generateSampleAnswer";

const PCLM_TARGETS = {
  H1: { P: 28, C: 27, L: 27, M: 9 },
  H4: { P: 20, C: 19, L: 18, M: 8 },
} as const;

const TARGET_WORD_COUNTS = {
  H1: 1200,
  H4: 900,
} as const;

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).outlineId !== "string" ||
    ((body as Record<string, unknown>).tier !== "H1" &&
      (body as Record<string, unknown>).tier !== "H4")
  ) {
    return NextResponse.json(
      { error: "missing_or_invalid_fields", required: ["outlineId", "tier (H1|H4)"] },
      { status: 400 },
    );
  }

  const { outlineId, tier } = body as { outlineId: string; tier: "H1" | "H4" };

  const outline = await findOutlineById(outlineId);
  if (!outline) {
    return NextResponse.json({ error: "outline_not_found" }, { status: 404 });
  }

  if (!isPoemVerified(outline.note.subject_key, outline.note.sub_key)) {
    return NextResponse.json({ error: "poem_not_verified" }, { status: 400 });
  }

  const pclmData = await findQuestionPclm(outline.question_id);
  if (!pclmData) {
    return NextResponse.json({ error: "pclm_not_seeded" }, { status: 400 });
  }

  const rawQuotes = outline.note.quotes;
  const quoteBank: string[] =
    Array.isArray(rawQuotes) && rawQuotes.every((q) => typeof q === "string")
      ? (rawQuotes as string[])
      : [];

  if (quoteBank.length < 10) {
    return NextResponse.json(
      { error: "quote_bank_too_thin", count: quoteBank.length },
      { status: 422 },
    );
  }

  const generationResult = await generateSampleAnswer({
    tier,
    questionText: outline.question.question_text,
    questionYear: outline.question.exam_year ?? 0,
    poet: outline.question.subject_key,
    poem: outline.note.sub_key ?? "",
    outline: {
      thesis_line: outline.thesis_line,
      body_moves: outline.body_moves,
      closing_move: outline.closing_move,
      examiner_note: outline.examiner_note,
    },
    quoteBank,
    indicativeMaterial: pclmData.indicative_material,
    examinerExpectation: pclmData.examiner_expectation,
    targetWordCount: TARGET_WORD_COUNTS[tier],
  });

  if (!generationResult.ok) {
    return NextResponse.json(
      { error: "generation_failed", detail: generationResult.error },
      { status: 500 },
    );
  }

  const validatorResult = validateQuotes(generationResult.answer_text, quoteBank);
  if (!validatorResult.passed) {
    return NextResponse.json(
      {
        error: "validator_failed",
        flagged_strings: validatorResult.flagged_strings,
        matched_quotes: validatorResult.matched_quotes,
      },
      { status: 422 },
    );
  }

  const saveResult = await saveSampleAnswer({
    outlineId,
    questionId: outline.question_id,
    noteId: outline.note_id,
    tier,
    questionType: "poetry",
    markCap: 50,
    markingMode: "discrete",
    pclmTarget: PCLM_TARGETS[tier],
    answerText: generationResult.answer_text,
    wordCount: generationResult.word_count,
    quotesUsed: validatorResult.matched_quotes,
    validatorResult,
    model: generationResult.model,
  });

  if (!saveResult.ok) {
    return NextResponse.json(
      { error: "save_failed", detail: saveResult.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    sampleAnswerId: saveResult.sampleAnswerId,
    tier,
    word_count: generationResult.word_count,
    model: generationResult.model,
    validator_result: validatorResult,
  });
}
