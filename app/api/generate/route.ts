import { NextRequest } from "next/server";
import { getClient } from "@/lib/claude/client";
import { buildSystemPrompt, buildPoetryNotePrompt, PromptContext } from "@/lib/claude/prompts";
import { buildPoetExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year,
      circular,
      level,
      contentType,
      poet,
      poem,
      userInstructions,
    } = body;

    if (!year || !level || !contentType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: year, level, contentType" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const context: PromptContext = {
      year,
      circular: circular || "0016/2024",
      level,
      contentType,
      poet,
      poem,
      userInstructions,
    };

    // For poetry generation, inject exam data, prescribed poem list, and stored poem text
    if (contentType === "poetry" && poet) {
      context.examSummary = buildPoetExamSummary(poet);

      const prescribedPoems = level === "HL"
        ? getPoemsForPoet(year, poet)
        : getOLPoemsForPoet(year, poet);
      context.prescribedPoems = prescribedPoems;

      // Check if we have the poem text stored locally
      if (poem) {
        const storedText = await getPoemText(poet, poem);
        if (storedText) {
          context.poemText = storedText;
        }
      }
    }

    const systemPrompt = buildSystemPrompt(context);

    let userPrompt: string;
    switch (contentType) {
      case "poetry":
        if (!poet || !poem) {
          return new Response(
            JSON.stringify({ error: "Poetry notes require poet and poem" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        userPrompt = buildPoetryNotePrompt(context);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Content type "${contentType}" is not yet supported` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const client = getClient();

    // Use web search for poetry when we don't have stored poem text
    const useWebSearch = contentType === "poetry" && !context.poemText;

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
                max_uses: 3,
              },
            ],
          }
        : {}),
    });

    // Create a ReadableStream that sends text chunks and search status
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
            // Send a status update when web search starts
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
    return new Response(
      JSON.stringify({ error: "Failed to generate content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
