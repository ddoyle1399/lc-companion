import type { GradeTier } from "@/lib/claude/sampleAnswerPrompt";

export type PclmScore = { P: number; C: number; L: number; M: number };

// Per-tier ranges expressed as percentages of each criterion's maximum.
// P/C/L each have a max of 30% of mark_cap; M has 10%.
// H1 lands in the top of the band, H4 near the bottom — but with a roll
// inside the band so two H1 generations differ by a few marks naturally.
const TIER_RANGE: Record<GradeTier, { lo: number; hi: number; mLo: number; mHi: number }> = {
  H1: { lo: 0.86, hi: 1.0, mLo: 0.8, mHi: 1.0 },
  H2: { lo: 0.73, hi: 0.85, mLo: 0.7, mHi: 0.85 },
  H3: { lo: 0.6, hi: 0.72, mLo: 0.6, mHi: 0.7 },
  H4: { lo: 0.4, hi: 0.59, mLo: 0.4, mHi: 0.6 },
};

function rollInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Roll a PCLM score within the tier's band, scaled to the question's mark cap.
 * Two generations at the same tier will produce different totals naturally.
 */
export function rollPclm(tier: GradeTier, markCap: number): PclmScore {
  const range = TIER_RANGE[tier];
  const pclMax = Math.round(markCap * 0.3); // each of P, C, L
  const mMax = Math.round(markCap * 0.1); // M

  const pclMin = Math.floor(pclMax * range.lo);
  const pclHi = Math.floor(pclMax * range.hi);
  const mMin = Math.floor(mMax * range.mLo);
  const mHi = Math.floor(mMax * range.mHi);

  return {
    P: rollInt(pclMin, pclHi),
    C: rollInt(pclMin, pclHi),
    L: rollInt(pclMin, pclHi),
    M: rollInt(mMin, mHi),
  };
}

export function pclmTotal(pclm: PclmScore): number {
  return pclm.P + pclm.C + pclm.L + pclm.M;
}
