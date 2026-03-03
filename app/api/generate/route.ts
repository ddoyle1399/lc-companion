import { NextRequest } from "next/server";
import { getClient } from "@/lib/claude/client";
import {
  buildSystemPrompt,
  buildPoetryNotePrompt,
  buildComparativePrompt,
  buildWorksheetPrompt,
  buildSlidesPrompt,
  PromptContext,
} from "@/lib/claude/prompts";
import { buildPoetExamSummary, buildComparativeExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";

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
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
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
