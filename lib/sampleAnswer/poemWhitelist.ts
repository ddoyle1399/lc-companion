// Phase 5 safety gate. Only these (subject_key, sub_key) pairs have a verified
// quote bank that has been spot-checked by a human. Do NOT expand this list until
// batch extraction and spot-check work is done for the target poem.
export const VERIFIED_POEM_WHITELIST: ReadonlyArray<{
  subject_key: string;
  sub_key: string;
}> = [{ subject_key: "Patrick Kavanagh", sub_key: "Advent" }];

export function isPoemVerified(
  subject_key: string,
  sub_key: string | null,
): boolean {
  if (!sub_key) return false;
  return VERIFIED_POEM_WHITELIST.some(
    (p) => p.subject_key === subject_key && p.sub_key === sub_key,
  );
}
