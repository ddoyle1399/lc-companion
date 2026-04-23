import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { findQuestionPclm } from "@/lib/supabase/findQuestionPclm";
import { saveSampleAnswer } from "@/lib/supabase/saveSampleAnswer";
import { validateQuotes } from "@/lib/sampleAnswer/quoteValidator";
import { generateSampleAnswer } from "@/lib/claude/generateSampleAnswer";
import type { GradeTier } from "@/lib/claude/sampleAnswerPrompt";
import { getCircularYears, getPoemsForPoet } from "@/data/circulars";

const VALID_TIERS: GradeTier[] = ["H1", "H2", "H3"];

const PCLM_TARGETS: Record<GradeTier, { P: number; C: number; L: number; M: number }> = {
  H1: { P: 28, C: 27, L: 27, M: 9 },
  H2: { P: 25, C: 23, L: 23, M: 8 },
  H3: { P: 21, C: 19, L: 19, M: 7 },
  H4: { P: 17, C: 15, L: 15, M: 6 },
};

const TARGET_WORD_COUNTS: Record<GradeTier, number> = {
  H1: 1400,
  H2: 1200,
  H3: 1000,
  H4: 900,
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
  const poetKey = typeof b.poetKey === "string" ? b.poetKey : null;
  const examCycleYear = typeof b.examCycleYear === "number" ? b.examCycleYear : null;
  const selectedPoems = Array.isArray(b.selectedPoems)
    ? b.selectedPoems.filter((x): x is string => typeof x === "string")
    : null;

  if (
    !questionId ||
    !gradeTier ||
    !poetKey ||
    !VALID_TIERS.includes(gradeTier as GradeTier)
  ) {
    return NextResponse.json(
      { error: "missing_or_invalid_fields", required: ["questionId", "gradeTier (H1|H2|H3)", "poetKey"] },
      { status: 400 },
    );
  }

  if (!examCycleYear || !getCircularYears().includes(examCycleYear)) {
    return NextResponse.json(
      { error: "invalid_exam_cycle_year", valid: getCircularYears() },
      { status: 400 },
    );
  }

  if (!selectedPoems || selectedPoems.length < 3 || selectedPoems.length > 6) {
    return NextResponse.json(
      { error: "invalid_selected_poems", detail: "Must select between 3 and 6 poems" },
      { status: 400 },
    );
  }

  const prescribedPoems = getPoemsForPoet(examCycleYear, poetKey);
  const invalidPoems = selectedPoems.filter((p) => !prescribedPoems.includes(p));
  if (invalidPoems.length > 0) {
    return NextResponse.json(
      { error: "selected_poems_not_in_circular", invalid: invalidPoems },
      { status: 400 },
    );
  }

  const tier = gradeTier as GradeTier;
  const supabase = getServerSupabase();

  // Fetch the question text
  const { data: questionRow, error: questionErr } = await supabase
    .from("past_questions")
    .select("id, question_text, exam_year, subject_key")
    .eq("id", questionId)
    .single();

  if (questionErr || !questionRow) {
    return NextResponse.json({ error: "question_not_found" }, { status: 404 });
  }

  // Fetch PCLM data
  const pclmData = await findQuestionPclm(questionId);
  if (!pclmData) {
    return NextResponse.json({ error: "pclm_not_seeded" }, { status: 400 });
  }

  // Fetch verified notes only for the selected poems
  const { data: notesRows, error: notesErr } = await supabase
    .from("notes")
    .select("id, sub_key, quotes")
    .eq("subject_key", poetKey)
    .eq("content_type", "poem_notes")
    .eq("status", "verified")
    .in("sub_key", selectedPoems);

  if (notesErr) {
    return NextResponse.json({ error: "notes_fetch_failed", detail: notesErr.message }, { status: 500 });
  }

  const foundPoems = new Set((notesRows ?? []).map((r) => r.sub_key as string));
  const missingPoems = selectedPoems.filter((p) => !foundPoems.has(p));
  if (missingPoems.length > 0) {
    return NextResponse.json(
      { error: "unverified_poems_selected", missing: missingPoems },
      { status: 400 },
    );
  }

  // notes.quotes is stored as jsonb — either an array of strings (legacy) or
  // an array of objects shaped { text, line_start, line_end, stanza_index, tags }.
  // Unwrap to a flat string[] of the quote text so the generator and validator
  // (both of which expect string[]) work against either shape.
  const quoteBank: string[] = (notesRows ?? []).flatMap((row) => {
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

  // Generate
  const generationResult = await generateSampleAnswer({
    tier,
    questionText: questionRow.question_text,
    questionYear: questionRow.exam_year ?? 0,
    poet: poetKey,
    quoteBank,
    selectedPoems,
    indicativeMaterial: Array.isArray(pclmData.indicative_material)
      ? pclmData.indicative_material
      : [],
    examinerExpectation: pclmData.examiner_expectation,
    targetWordCount: TARGET_WORD_COUNTS[tier],
  });

  if (!generationResult.ok) {
    return NextResponse.json(
      { error: "generation_failed", detail: generationResult.error },
      { status: 500 },
    );
  }

  // Validate quotes
  const validatorResult = validateQuotes(
    generationResult.answer_text,
    quoteBank,
    prescribedPoems,
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

  // Save to sample_answers
  const saveResult = await saveSampleAnswer({
    questionId,
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
    selectedPoems,
  });

  if (!saveResult.ok) {
    return NextResponse.json(
      { error: "save_failed", detail: saveResult.error },
      { status: 500 },
    );
  }

  // Fetch and return the full saved row
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

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : null;
  const reviewerNotes = typeof b.reviewerNotes === "string" ? b.reviewerNotes : null;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("sample_answers")
    .update({ approved: true, reviewer_notes: reviewerNotes })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "approve_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "approved" });
}
