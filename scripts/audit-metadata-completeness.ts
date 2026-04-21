/**
 * scripts/audit-metadata-completeness.ts
 *
 * Runs the same validation the prompt builder uses, across every locked
 * poem_notes row. Prints a gap report so we know exactly which rows need
 * metadata work before they can generate.
 *
 * Usage: npx tsx scripts/audit-metadata-completeness.ts
 */

import { createClient } from '@supabase/supabase-js';
import { validatePoetryMetadata, type PromptContext } from '../lib/claude/prompts';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('notes')
    .select('subject_key, sub_key, metadata, quotes')
    .eq('content_type', 'poem_notes')
    .eq('status', 'locked');

  if (error) throw error;

  const rows = data ?? [];
  const ready: string[] = [];
  const gaps: Array<{ row: string; missing: string[] }> = [];

  for (const r of rows) {
    const ctx = {
      subject: r.subject_key,
      subKey: r.sub_key,
      metadata: r.metadata,
      quotes: r.quotes ?? [],
      availablePairings: (r.metadata as any)?.available_pairings ?? [],
      studentYear: '2026',
    } as unknown as PromptContext;

    const result = validatePoetryMetadata(ctx);
    const label = `${r.subject_key} / ${r.sub_key}`;
    if (result.ok) ready.push(label);
    else gaps.push({ row: label, missing: result.missing });
  }

  // Tally most common missing fields
  const fieldCounts: Record<string, number> = {};
  for (const g of gaps) {
    for (const m of g.missing) {
      fieldCounts[m] = (fieldCounts[m] ?? 0) + 1;
    }
  }
  const sortedFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);

  console.log(`\n=== READY (${ready.length}) ===`);
  ready.forEach((l) => console.log(`  ${l}`));

  console.log(`\n=== GAPS (${gaps.length}) ===`);
  gaps.forEach((g) => {
    console.log(`  ${g.row}`);
    g.missing.forEach((m) => console.log(`    - ${m}`));
  });

  console.log(`\n=== MOST COMMON MISSING FIELDS ===`);
  sortedFields.forEach(([field, count]) => console.log(`  ${count}x  ${field}`));

  console.log(`\nTotal locked rows: ${rows.length}`);
  console.log(`Ready to generate: ${ready.length}`);
  console.log(`Blocked by missing metadata: ${gaps.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
