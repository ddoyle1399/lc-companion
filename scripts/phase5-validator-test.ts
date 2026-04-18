import { validateQuotes } from "../lib/sampleAnswer/quoteValidator";

const BANK = ["dry black bread and the sugarless tea"];

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label}`);
    process.exitCode = 1;
  }
}

console.log("Phase 5 validator tests\n");

// 1. Verbatim quote from bank → passed
{
  const r = validateQuotes(
    'He writes "dry black bread and the sugarless tea" with clarity.',
    BANK,
  );
  assert("verbatim quote from bank → passed: true", r.passed === true);
  assert("verbatim quote from bank → no flagged strings", r.flagged_strings.length === 0);
}

// 2. Quote with one word changed → flagged
{
  const r = validateQuotes(
    'He writes "dry white bread and the sugarless tea" with clarity.',
    BANK,
  );
  assert("one-word mutation → passed: false", r.passed === false);
  assert("one-word mutation → flagged_strings.length === 1", r.flagged_strings.length === 1);
}

// 3. Attribution pattern not in bank → flagged
{
  const r = validateQuotes(
    "As Kavanagh writes, the frost was indifferent to our prayers.",
    BANK,
  );
  assert("attributed fabrication → passed: false", r.passed === false);
}
