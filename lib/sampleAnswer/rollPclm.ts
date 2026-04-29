import type { GradeTier } from "@/lib/claude/sampleAnswerPrompt";

export type PclmScore = { P: number; C: number; L: number; M: number };

/**
 * SEC HL grade bands as percentages of mark_cap.
 *   H1 = 50-45  → 90-100% of cap
 *   H2 = 44-40  → 80-88%
 *   H3 = 39-35  → 70-78%
 *   H4 = 34-30  → 60-68%
 *
 * For a 60-mark single-text question the bands work out to roughly:
 *   H1 = 60-54  → 90-100%
 *   H2 = 53-48  → 80-88%
 *   H3 = 47-42  → 70-78%
 *   H4 = 41-36  → 60-68%
 *
 * Old implementation rolled each P/C/L independently and let H1 dip into
 * the H2 band (worst case 12+12+12+4 = 40 on a mark_cap of 50). The new
 * implementation rolls a target total within the SEC band first, then
 * distributes across PCLM with the C ≤ P and L ≤ P primacy rule that the
 * sample_answers table enforces as a CHECK constraint.
 */
const TIER_BAND: Record<GradeTier, { lo: number; hi: number }> = {
  H1: { lo: 0.9, hi: 1.0 },
  H2: { lo: 0.8, hi: 0.88 },
  H3: { lo: 0.7, hi: 0.78 },
  H4: { lo: 0.6, hi: 0.68 },
};

function rollInt(min: number, max: number): number {
  if (max < min) return min;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Roll a PCLM score that is GUARANTEED to land inside the requested tier.
 *   1. Pick a target total within the band (variation between generations).
 *   2. Allocate M (≈10% of total) capped at mMax (10% of mark_cap).
 *   3. Split the rest across P, C, L with C ≤ P and L ≤ P.
 *   4. Apply a ±1 jitter that swaps marks between C and L only, so primacy
 *      and total are both preserved.
 */
export function rollPclm(tier: GradeTier, markCap: number): PclmScore {
  const band = TIER_BAND[tier];
  const minTotal = Math.round(markCap * band.lo);
  const maxTotal = Math.round(markCap * band.hi);
  const targetTotal = rollInt(minTotal, maxTotal);

  const pclMax = Math.round(markCap * 0.3);
  const mMax = Math.round(markCap * 0.1);

  let M = Math.min(Math.round(targetTotal * 0.1), mMax);
  const pclTotal = targetTotal - M;

  // Base distribution: each gets pclTotal / 3. Remainder goes to P first,
  // then to C, so primacy (C ≤ P, L ≤ P) holds without extra correction.
  const base = Math.floor(pclTotal / 3);
  const remainder = pclTotal - 3 * base;
  let P = base + (remainder >= 1 ? 1 : 0);
  let C = base + (remainder >= 2 ? 1 : 0);
  let L = base;

  // Tiny jitter so two H1 generations don't always produce identical PCLM.
  // Swap one mark between C and L only when it doesn't violate primacy
  // (C ≤ P, L ≤ P). This must happen BEFORE the final cap, otherwise the
  // cap drops C back to P and we silently lose a mark.
  const jitter = rollInt(-1, 1);
  if (jitter === 1 && C > 0 && L + 1 <= P) {
    C -= 1;
    L += 1;
  } else if (jitter === -1 && L > 0 && C + 1 <= P) {
    L -= 1;
    C += 1;
  }

  // Final caps. Primacy is structurally guaranteed by the distribution
  // and the jitter constraint above; this is defence-in-depth.
  P = Math.min(P, pclMax);
  C = Math.min(C, pclMax, P);
  L = Math.min(L, pclMax, P);

  return { P, C, L, M };
}

export function pclmTotal(pclm: PclmScore): number {
  return pclm.P + pclm.C + pclm.L + pclm.M;
}
