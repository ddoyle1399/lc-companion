#!/usr/bin/env npx tsx
/**
 * scripts/backfill-empty-arrays.ts
 *
 * Phase 1 of the metadata backfill (4 May 2026).
 *
 * For every verified poem_notes row, set the "[] is allowed" metadata
 * fields to [] where they are currently null or missing. This unblocks
 * the structural shape of the metadata guard for ~50 rows without
 * touching any real content.
 *
 * Fields touched:
 *   - metadata.named_figures      (array, [] OK)
 *   - metadata.textual_variants   (array, [] OK)
 *   - metadata.section_breaks     (array, [] OK, only set where NULL)
 *
 * Rows where these fields already have a value are LEFT ALONE. This
 * means The Tollund Man's section_breaks (already I=1-5, II=6-8, III=9-11)
 * is preserved.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-empty-arrays.ts --dry
 *   npx tsx --env-file=.env.local scripts/backfill-empty-arrays.ts --apply
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const dryRun = !apply;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const FIELDS_TO_BACKFILL = ["named_figures", "textual_variants", "section_breaks"] as const;

type NoteRow = {
  id: string;
  subject_key: string | null;
  sub_key: string | null;
  metadata: Record<string, unknown> | null;
};

async function fetchVerifiedRows(): Promise<NoteRow[]> {
  const r = await fetch(
    `${url}/rest/v1/notes?select=id,subject_key,sub_key,metadata&content_type=eq.poem_notes&status=eq.verified`,
    { headers: { apikey: key!, Authorization: `Bearer ${key!}` } },
  );
  if (!r.ok) throw new Error(`fetch failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as NoteRow[];
}

function whichFieldsNeedBackfill(metadata: Record<string, unknown> | null): string[] {
  const md = metadata ?? {};
  return FIELDS_TO_BACKFILL.filter((field) => {
    const v = md[field];
    return v === undefined || v === null;
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

async function main() {
  const rows = await fetchVerifiedRows();
  console.log(`Loaded ${rows.length} verified poem_notes rows.\n`);

  const plan: Array<{ row: NoteRow; toAdd: string[] }> = [];
  for (const row of rows) {
    const toAdd = whichFieldsNeedBackfill(row.metadata);
    if (toAdd.length > 0) plan.push({ row, toAdd });
  }

  console.log(`=== PLAN (${dryRun ? "DRY RUN" : "APPLY"}) ===`);
  console.log(`Rows touched: ${plan.length} / ${rows.length}`);
  const counts: Record<string, number> = {};
  for (const p of plan) for (const f of p.toAdd) counts[f] = (counts[f] ?? 0) + 1;
  for (const [f, c] of Object.entries(counts)) {
    console.log(`  ${f.padEnd(18)} -> [] on ${c} rows`);
  }

  if (plan.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  console.log("\nFirst 10 rows in plan:");
  plan.slice(0, 10).forEach((p) =>
    console.log(`  ${p.row.subject_key} / ${p.row.sub_key}: ${p.toAdd.join(", ")}`),
  );

  if (dryRun) {
    console.log("\nDRY RUN. Re-run with --apply to write changes.");
    return;
  }

  console.log("\nApplying...");
  let okCount = 0;
  let errCount = 0;
  for (const p of plan) {
    const md = { ...(p.row.metadata ?? {}) };
    for (const f of p.toAdd) md[f] = [];
    try {
      await patchRow(p.row.id, md);
      okCount++;
      if (okCount % 10 === 0) console.log(`  ${okCount} / ${plan.length}`);
    } catch (err) {
      errCount++;
      console.error(`  FAIL ${p.row.subject_key} / ${p.row.sub_key}: ${(err as Error).message}`);
    }
  }
  console.log(`\nDone. ok=${okCount} err=${errCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
