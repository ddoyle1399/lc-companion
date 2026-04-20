import { NextRequest } from "next/server";
import { marked } from "marked";
import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/claude/client";
import {
  buildSystemPrompt,
  buildPoetryNotePrompt,
  buildComparativePrompt,
  buildWorksheetPrompt,
  buildCriticInput,
  type PoemMetadata,
  type PoemQuote,
  buildSlidesPrompt,
  buildSingleTextPrompt,
  buildUnseenPoetryPrompt,
  buildComprehensionPrompt,
  buildCompositionPrompt,
  PromptContext,
} from "@/lib/claude/prompts";
import { runCriticPass } from "@/lib/claude/critic";
import { buildPoetExamSummary, buildComparativeExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";
import { saveNote } from "@/lib/supabase/saveNote";
import { mapPromptContextToNoteInput } from "@/lib/supabase/mapPromptContextToNoteInput";
import { getServerSupabase } from "@/lib/supabase/server";
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
    let poetrySystemOverride: string | undefined;
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

        // Read metadata and quotes from the most recent saved note for this poem.
        // These are set manually or by the extraction pipeline after first generation.
        try {
          const supabase = getServerSupabase();
          const { data: existingNote, error: noteError } = await supabase
            .from("notes")
            .select("id, status, content_type, subject_key, sub_key, metadata, quotes")
            .eq("content_type", "poem_notes")
            .eq("subject_key", poet)
            .eq("sub_key", poem)
            .eq("status", "verified")
            .limit(1)
            .maybeSingle();

          console.log("[poetry-debug-query]", {
            poet,
            poem,
            error: noteError?.message ?? null,
            rowFound: !!existingNote,
            rowId: existingNote?.id ?? null,
            rowStatus: existingNote?.status ?? null,
          });

          // If verified query found nothing, log all rows for this poem to diagnose
          if (!existingNote) {
            const { data: allRows } = await supabase
              .from("notes")
              .select("id, status, content_type, subject_key, sub_key")
              .eq("subject_key", poet)
              .eq("sub_key", poem)
              .limit(5);
            console.log("[poetry-debug-allrows]", allRows ?? []);
          }

          if (existingNote?.metadata) {
            const m = existingNote.metadata as Record<string, unknown>;
            context.poemMetadata = {
              total_lines: m.total_lines as PoemMetadata["total_lines"],
              stanza_breaks: m.stanza_breaks as PoemMetadata["stanza_breaks"],
              section_breaks: m.section_breaks as PoemMetadata["section_breaks"],
              form: m.form as PoemMetadata["form"],
              structure_confidence: m.structure_confidence as PoemMetadata["structure_confidence"],
              quote_text_anchored: m.quote_text_anchored as PoemMetadata["quote_text_anchored"],
              edition_source: m.edition_source as PoemMetadata["edition_source"],
              historical_context: m.historical_context as PoemMetadata["historical_context"],
              named_figures: m.named_figures as PoemMetadata["named_figures"],
              textual_variants: m.textual_variants as PoemMetadata["textual_variants"],
            };
          }

          if (existingNote?.quotes) {
            context.structuredQuotes = existingNote.quotes as Array<string | PoemQuote>;
          }

          const { data: siblings } = await supabase
            .from("notes")
            .select("sub_key, metadata")
            .eq("content_type", "poem_notes")
            .eq("subject_key", poet)
            .eq("status", "verified")
            .neq("sub_key", poem);

          const studentYearStr = String(year);
          context.availablePairings = (siblings ?? [])
            .filter((s) => {
              const years = (s.metadata as Record<string, unknown>)?.selection_years as string[] ?? [];
              return years.length === 0 || years.includes(studentYearStr);
            })
            .map((s) => ({
              subject_key: poet,
              sub_key: s.sub_key as string,
              one_line_summary: (s.metadata as Record<string, unknown>)?.one_line_summary as string | undefined,
            }));
        } catch (err) {
          console.warn("[poetry-debug] metadata lookup failed, continuing without it", err);
        }

        context.studentYear = String(year) as '2026' | '2027';

        console.log("[poetry-debug]", {
          hasMetadata: !!context.poemMetadata,
          conf: context.poemMetadata?.structure_confidence,
          quoteCount: context.structuredQuotes?.length ?? 0,
          pairingCount: context.availablePairings?.length ?? 0,
        });

        useWebSearch = !context.poemText;
        {
          const poetryCtx: PromptContext = {
            ...context,
            subject: poet,
            subKey: poem,
            metadata: context.poemMetadata,
            quotes: context.structuredQuotes?.filter((q): q is PoemQuote => typeof q !== 'string'),
          };
          const { system: pSystem, user: pUser } = buildPoetryNotePrompt(poetryCtx);
          poetrySystemOverride = pSystem;
          userPrompt = pUser;
        }
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

    const systemPrompt = poetrySystemOverride ?? buildSystemPrompt(context);
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

          // Critic pass (poetry strict-mode only — flags emitted as SSE event, no retry since text already streamed).
          if (accumulatedText && context.contentType === "poetry" && poetrySystemOverride) {
            try {
              const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
              const criticInput = buildCriticInput(accumulatedText, context);
              const criticResult = await runCriticPass(anthropic, criticInput);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    critic: {
                      status: criticResult.blockFlags.length > 0 ? 'block' : criticResult.warnFlags.length > 0 ? 'warn' : 'clean',
                      blockFlags: criticResult.blockFlags,
                      warnFlags: criticResult.warnFlags,
                    },
                  })}\n\n`
                )
              );
            } catch (criticErr) {
              console.error("[generate] critic pass failed:", criticErr);
            }
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
              const outlineLevel: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

              if (subjectKey) {
                const matches = await findMatchingQuestions({ subjectKey, level: outlineLevel });

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
