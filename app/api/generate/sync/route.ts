import { NextRequest } from "next/server";
import { marked } from "marked";
import { getClient } from "@/lib/claude/client";
import {
  buildSystemPrompt,
  buildPoetryNotePrompt,
  buildComparativePrompt,
  buildWorksheetPrompt,
  buildSlidesPrompt,
  buildSingleTextPrompt,
  buildUnseenPoetryPrompt,
  buildComprehensionPrompt,
  buildCompositionPrompt,
  PromptContext,
  type PoemMetadata,
  type PoemQuote,
} from "@/lib/claude/prompts";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildPoetExamSummary, buildComparativeExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";
import { saveNote } from "@/lib/supabase/saveNote";
import { mapPromptContextToNoteInput } from "@/lib/supabase/mapPromptContextToNoteInput";
import { extractQuotesAndThemes } from "@/lib/claude/extractQuotesAndThemes";
import { generateOutline, type OutlineSuccess } from "@/lib/claude/generateOutline";
import { findMatchingQuestions } from "@/lib/supabase/findMatchingQuestions";
import { saveOutlines } from "@/lib/supabase/saveOutlines";
import { runWithConcurrency } from "@/lib/util/concurrency";

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, circular, level, contentType, userInstructions } = body;

    if (!year || !level || !contentType) {
      return errorResponse("Missing required fields: year, level, contentType");
    }

    const context: PromptContext = {
      year,
      circular: circular || "0016/2024",
      level,
      contentType,
      userInstructions,
    };

    let userPrompt: string;
    let useWebSearch = false;
    let webSearchMaxUses = 3;

    switch (contentType) {
      case "poetry": {
        const { poet, poem } = body;
        if (!poet || !poem) {
          return errorResponse("Poetry notes require poet and poem");
        }
        context.poet = poet;
        context.poem = poem;
        context.examSummary = buildPoetExamSummary(poet);

        const prescribedPoems = level === "HL"
          ? getPoemsForPoet(year, poet)
          : getOLPoemsForPoet(year, poet);
        context.prescribedPoems = prescribedPoems;

        if (poem) {
          const storedText = await getPoemText(poet, poem);
          if (storedText) {
            context.poemText = storedText;
          }
        }

        try {
          const supabase = getServerSupabase();
          const { data: verifiedNote } = await supabase
            .from("notes")
            .select("metadata, quotes")
            .eq("content_type", "poetry")
            .eq("subject_key", poet)
            .eq("sub_key", poem)
            .eq("status", "verified")
            .limit(1)
            .maybeSingle();

          if (verifiedNote?.metadata) {
            const m = verifiedNote.metadata as Record<string, unknown>;
            context.poemMetadata = {
              total_lines: m.total_lines as PoemMetadata["total_lines"],
              stanza_breaks: m.stanza_breaks as PoemMetadata["stanza_breaks"],
              section_breaks: m.section_breaks as PoemMetadata["section_breaks"],
              form: m.form as PoemMetadata["form"],
              structure_confidence: m.structure_confidence as PoemMetadata["structure_confidence"],
              quote_text_anchored: m.quote_text_anchored as PoemMetadata["quote_text_anchored"],
            };
          }

          if (verifiedNote?.quotes) {
            context.structuredQuotes = verifiedNote.quotes as Array<string | PoemQuote>;
          }
        } catch (err) {
          console.warn("[poetry-debug] sync metadata lookup failed", err);
        }

        useWebSearch = !context.poemText;
        userPrompt = buildPoetryNotePrompt(context);
        break;
      }

      case "comparative": {
        const { comparativeMode, comparativeTexts } = body;
        if (!comparativeMode || !comparativeTexts || comparativeTexts.length !== 3) {
          return errorResponse("Comparative notes require a mode and exactly 3 texts");
        }
        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;
        context.comparativeExamPattern = buildComparativeExamSummary(comparativeMode);

        useWebSearch = true;
        webSearchMaxUses = 5;
        userPrompt = buildComparativePrompt(context);
        break;
      }

      case "worksheet": {
        const { worksheetContentType, activityTypes, poet, poem, author, textTitle, comparativeMode, comparativeTexts } = body;
        context.worksheetContentType = worksheetContentType;
        context.activityTypes = activityTypes;
        context.poet = poet;
        context.poem = poem;
        context.author = author;
        context.textTitle = textTitle;
        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;

        useWebSearch = true;
        userPrompt = buildWorksheetPrompt(context);
        break;
      }

      case "slides": {
        const { slidesContentType, poet, poem, author, textTitle, comparativeMode, comparativeTexts } = body;
        context.slidesContentType = slidesContentType;
        context.poet = poet;
        context.poem = poem;
        context.author = author;
        context.textTitle = textTitle;
        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;

        useWebSearch = true;
        userPrompt = buildSlidesPrompt(context);
        break;
      }

      case "single_text": {
        const { author, textTitle, textType } = body;
        if (!author || !textTitle) {
          return errorResponse("Single text notes require author and textTitle");
        }
        context.author = author;
        context.textTitle = textTitle;
        context.textType = textType;

        useWebSearch = true;
        webSearchMaxUses = 5;
        userPrompt = buildSingleTextPrompt(context);
        break;
      }

      case "unseen_poetry": {
        useWebSearch = false;
        userPrompt = buildUnseenPoetryPrompt(context);
        break;
      }

      case "comprehension": {
        const { focusArea } = body;
        context.focusArea = focusArea || "both";

        useWebSearch = false;
        userPrompt = buildComprehensionPrompt(context);
        break;
      }

      case "composition": {
        const { compositionType } = body;
        if (!compositionType) {
          return errorResponse("Composition notes require a compositionType");
        }
        context.compositionType = compositionType;

        useWebSearch = false;
        userPrompt = buildCompositionPrompt(context);
        break;
      }

      default:
        return errorResponse(`Content type "${contentType}" is not supported`);
    }

    const systemPrompt = buildSystemPrompt(context);
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      ...(useWebSearch
        ? {
            tools: [
              {
                type: "web_search_20250305" as const,
                name: "web_search" as const,
                max_uses: webSearchMaxUses,
              },
            ],
          }
        : {}),
    });

    // Collect all text blocks (web search may produce multiple)
    const VERIFY_PATTERN = /\[(?:VERIFY|CHECK|TODO|NOTE)[^\]]*\]/gi;
    const content = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text.replace(VERIFY_PATTERN, ""))
      .join("\n\n")
      .trim();

    if (!content) {
      return errorResponse("No text content in Claude response", 500);
    }

    let noteId: string | undefined;
    let saveError: string | undefined;
    let extraction: { ok: boolean; quotesCount: number; themesCount: number; error?: string };
    let outlines: { ok: boolean; matched: number; generated: number; failed: number; note?: string };
    let outlinesSave: { ok: boolean; inserted: number; error?: string } | undefined;

    // Run extraction before save.
    const extractionResult = await extractQuotesAndThemes(content);
    const quotes = extractionResult.ok ? extractionResult.quotes : null;
    const themes = extractionResult.ok ? extractionResult.themes : null;

    if (!extractionResult.ok) {
      console.error("[sync/generate] extraction failed:", extractionResult.error);
    }

    extraction = {
      ok: extractionResult.ok,
      quotesCount: quotes?.length ?? 0,
      themesCount: themes?.length ?? 0,
      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
    };

    // Generate outlines for every matching past question.
    let pendingOutlines: Array<{ questionId: string; outline: OutlineSuccess }> = [];
    const subjectKey = context.poet ?? context.textTitle ?? context.comparativeMode ?? null;
    const outlineLevel: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

    if (subjectKey) {
      const matches = await findMatchingQuestions({ subjectKey, level: outlineLevel });

      if (matches.length === 0) {
        outlines = { ok: true, matched: 0, generated: 0, failed: 0, note: "no_past_questions" };
      } else {
        const outlineQuotes = extractionResult.ok ? extractionResult.quotes : [];
        const outlineThemes = extractionResult.ok ? extractionResult.themes : [];

        const results = await runWithConcurrency(matches, 3, async (q) => {
          const outline = await generateOutline({
            questionId: q.id,
            questionText: q.question_text,
            questionYear: q.exam_year,
            questionPaper: q.paper,
            questionLevel: q.level,
            questionSection: q.section,
            poet: context.poet ?? subjectKey,
            poem: context.poem ?? null,
            noteBody: content,
            noteQuotes: outlineQuotes,
            noteThemes: outlineThemes,
          });
          return { questionId: q.id, outline };
        });

        pendingOutlines = results.filter(
          (r): r is { questionId: string; outline: OutlineSuccess } => r.outline.ok
        );

        outlines = {
          ok: true,
          matched: matches.length,
          generated: pendingOutlines.length,
          failed: results.length - pendingOutlines.length,
        };
      }
    } else {
      outlines = { ok: true, matched: 0, generated: 0, failed: 0, note: "no_subject_key" };
    }

    try {
      const bodyText = content;
      const bodyHtml = marked.parse(bodyText) as string;
      const noteInput = mapPromptContextToNoteInput(
        context,
        bodyHtml,
        bodyText,
        "claude-sonnet-4-20250514",
        quotes,
        themes
      );
      const saveResult = await saveNote(noteInput);
      if (saveResult.ok) {
        noteId = saveResult.noteId;

        // Save outlines once we have a noteId.
        if (pendingOutlines.length > 0) {
          const outlinesResult = await saveOutlines({
            noteId: saveResult.noteId,
            outlines: pendingOutlines,
          });
          outlinesSave = outlinesResult;
        }
      } else {
        saveError = saveResult.error;
      }
    } catch (saveErr) {
      saveError = saveErr instanceof Error ? saveErr.message : "Save mapping failed";
      console.error("[sync/generate] save error:", saveErr);
    }

    return new Response(
      JSON.stringify({ content, contentType, noteId, saveError, extraction, outlines, outlinesSave }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync generate error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return errorResponse(message, 500);
  }
}
