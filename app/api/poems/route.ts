import { NextRequest } from "next/server";
import {
  getPoemText,
  savePoemText,
  deletePoemText,
  getStoredStatusBatch,
} from "@/lib/poems/store";

/**
 * GET /api/poems?poet=...&poem=...
 * Returns the stored text for a specific poem.
 *
 * GET /api/poems?batch=true&poems=[{poet,poem},...]
 * Returns stored status for a batch of poems.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Batch status check
  if (searchParams.get("batch") === "true") {
    const poemsParam = searchParams.get("poems");
    if (!poemsParam) {
      return new Response(
        JSON.stringify({ error: "Missing poems parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    try {
      const poems = JSON.parse(poemsParam) as {
        poet: string;
        poem: string;
      }[];
      const status = await getStoredStatusBatch(poems);
      return new Response(JSON.stringify({ status }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid poems parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Single poem text retrieval
  const poet = searchParams.get("poet");
  const poem = searchParams.get("poem");

  if (!poet || !poem) {
    return new Response(
      JSON.stringify({ error: "Missing poet or poem parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const text = await getPoemText(poet, poem);
  return new Response(JSON.stringify({ poet, poem, text }), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/poems
 * Save poem text. Body: { poet, poem, text }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poet, poem, text } = body;

    if (!poet || !poem || !text) {
      return new Response(
        JSON.stringify({ error: "Missing poet, poem, or text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await savePoemText(poet, poem, text);
    return new Response(
      JSON.stringify({ success: true, poet, poem }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to save poem text" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/poems?poet=...&poem=...
 * Delete stored poem text.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const poet = searchParams.get("poet");
  const poem = searchParams.get("poem");

  if (!poet || !poem) {
    return new Response(
      JSON.stringify({ error: "Missing poet or poem parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await deletePoemText(poet, poem);
  return new Response(
    JSON.stringify({ success: true, poet, poem }),
    { headers: { "Content-Type": "application/json" } }
  );
}
