/**
 * scrubDashes
 *
 * Removes em dashes (—), en dashes (–), and double hyphens (--) from
 * generated text. The shared system prompts ban these because students
 * recognise them as AI tells. This sanitizer is the safety net at the
 * boundary: even if the model regresses, the operator never sees a
 * dash in saved or displayed content.
 *
 * Replacement strategy:
 *   - "word — word"   → "word, word"   (em dash with surrounding spaces)
 *   - "word—word"     → "word, word"   (em dash without spaces)
 *   - "word–word"     → "word, word"   (en dash, same rules)
 *   - "word -- word"  → "word, word"   (double hyphen)
 *   - Single hyphens in compound words ("peat-brown") are preserved.
 *
 * Apply this in every generation API route AFTER model output and
 * BEFORE saving to the DB or returning to the client.
 */
export function scrubDashes(input: string): string {
  if (!input) return input;
  let out = input;
  // Em-dash and en-dash with surrounding spaces → comma + space
  out = out.replace(/\s*—\s*/g, ", ");
  out = out.replace(/\s*–\s*/g, ", ");
  // Double-hyphen (typewriter em-dash) with surrounding spaces
  out = out.replace(/\s*--\s*/g, ", ");
  // Collapse any "word ,word" or " ,," artefacts the replacements may leave
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/,,+/g, ",");
  // Final trim of trailing comma+space at line endings
  out = out.replace(/, $/gm, "");
  return out;
}

/**
 * Quick boolean check for any forbidden dashes. Useful for tests and
 * for logging when the model produces them so we can track regressions.
 */
export function containsForbiddenDashes(input: string): boolean {
  if (!input) return false;
  return /[—–]|--/.test(input);
}
