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
import { generateOutline, type OutlineSuccess } from "@/lib/claude/generateOutline";
import { findMatchingQuestions } from "@/lib/supabase/findMatchingQuestions";
import { saveOutlines } from "@/lib/supabase/saveOutlines";
import { runWithConcurrency } from "@/lib/util/concurrency";

// Strips [VERIFY], [CHECK], [TODO], [NOTE] and similar bracketed internal markers
// from streamed text, handling markers that may span chunk boundaries.
function createVerifyStripper(poem?: string) {
  let buffer = "";
  const PATTERN = /\[(?:VERIFY|CHECK|TODO|NOTE)[^\]]*\]/gi;
  const MAX_LOOKAHEAD = 60;

  function process(incoming: string, flush = false): string {
    buffer += incoming;

    if (flush) {
      const cleaned = buffer.replace(PATTERN, (match) => {
        console.warn(
          `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
        );
        return "";
      });
      buffer = "";
      return cleaned;
    }

    const lastOpen = buffer.lastIndexOf("[");
    if (lastOpen === -1 || buffer.length - lastOpen > MAX_LOOKAHEAD) {
      const safe = lastOpen === -1 ? buffer : buffer.slice(0, lastOpen);
      const hold = lastOpen === -1 ? "" : buffer.slice(lastOpen);
      const cleaned = safe.replace(PATTERN, (match) => {
        console.warn(
          `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
        );
        return "";
      });
      buffer = hold;
      return cleaned;
    }

    const safe = buffer.slice(0, lastOpen);
    buffer = buffer.slice(lastOpen);
    return safe.replace(PATTERN, (match) => {
      console.warn(
        `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
      );
      return "";
    });
  }

  return { process };
}

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
        const { poet, poem, textbookAnalysis } = body;
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

        if (textbookAnalysis) {
          context.textbookAnalysis = textbookAnalysis;
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

    const stream = await client.messages.stream({
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

    const encoder = new TextEncoder();
    const stripper = createVerifyStripper(context.poem ?? context.textTitle);
    const readableStream = new ReadableStream({
      async start(controller) {
        let accumulatedText = "";

        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const cleaned = stripper.process(event.delta.text);
              if (cleaned) {
                accumulatedText += cleaned;
                const chunk = `data: ${JSON.stringify({ text: cleaned })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            }
            if (
              event.type === "content_block_start" &&
              event.content_block.type === "server_tool_use" &&
              event.content_block.name === "web_search"
            ) {
              const status = `data: ${JSON.stringify({ status: "searching" })}\n\n`;
              controller.enqueue(encoder.encode(status));
            }
          }

          const tail = stripper.process("", true);
          if (tail) {
            accumulatedText += tail;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: tail })}\n\n`));
          }

          // Stream completed cleanly. Extract quotes/themes, generate outlines, then persist.
          if (accumulatedText) {
            try {
              const bodyText = accumulatedText;

              // Run extraction before save. Never blocks the user's note display.
              const extractionResult = await extractQuotesAndThemes(bodyText);
              const quotes = extractionResult.ok ? extractionResult.quotes : null;
              const themes = extractionResult.ok ? extractionResult.themes : null;

              if (!extractionResult.ok) {
                console.error("[generate] extraction failed:", extractionResult.error);
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    extraction: {
                      ok: extractionResult.ok,
                      quotesCount: quotes?.length ?? 0,
                      themesCount: themes?.length ?? 0,
                      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
                    },
                  })}\n\n`
                )
              );

              // Generate outlines for every matching past question.
              let pendingOutlines: Array<{ questionId: string; outline: OutlineSuccess }> = [];
              const subjectKey = context.poet ?? context.textTitle ?? context.comparativeMode ?? null;
              const level: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

              if (subjectKey) {
                const matches = await findMatchingQuestions({ subjectKey, level });

                if (matches.length === 0) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        outlines: { ok: true, matched: 0, generated: 0, failed: 0, note: "no_past_questions" },
                      })}\n\n`
                    )
                  );
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
                      noteBody: bodyText,
                      noteQuotes: outlineQuotes,
                      noteThemes: outlineThemes,
                    });
                    return { questionId: q.id, outline };
                  });

                  pendingOutlines = results.filter(
                    (r): r is { questionId: string; outline: OutlineSuccess } => r.outline.ok
                  );

                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        outlines: {
                          ok: true,
                          matched: matches.length,
                          generated: pendingOutlines.length,
                          failed: results.length - pendingOutlines.length,
                        },
                      })}\n\n`
                    )
                  );
                }
              } else {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      outlines: { ok: true, matched: 0, generated: 0, failed: 0, note: "no_subject_key" },
                    })}\n\n`
                  )
                );
              }

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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ save: saveResult })}\n\n`)
              );

              // Save outlines only once we have a noteId.
              if (saveResult.ok && pendingOutlines.length > 0) {
                const outlinesResult = await saveOutlines({
                  noteId: saveResult.noteId,
                  outlines: pendingOutlines,
                });
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ outlinesSave: outlinesResult })}\n\n`)
                );
              }
            } catch (saveErr) {
              const errMsg = saveErr instanceof Error ? saveErr.message : "Save failed";
              console.error("[generate] save error:", saveErr);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ save: { ok: false, error: errMsg } })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return errorResponse("Failed to generate content", 500);
  }
}
