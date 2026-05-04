#!/usr/bin/env npx tsx
/**
 * scripts/phase3-guard-test.ts
 *
 * Phase 3 Step 5 verification (deferred 16 April 2026, ran 4 May 2026).
 *
 * Purpose: discover whether `generateOutline` can be tricked into shipping
 * a fabricated quote when `noteQuotes` is empty. This is the production
 * safety hole flagged in the 17 April audit.
 *
 * What this script does:
 *   1. Calls generateOutline with noteQuotes: [] (the empty-quotes edge case).
 *   2. Inspects the result.
 *   3. Reports whether the guard is firing (ok: false) or whether Haiku has
 *      slipped a quote past the shape check (ok: true with non-empty quote).
 *
 * Note on the current `isValidShape`:
 *   The check in lib/claude/generateOutline.ts validates JSON STRUCTURE
 *   only (thesis_line is string, body_moves is length-3 array of correctly
 *   shaped objects, etc). It does NOT verify that body_moves[].quote
 *   appears verbatim in `noteQuotes`. So even with noteQuotes=[], a
 *   syntactically valid response can return `ok: true` with a hallucinated
 *   quote. This script proves it, then the next change is to add a
 *   verbatim-substring guard inside isValidShape.
 *
 * Usage (from lc-companion project root):
 *   npx tsx --env-file=.env.local scripts/phase3-guard-test.ts
 *
 * Exit codes:
 *   0 - guard fired or no quotes were fabricated (safe)
 *   2 - hallucinated quote slipped through (production safety hole confirmed)
 *   1 - script error (env missing, network failure, etc.)
 */

import { generateOutline, OutlineInput } from "../lib/claude/generateOutline";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set. Run with --env-file=.env.local.");
    process.exit(1);
  }

  const input: OutlineInput = {
    questionId: "guard-test-empty-quotes",
    questionText:
      "Discuss the poetry of Patrick Kavanagh with reference to its themes of wonder, faith, and ordinary life. Support your answer with reference to the poetry on your course.",
    questionYear: 2024,
    questionPaper: 2,
    questionLevel: "higher",
    questionSection: "poetry",
    poet: "Patrick Kavanagh",
    poem: null,
    noteBody:
      "Kavanagh's poetry returns repeatedly to the spiritual significance of the everyday. His Monaghan childhood and rural Catholic upbringing shape a body of work that finds the sacred in the ordinary.",
    noteQuotes: [],
    noteThemes: ["wonder", "faith", "ordinary life"],
  };

  console.log("=== Phase 3 Step 5: empty-quotes guard test ===");
  console.log("Calling generateOutline with noteQuotes: []");
  console.log("Expected (current behaviour): ok=true with hallucinated quote.");
  console.log("Desired (after fix): ok=false.\n");

  const start = Date.now();
  const result = await generateOutline(input);
  const elapsedMs = Date.now() - start;

  console.log(`Elapsed: ${elapsedMs} ms`);
  console.log(`Result.ok: ${result.ok}`);

  if (!result.ok) {
    console.log(`Error: ${result.error}`);
    console.log("\nVERDICT: guard fired. Empty-quotes case is rejected.");
    process.exit(0);
  }

  console.log("\nThesis:", result.thesis_line);
  console.log("Closing:", result.closing_move);
  console.log("Body moves:");
  for (let i = 0; i < result.body_moves.length; i++) {
    const m = result.body_moves[i];
    console.log(`  ${i + 1}. quote: "${m.quote}"`);
    console.log(`     gloss: ${m.gloss.slice(0, 120)}${m.gloss.length > 120 ? "..." : ""}`);
  }

  // Was a quote fabricated?
  const fabricatedQuotes = result.body_moves.filter(
    (m) => typeof m.quote === "string" && m.quote.trim().length > 0
  );

  console.log("\n--- ANALYSIS ---");
  console.log(`Total body_moves: ${result.body_moves.length}`);
  console.log(`body_moves with non-empty quote: ${fabricatedQuotes.length}`);

  if (fabricatedQuotes.length > 0) {
    console.log(
      "\nVERDICT: PRODUCTION SAFETY HOLE CONFIRMED.\n" +
        "Haiku produced quotes despite noteQuotes being empty. The current\n" +
        "`isValidShape` check passed because it only validates JSON structure,\n" +
        "not whether body_moves[].quote appears in the source noteQuotes array.\n\n" +
        "Recommended fix: add a verbatim-substring guard to isValidShape.\n" +
        "If noteQuotes is empty, every body_move.quote must be empty string\n" +
        "or the outline is rejected.\n"
    );
    process.exit(2);
  }

  console.log(
    "\nVERDICT: shape passed but quotes are empty strings. The model self-suppressed.\n" +
      "Still recommend adding the explicit guard so behaviour does not depend on the model.\n"
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
