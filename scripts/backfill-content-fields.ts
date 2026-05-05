#!/usr/bin/env npx tsx
/**
 * scripts/backfill-content-fields.ts
 *
 * Phase 2 of the metadata backfill (4 May 2026).
 *
 * For every verified poem_notes row missing technique_glossary or
 * historical_context, call Claude Sonnet 4.6 to derive both fields
 * from the row's existing body_text + quotes + subject + sub_key.
 * Merge the result back into the row's metadata.
 *
 * Uses Anthropic tool_use to enforce JSON shape. If Claude is unsure
 * of a fact, it must wrap it in [VERIFY] markers rather than fabricate.
 *
 * Does NOT touch:
 *   - quote_schema_version (needs anthology re-anchoring)
 *   - stanza_breaks / total_lines / structure_confidence (needs anthology lookup)
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-content-fields.ts --dry --limit 1
 *   npx tsx --env-file=.env.local scripts/backfill-content-fields.ts --dry --limit 3
 *   npx tsx --env-file=.env.local scripts/backfill-content-fields.ts --apply --poet "Seamus Heaney"
 *   npx tsx --env-file=.env.local scripts/backfill-content-fields.ts --apply --tier B
 *
 * Flags:
 *   --dry           Print prompt + model output for each row, do not write.
 *   --apply         Write merged metadata back to Supabase.
 *   --limit N       Process at most N rows.
 *   --poet "Name"   Only rows whose subject_key matches.
 *   --tier B        B = Heaney/Yeats/Kavanagh (already on v2 quotes, just need content).
 *                   C = Bishop/Smith (will fill content but still blocked by v2 gap).
 *                   D = Rich (still blocked by structural gaps too).
 *                   ALL (default) = process every blocked row regardless.
 */

import Anthropic from "@anthropic-ai/sdk";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!url || !key || !anthropicKey) {
  console.error("Missing one of NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY");
  process.exit(1);
}

// Argv parsing
const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const dry = !apply;
const limitIdx = argv.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : Infinity;
const poetIdx = argv.indexOf("--poet");
const poetFilter = poetIdx >= 0 ? argv[poetIdx + 1] : null;
const tierIdx = argv.indexOf("--tier");
const tier = tierIdx >= 0 ? argv[tierIdx + 1] : "ALL";

const TIER_B_POETS = new Set([
  "Seamus Heaney",
  "W.B. Yeats",
  "Patrick Kavanagh",
]);
const TIER_C_POETS = new Set(["Elizabeth Bishop", "Tracy K. Smith"]);
const TIER_D_POETS = new Set(["Adrienne Rich"]);

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an LC English content metadata enricher. You will be given a verified poetry note for a single poem (the body text, the quote bank, the poet, the title) and you will return two metadata fields:

1. technique_glossary: a single string, 100-300 words, listing the poetic techniques actually used in THIS poem and what each one does in context. Teacher-facing, not student-facing. Do not list techniques that are not actually present in the poem. Use the approved LC syllabus device names (alliteration, assonance, enjambment, caesura, simile, metaphor, personification, symbolism, tone shift, juxtaposition, sibilance, etc). Connect each named device to its effect in this specific poem, not generic theory.

2. historical_context: a structured object. Required keys: composition_date (string, year or year range as known), collection (string, the book the poem appears in). Optional keys: publisher (string), real_world_events (array of {event, date, relevance}), source_texts (array of {author, title, year, relevance} - books or essays the poem draws on), biographical_anchors (array of strings - facts about the poet's life relevant to this poem), disputed_readings (array of {detail, options, guidance} - any interpretive controversy worth flagging).

Accuracy rules:
- Never invent dates, collection titles, publishers, or biographical facts.
- If you are not certain of a specific fact, wrap it in [VERIFY: ...] markers inside the string. Do not silently guess.
- If a key has no defensible content, omit it entirely. Empty arrays are fine.
- UK English throughout. No em dashes anywhere.

Return ONLY by calling the report_metadata tool. Do not narrate.`;

const TOOL_SCHEMA = {
  name: "report_metadata",
  description: "Return the two metadata fields for this poem.",
  input_schema: {
    type: "object",
    properties: {
      technique_glossary: { type: "string", minLength: 50 },
      historical_context: {
        type: "object",
        properties: {
          composition_date: { type: "string" },
          collection: { type: "string" },
          publisher: { type: "string" },
          real_world_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event: { type: "string" },
                date: { type: "string" },
                relevance: { type: "string" },
              },
              required: ["event", "relevance"],
            },
          },
          source_texts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                author: { type: "string" },
                title: { type: "string" },
                year: { type: "string" },
                relevance: { type: "string" },
              },
              required: ["title", "relevance"],
            },
          },
          biographical_anchors: { type: "array", items: { type: "string" } },
          disputed_readings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                detail: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                guidance: { type: "string" },
              },
              required: ["detail", "guidance"],
            },
          },
        },
        required: ["composition_date", "collection"],
      },
    },
    required: ["technique_glossary", "historical_context"],
  },
} as const;

type NoteRow = {
  id: string;
  subject_key: string | null;
  sub_key: string | null;
  metadata: Record<string, unknown> | null;
  body_text: string | null;
  quotes: unknown;
};

function tierOf(poet: string | null): "B" | "C" | "D" | "OTHER" {
  if (!poet) return "OTHER";
  if (TIER_B_POETS.has(poet)) return "B";
  if (TIER_C_POETS.has(poet)) return "C";
  if (TIER_D_POETS.has(poet)) return "D";
  return "OTHER";
}

async function fetchBlockedRows(): Promise<NoteRow[]> {
  const r = await fetch(
    `${url}/rest/v1/notes?select=id,subject_key,sub_key,metadata,body_text,quotes&content_type=eq.poem_notes&status=eq.verified`,
    { headers: { apikey: key!, Authorization: `Bearer ${key!}` } },
  );
  if (!r.ok) throw new Error(`fetch failed: ${r.status} ${await r.text()}`);
  const all = (await r.json()) as NoteRow[];
  return all.filter((row) => {
    const md = row.metadata ?? {};
    const needsTG = typeof (md as any).technique_glossary !== "string" || ((md as any).technique_glossary as string).trim().length === 0;
    const needsHC = !(md as any).historical_context || typeof (md as any).historical_context !== "object";
    return needsTG || needsHC;
  });
}

async function patchRow(id: string, mergedMetadata: Record<string, unknown>) {
  const r = await fetch(`${url}/rest/v1/notes?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key!,
      Authorization: `Bearer ${key!}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ metadata: mergedMetadata }),
  });
  if (!r.ok) throw new Error(`patch ${id} failed: ${r.status} ${await r.text()}`);
}

function buildUserMessage(row: NoteRow): string {
  const quotes = Array.isArray(row.quotes) ? row.quotes : [];
  const quotesBlock = quotes
    .map((q: any, i) => {
      if (typeof q === "string") return `${i + 1}. ${q}`;
      const text = q.text ?? q.quote_text ?? q.line ?? JSON.stringify(q);
      return `${i + 1}. ${text}`;
    })
    .join("\n");

  return [
    `POET: ${row.subject_key ?? "(unknown)"}`,
    `POEM: ${row.sub_key ?? "(unknown)"}`,
    ``,
    `BODY TEXT (existing analysis note):`,
    row.body_text?.slice(0, 8000) ?? "(empty)",
    ``,
    `QUOTE BANK:`,
    quotesBlock || "(empty)",
    ``,
    `Now invoke report_metadata with technique_glossary and historical_context for this poem.`,
  ].join("\n");
}

async function callClaude(client: Anthropic, row: NoteRow): Promise<{ technique_glossary: string; historical_context: Record<string, unknown> } | null> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA as any],
    tool_choice: { type: "tool", name: "report_metadata" } as any,
    messages: [{ role: "user", content: buildUserMessage(row) }],
  });

  const toolUse = response.content.find((b: any) => b.type === "tool_use") as
    | { type: "tool_use"; name: string; input: any }
    | undefined;

  if (!toolUse || toolUse.name !== "report_metadata") return null;
  return toolUse.input;
}

async function main() {
  let rows = await fetchBlockedRows();
  if (poetFilter) rows = rows.filter((r) => r.subject_key === poetFilter);
  if (tier !== "ALL") rows = rows.filter((r) => tierOf(r.subject_key) === tier);
  if (rows.length > limit) rows = rows.slice(0, limit);

  console.log(`Plan: ${rows.length} rows. mode=${dry ? "DRY" : "APPLY"} tier=${tier}${poetFilter ? ` poet=${poetFilter}` : ""}\n`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const client = new Anthropic({ apiKey: anthropicKey! });

  const concurrencyIdx = argv.indexOf("--concurrency");
  const concurrency = concurrencyIdx >= 0 ? Math.max(1, parseInt(argv[concurrencyIdx + 1], 10)) : 5;

  let okCount = 0;
  let errCount = 0;
  let inFlight = 0;
  const results: Array<{ label: string; ok: boolean; msg: string }> = [];

  async function processRow(row: NoteRow, idx: number): Promise<void> {
    const label = `${row.subject_key} / ${row.sub_key}`;
    try {
      const fields = await callClaude(client, row);
      if (!fields) {
        results.push({ label, ok: false, msg: "tool not invoked" });
        errCount++;
        return;
      }

      if (dry) {
        const verifyHits = (fields.technique_glossary.match(/\[VERIFY/g) || []).length;
        const summary =
          `tg=${fields.technique_glossary.length}c, ` +
          `${(fields.historical_context as any).composition_date} / ${(fields.historical_context as any).collection}` +
          (verifyHits > 0 ? `, [VERIFY]×${verifyHits}` : "");
        results.push({ label, ok: true, msg: `OK (dry): ${summary}` });
      } else {
        const mergedMetadata = {
          ...(row.metadata ?? {}),
          technique_glossary: fields.technique_glossary,
          historical_context: fields.historical_context,
        };
        await patchRow(row.id, mergedMetadata);
        results.push({ label, ok: true, msg: "OK" });
      }
      okCount++;
    } catch (err) {
      results.push({ label, ok: false, msg: `ERR: ${(err as Error).message}` });
      errCount++;
    }
  }

  // Run with bounded concurrency.
  const queue = rows.map((row, idx) => ({ row, idx }));
  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          inFlight++;
          await processRow(next.row, next.idx);
          inFlight--;
        }
      })(),
    );
  }
  await Promise.all(workers);

  for (const r of results.sort((a, b) => a.label.localeCompare(b.label))) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.label}: ${r.msg}`);
  }

  console.log(`\nDone. ok=${okCount} err=${errCount} concurrency=${concurrency}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
