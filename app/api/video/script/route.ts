import { NextRequest } from "next/server";
import { generateVideoScript } from "@/lib/video/script-formatter";

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poet, poem, poemText, poetryNote, year, level } = body;

    if (!poet || !poem || !poemText || !poetryNote) {
      return errorResponse(
        "Missing required fields: poet, poem, poemText, poetryNote"
      );
    }

    if (!year || !level) {
      return errorResponse("Missing required fields: year, level");
    }

    const script = await generateVideoScript(
      poet,
      poem,
      poemText,
      poetryNote,
      year,
      level
    );

    return new Response(JSON.stringify({ script, warnings: script.warnings || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate script";
    return errorResponse(message, 500);
  }
}
