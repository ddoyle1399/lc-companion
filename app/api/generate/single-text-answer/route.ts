import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { findQuestionPclm } from "@/lib/supabase/findQuestionPclm";
import { saveSampleAnswer } from "@/lib/supabase/saveSampleAnswer";
import { validateQuotes } from "@/lib/sampleAnswer/quoteValidator";
import { generateSingleTextAnswer } from "@/lib/claude/generateSingleTextAnswer";
import type { GradeTier } from "@/lib/claude/singleTextAnswerPrompt";
import { rollPclm } from "@/lib/sampleAnswer/rollPclm";

const VALID_TIERS: GradeTier[] = ["H1", "H2", "H3"];

const SINGLE_TEXT_MARK_CAP = 60;

const TARGET_WORD_COUNTS: Record<GradeTier, number> = {
  H1: 1400,
  H2: 1200,
  H3: 1000,
  H4: 900,
};

// Shakespeare plays we currently support. Author derived from textKey.
const SUPPORTED_TEXTS: Record<string, { author: string }> = {
  Macbeth: { author: "William Shakespeare" },
  Othello: { author: "William Shakespeare" },
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const questionId = typeof b.questionId === "string" ? b.questionId : null;
  const gradeTier = typeof b.gradeTier === "string" ? b.gradeTier : null;
  const textKey = typeof b.textKey === "string" ? b.textKey : null;

  if (
    !questionId ||
    !gradeTier ||
    !textKey ||
    !VALID_TIERS.includes(gradeTier as GradeTier)
  ) {
    return NextResponse.json(
      {
        error: "missing_or_invalid_fields",
        required: ["questionId", "gradeTier (H1|H2|H3)", "textKey"],
      },
      { status: 400 },
    );
  }

  if (!SUPPORTED_TEXTS[textKey]) {
    return NextResponse.json(
      { error: "unsupported_text", supported: Object.keys(SUPPORTED_TEXTS) },
      { status: 400 },
    );
  }

  const tier = gradeTier as GradeTier;
  const supabase = getServerSupabase();

  // Fetch the question text
  const { data: questionRow, error: questionErr } = await supabase
    .from("past_questions")
    .select("id, question_text, exam_year, subject_key, section")
    .eq("id", questionId)
    .single();

  if (questionErr || !questionRow) {
    return NextResponse.json({ error: "question_not_found" }, { status: 404 });
  }

  if (questionRow.section !== "single_text") {
    return NextResponse.json(
      { error: "wrong_section", detail: `Question is ${questionRow.section}, not single_text` },
      { status: 400 },
    );
  }

  if (questionRow.subject_key !== textKey) {
    return NextResponse.json(
      {
        error: "text_mismatch",
        detail: `Question is for "${questionRow.subject_key}" but textKey is "${textKey}"`,
      },
      { status: 400 },
    );
  }

  // PCLM is optional for single text (no marking schemes seeded yet). Use if
  // available, fall back to empty.
  const pclmData = await findQuestionPclm(questionId);

  // Fetch the verified quote bank for this text
  const { data: notesRows, error: notesErr } = await supabase
    .from("notes")
    .select("id, quotes")
    .eq("content_type", "single_text_notes")
    .eq("subject_key", textKey)
    .eq("status", "verified");

  if (notesErr) {
    return NextResponse.json(
      { error: "notes_fetch_failed", detail: notesErr.message },
      { status: 500 },
    );
  }

  if (!notesRows || notesRows.length === 0) {
    return NextResponse.json(
      { error: "no_verified_bank", detail: `No verified quote bank for ${textKey}` },
      { status: 400 },
    );
  }

  // Unwrap .text from jsonb object quotes. Pass the full bank to the model
  // and let the question drive which quotes matter.
  const allQuotes = notesRows.flatMap((row) => {
    const q = row.quotes;
    if (!Array.isArray(q)) return [];
    return q as Array<{ text?: string }>;
  });

  const quoteBank: string[] = allQuotes
    .map((q) => q.text)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  if (quoteBank.length < 10) {
    return NextResponse.json(
      { error: "quote_bank_too_thin", count: quoteBank.length },
      { status: 400 },
    );
  }

  // Generate
  const generationResult = await generateSingleTextAnswer({
    tier,
    questionText: questionRow.question_text,
    questionYear: questionRow.exam_year ?? 0,
    textKey,
    author: SUPPORTED_TEXTS[textKey].author,
    quoteBank,
    indicativeMaterial:
      pclmData && Array.isArray(pclmData.indicative_material)
        ? pclmData.indicative_material
        : [],
    examinerExpectation: pclmData?.examiner_expectation ?? "",
    targetWordCount: TARGET_WORD_COUNTS[tier],
  });

  if (!generationResult.ok) {
    return NextResponse.json(
      { error: "generation_failed", detail: generationResult.error },
      { status: 500 },
    );
  }

  // Validate quotes. Pass the text title as a "known title" so references to
  // the play name don't trip the validator, and the question text so echoes
  // of the prompt don't trip either.
  const validatorResult = validateQuotes(
    generationResult.answer_text,
    quoteBank,
    [textKey],
    questionRow.question_text ?? "",
  );

  if (!validatorResult.passed) {
    return NextResponse.json(
      {
        status: "validation_failed",
        failures: validatorResult.flagged_strings.map((quote) => ({
          quote,
          reason: "not in bank",
        })),
        rawAnswer: generationResult.answer_text,
      },
      { status: 422 },
    );
  }

  const saveResult = await saveSampleAnswer({
    questionId,
    tier,
    questionType: "single_text",
    markCap: SINGLE_TEXT_MARK_CAP,
    markingMode: "discrete",
    pclmTarget: rollPclm(tier, SINGLE_TEXT_MARK_CAP),
    answerText: generationResult.answer_text,
    wordCount: generationResult.word_count,
    quotesUsed: validatorResult.matched_quotes,
    validatorResult,
    model: generationResult.model,
    selectedPoems: [],
  });

  if (!saveResult.ok) {
    return NextResponse.json(
      { error: "save_failed", detail: saveResult.error },
      { status: 500 },
    );
  }

  const { data: savedRow } = await supabase
    .from("sample_answers")
    .select("*")
    .eq("id", saveResult.sampleAnswerId)
    .single();

  return NextResponse.json({
    status: "success",
    sampleAnswer: savedRow,
  });
}
