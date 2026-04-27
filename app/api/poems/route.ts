import { NextRequest } from "next/server";
import {
  getPoemText,
  savePoemText,
  deletePoemText,
  getStoredStatusBatch,
} from "@/lib/poems/store";
import { extractBank } from "@/lib/poems/extractBank";
import { upsertVerifiedPoemNote } from "@/lib/poems/upsertNote";

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
 * Save poem text AND auto-extract a verified quote bank into the notes table.
 * Body: { poet, poem, text, selectionYears?: string[], skipBank?: boolean }
 *
 * Response shape:
 *   { success: true, poet, poem, bank: { ok: true, quoteCount, insertedId, supersededIds } }
 *   { success: true, poet, poem, bank: { ok: false, error } }   // text saved, bank failed
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const poet = typeof body.poet === "string" ? body.poet : null;
  const poem = typeof body.poem === "string" ? body.poem : null;
  const text = typeof body.text === "string" ? body.text : null;
  const selectionYears = Array.isArray(body.selectionYears)
    ? (body.selectionYears as string[]).filter((y) => typeof y === "string")
    : ["2026"];
  const skipBank = body.skipBank === true;

  if (!poet || !poem || !text) {
    return new Response(
      JSON.stringify({ error: "Missing poet, poem, or text" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Step 1 — always save the source text. If this fails we abort everything.
  try {
    await savePoemText(poet, poem, text);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "save_text_failed",
        detail: err instanceof Error ? err.message : "unknown",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Step 2 — auto-extract verified quote bank and upsert into notes.
  // Failure here does NOT roll back the text save: text is still useful even
  // if extraction needs a retry. Caller sees bank.ok=false and can hit the
  // backfill endpoint to retry.
  if (skipBank) {
    return new Response(
      JSON.stringify({
        success: true,
        poet,
        poem,
        bank: { ok: false, error: "skipped_by_caller" },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const bank = await extractBank(poet, poem, text, selectionYears);
    const upsert = await upsertVerifiedPoemNote(poet, poem, bank);
    return new Response(
      JSON.stringify({
        success: true,
        poet,
        poem,
        bank: {
          ok: true,
          quoteCount: bank.quotes.length,
          insertedId: upsert.insertedId,
          supersededIds: upsert.supersededIds,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({
        success: true,
        poet,
        poem,
        bank: { ok: false, error: message },
      }),
      { headers: { "Content-Type": "application/json" } },
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
