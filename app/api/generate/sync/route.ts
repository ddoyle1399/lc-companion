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
} from "@/lib/claude/prompts";
import { buildPoetExamSummary, buildComparativeExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";
import { saveNote } from "@/lib/supabase/saveNote";
import { mapPromptContextToNoteInput } from "@/lib/supabase/mapPromptContextToNoteInput";
import { extractQuotesAndThemes } from "@/lib/claude/extractQuotesAndThemes";

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
      } else {
        saveError = saveResult.error;
      }
    } catch (saveErr) {
      saveError = saveErr instanceof Error ? saveErr.message : "Save mapping failed";
      console.error("[sync/generate] save error:", saveErr);
    }

    return new Response(
      JSON.stringify({ content, contentType, noteId, saveError, extraction }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync generate error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return errorResponse(message, 500);
  }
}
