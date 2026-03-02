import { NextRequest } from "next/server";
import { getClient } from "@/lib/claude/client";
import { buildSystemPrompt, buildPoetryNotePrompt, PromptContext } from "@/lib/claude/prompts";
import { buildPoetExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";

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

    // For poetry generation, inject exam data and prescribed poem list
    if (contentType === "poetry" && poet) {
      // Look up past questions and exam angles for this poet
      context.examSummary = buildPoetExamSummary(poet);

      // Look up the prescribed poem list for this poet/year/level
      const prescribedPoems = level === "HL"
        ? getPoemsForPoet(year, poet)
        : getOLPoemsForPoet(year, poet);
      context.prescribedPoems = prescribedPoems;
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

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Create a ReadableStream that sends text chunks
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
