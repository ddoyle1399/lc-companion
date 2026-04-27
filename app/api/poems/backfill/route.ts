/**
 * POST /api/poems/backfill
 *
 * Finds every populated poem in the filesystem store that does NOT yet have a
 * verified poem_notes row in the notes table, and runs extraction + upsert for
 * each. Use this after bulk-uploading source texts, or to retrofit poems whose
 * upload predates the auto-extract change.
 *
 * Body (all optional):
 *   { poet?: string, poem?: string, dryRun?: boolean, parallelism?: number }
 *
 * If poet+poem are passed, runs only that one. Otherwise sweeps every populated
 * file. parallelism defaults to 3 (same as the single-text multi-select pattern).
 *
 * Response: { processed: [...], skipped: [...], failed: [...], totals: {...} }
 */

import { NextRequest } from "next/server";
import { listStoredPoems, getPoemText } from "@/lib/poems/store";
import { extractBank } from "@/lib/poems/extractBank";
import { upsertVerifiedPoemNote } from "@/lib/poems/upsertNote";
import { getServerSupabase } from "@/lib/supabase/server";

interface Job {
  poet: string;
  poem: string;
  filename: string;
  text: string;
}

interface ProcessedItem {
  poet: string;
  poem: string;
  quoteCount: number;
  insertedId: string;
}

interface FailedItem {
  poet: string;
  poem: string;
  error: string;
}

interface SkippedItem {
  poet: string;
  poem: string;
  reason: string;
}

// Reverse the safe-name encoding from store.ts.
// The encoding lowercases and strips non-alphanumerics, so we cannot fully
// recover the canonical poet name from the filename. We need an explicit map
// for the prescribed poets.
const FILENAME_TO_POET: Record<string, string> = {
  "elizabeth-bishop": "Elizabeth Bishop",
  "tracy-k-smith": "Tracy K. Smith",
  "seamus-heaney": "Seamus Heaney",
  "wb-yeats": "W.B. Yeats",
  "patrick-kavanagh": "Patrick Kavanagh",
  "adrienne-rich": "Adrienne Rich",
  "john-donne": "John Donne",
  "ts-eliot": "T.S. Eliot",
  "paula-meehan": "Paula Meehan",
  "eilean-ni-chuilleanain": "Eiléan Ní Chuilleanáin",
  "derek-mahon": "Derek Mahon",
  "emily-dickinson": "Emily Dickinson",
};

// Best-effort canonical poet name from the filename slug.
function resolvePoetFromSlug(slug: string): string {
  if (FILENAME_TO_POET[slug]) return FILENAME_TO_POET[slug];
  // Fall back to title-casing the slug. Caller can override the poet by
  // passing it explicitly in the body.
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// We can't perfectly recover the original poem title from the slug either,
// because punctuation was stripped. The notes lookup uses the canonical title,
// so when we discover a populated text without a verified row we have to
// match by slug, not exact title. We rebuild the slug for any candidate row
// and compare.
function makeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const targetPoet = typeof body.poet === "string" ? body.poet : null;
  const targetPoem = typeof body.poem === "string" ? body.poem : null;
  const dryRun = body.dryRun === true;
  const parallelism = Math.min(
    typeof body.parallelism === "number" ? body.parallelism : 3,
    5,
  );
  const selectionYears = Array.isArray(body.selectionYears)
    ? (body.selectionYears as string[]).filter((y) => typeof y === "string")
    : ["2026"];

  // 1. Enumerate populated files.
  const allFiles = await listStoredPoems();
  const candidates: Job[] = [];
  for (const f of allFiles) {
    const poet = resolvePoetFromSlug(f.poet);
    const poemText = await getPoemText(poet, "_DUMMY_DOES_NOT_EXIST_");
    // The slug from the file is reversible to title-case but loses punctuation.
    // We read the file via the filename directly using the slug-based pair.
    const text = await getPoemTextBySlug(f.poet, f.poem);
    if (!text || text.length < 50) continue;
    if (targetPoet && poet !== targetPoet) continue;
    // Recover poem title (best effort): use the slug capitalised. The caller
    // can pass an explicit poem title to be precise.
    const poem = targetPoem
      ? targetPoem
      : f.poem
          .split("-")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
    candidates.push({ poet, poem, filename: f.filename, text });
    void poemText;
  }

  // 2. Filter out poems that already have a verified row.
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("notes")
    .select("subject_key, sub_key")
    .eq("content_type", "poem_notes")
    .eq("status", "verified");

  const existingSlugs = new Set(
    (existing ?? []).map(
      (r: { subject_key: string; sub_key: string }) =>
        `${makeSlug(r.subject_key)}::${makeSlug(r.sub_key)}`,
    ),
  );

  const skipped: SkippedItem[] = [];
  const todo: Job[] = [];
  for (const c of candidates) {
    const slugKey = `${makeSlug(c.poet)}::${makeSlug(c.poem)}`;
    if (existingSlugs.has(slugKey)) {
      skipped.push({
        poet: c.poet,
        poem: c.poem,
        reason: "already_verified",
      });
    } else {
      todo.push(c);
    }
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({
        dryRun: true,
        wouldProcess: todo.map((j) => ({ poet: j.poet, poem: j.poem })),
        skipped,
        totals: {
          candidates: candidates.length,
          toProcess: todo.length,
          skipped: skipped.length,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. Run extraction + upsert with limited parallelism.
  const processed: ProcessedItem[] = [];
  const failed: FailedItem[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < todo.length) {
      const idx = cursor++;
      const job = todo[idx];
      try {
        const bank = await extractBank(
          job.poet,
          job.poem,
          job.text,
          selectionYears,
        );
        const upsert = await upsertVerifiedPoemNote(job.poet, job.poem, bank);
        processed.push({
          poet: job.poet,
          poem: job.poem,
          quoteCount: bank.quotes.length,
          insertedId: upsert.insertedId,
        });
      } catch (err) {
        failed.push({
          poet: job.poet,
          poem: job.poem,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(parallelism, todo.length) }, () => worker()),
  );

  return new Response(
    JSON.stringify({
      processed,
      skipped,
      failed,
      totals: {
        candidates: candidates.length,
        processed: processed.length,
        skipped: skipped.length,
        failed: failed.length,
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// Direct slug-based file read so we don't have to round-trip through the
// canonical poet/poem strings (which lose information). Mirrors the encoding
// in lib/poems/store.ts but takes the slugs as-is.
async function getPoemTextBySlug(
  poetSlug: string,
  poemSlug: string,
): Promise<string | null> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const filePath = path.join(
    process.cwd(),
    "data",
    "poems",
    `${poetSlug}--${poemSlug}.txt`,
  );
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return text.trim() || null;
  } catch {
    return null;
  }
}
