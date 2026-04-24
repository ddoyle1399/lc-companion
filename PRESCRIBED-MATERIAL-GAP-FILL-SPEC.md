# Prescribed Material Gap Fill — Build Spec for Claude Code

Paste this file into Claude Code running in the LC Companion repo. Goal: every poet, single text, comparative text and film prescribed across 2026, 2027 and 2028 should be selectable in the dashboard dropdowns. You will also normalise a few identifiers and decide how to handle the one page where a dropdown is deliberately gated.

The 2028 JSON files have already been written into `data/circulars/` in this same commit. Your job is to wire them up, patch the small drift in 2026/2027, fix the poet config, and (optionally) re-think the Sample Answer page dropdown.

---

## 0. Honest framing — read this before coding

The dropdown problem is actually two problems, not one. Do not conflate them.

**Problem A — prescribed-material pages.** `/poetry`, `/comparative`, `/single-text`, `/slides`, `/worksheet`, `/video`, `/poems` all read from static JSON in `data/circulars/`. These are content-generation pages. Every prescribed item SHOULD be selectable here. Today the year selector is hardcoded to 2026/2027 only. 2028 data does not exist yet.

**Problem B — the Sample Answer page (`/generate`).** This is a different beast. The poet dropdown is populated by a Supabase query (`notes` where `status = 'verified'`). It is a deliberate GATE: the generator requires a verified quote bank to produce a defensible sample answer. Showing every prescribed poet there would let the user select a poet and then get a 400 `quote_bank_too_thin`. That is worse UX, not better.

If you want every prescribed poet to appear on `/generate`, the right fix is not to remove the gate — it is to render all prescribed poets but disable (or tag) the ones without a verified bank. See Section 7.

Do those as two separate changes. Section 7 is optional and depends on a product call.

---

## 1. What is in place vs what is missing

### Already correct
- 2026 HL poetry JSON (`data/circulars/2026-poetry-hl.json`) matches Circular 0016/2024
- 2026 OL poetry JSON matches
- 2026 single texts JSON matches
- 2026 comparative JSON matches
- 2027 HL poetry JSON matches Circular 0021/2025
- 2027 OL poetry JSON matches
- 2027 single texts JSON matches
- 2027 comparative JSON matches

### Missing entirely (now written as part of this commit)
- `data/circulars/2028-poetry-hl.json`
- `data/circulars/2028-poetry-ol.json`
- `data/circulars/2028-comparative.json`
- `data/circulars/2028-single-texts.json`

### Not yet wired
- `data/circulars/index.ts` does not register 2028
- Every page's year selector is hardcoded 2026/2027
- `src/data/poets.config.ts` is missing all poets that only appear in 2028 and several that only appear in 2027 OL

### Normalisation bugs
- `"Eilean Ni Chuilleanain"` (no accents) is the canonical form used in the 2026 JSONs and in Supabase `past_questions`. But `"Eiléan Ní Chuilleanáin"` (with accents) is used in `poets.config.ts` and the 2028 JSON that was just written. Pick one canonical form and normalise everywhere. See Section 5.
- Same issue with `"Sinead Morrissey"` vs `"Sinéad Morrissey"`, `"Wislawa Szymborska"` vs `"Wisława Szymborska"`, `"Alfonso Cuaron"` vs `"Alfonso Cuarón"`.

### Supabase gaps (diagnostic, not blocking)
- `past_questions` has 16 rows, PCLM seeds for only 3 of them. Plenty of seed work still to do before the Sample Answer flow can cover more poets.
- Verified quote banks exist for 4 poets: Adrienne Rich (7 poems — 2027 prescribes 10, so incomplete), Patrick Kavanagh (9 poems — matches 2027), Seamus Heaney (12 poems — 2026 prescribes 13), W.B. Yeats (12 poems — 2026 prescribes 13). All are usable today but none are complete.

---

## 2. Register 2028 in the circular index

Edit `data/circulars/index.ts`. Add the 2028 imports and entry. Then update the exports so 2028 is a valid circular year.

```ts
// at the top, alongside the 2026/2027 imports
import singleTexts2028 from "./2028-single-texts.json";
import comparative2028 from "./2028-comparative.json";
import poetryHL2028 from "./2028-poetry-hl.json";
import poetryOL2028 from "./2028-poetry-ol.json";
```

Add this entry to the `circulars` record, after the 2027 block:

```ts
2028: {
  year: 2028,
  circular: "0024/2026",
  singleTexts: singleTexts2028.single_texts,
  comparative: {
    modesHL: comparative2028.comparative_modes_HL,
    modesOL: comparative2028.comparative_modes_OL,
    novelsMemoris: comparative2028.novels_memoirs,
    drama: comparative2028.drama,
    film: comparative2028.film,
  },
  poetryHL: {
    note: poetryHL2028.note,
    poets: poetryHL2028.poets,
  },
  poetryOL: {
    note: poetryOL2028.note,
    poems: poetryOL2028.poems,
  },
},
```

`getCircularYears()` already derives from `Object.keys(circulars)`, so once the entry is added the other pages that use that helper will pick 2028 up automatically. The pages that do NOT use that helper are listed in Section 3.

---

## 3. Wire 2028 into every page's year selector

Not every page uses `getCircularYears()`. Most have hardcoded `circularNumbers` maps and hardcoded year options. Patch each one.

For each of the pages below:

1. Add `2028: "0024/2026"` to the `circularNumbers` record.
2. Add the three JSON imports (HL, OL, comparative, single-texts as applicable) and register 2028 in the relevant data map (`hlData`, `olData`, `compData`, `singleTextData`, `hlPoetryData`, `olPoetryData`).
3. Add `2028` to any year dropdown option list. Include it as a selectable value in the year select / radio group.

Files to patch:

- `app/poetry/page.tsx` — hl, ol
- `app/comparative/page.tsx` — comparative
- `app/single-text/page.tsx` — single texts
- `app/slides/page.tsx` — hl, ol, comparative, single texts
- `app/worksheet/page.tsx` — hl, ol, comparative, single texts
- `app/video/page.tsx` — hl, ol
- `app/poems/page.tsx` — hl, ol

Example patch for `app/poetry/page.tsx`:

```ts
import poetryHL2028 from "@/data/circulars/2028-poetry-hl.json";
import poetryOL2028 from "@/data/circulars/2028-poetry-ol.json";

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
  2028: "0024/2026",
};

const hlData: Record<number, { poets: Record<string, string[]> }> = {
  2026: poetryHL2026,
  2027: poetryHL2027,
  2028: poetryHL2028,
};

const olData: Record<number, { poems: { poet: string; title: string }[] }> = {
  2026: poetryOL2026,
  2027: poetryOL2027,
  2028: poetryOL2028,
};
```

Then find the year `<select>` or year buttons and add `2028` as an option. Do NOT delete 2026 or 2027 — teachers preparing next year's cohort still need the older lists.

Smoke test after each page:
- Switch to 2028, HL, Poetry. Eight poets should appear: Dickinson, Donne, Heaney, Hopkins, Meehan, Ní Chuilleanáin, Plath, Yeats.
- Switch to 2028, Comparative. Should show 20 novels/memoirs, 9 drama, 9 films.
- Switch to 2028, Single Text. Nine options, including Hamlet and Room (not Macbeth, which is dropped).

---

## 4. Update `src/data/poets.config.ts`

`getCopyrightMode(poetName)` gates the video pipeline. Every prescribed poet across 2026/2027/2028 (HL and OL) must exist in this config or the default `rights_managed` fallback will fire and log a warning. Keep the fallback as a safety net but seed the known poets explicitly.

Add these entries at the bottom of the `POETS` array. Copyright statuses are derived from year-of-death + 70 year EU rule.

```ts
// --- 2028 HL poets (new) ---
{ name: 'Gerard Manley Hopkins', status: 'public_domain', deathYear: 1889 },
{ name: 'Sylvia Plath', status: 'rights_managed', deathYear: 1963, notes: 'Died 1963; works under copyright until at least 2033 in EU' },

// --- 2027 OL additions ---
{ name: 'Gwendolyn Brooks', status: 'rights_managed', deathYear: 2000, notes: 'Died 2000; copyright until at least 2070 in EU' },
{ name: 'Carol Ann Duffy', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Linda France', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Alison Joseph', status: 'rights_managed', notes: 'Living poet; REVIEW: confirm copyright status' },
{ name: 'Rachel Loden', status: 'rights_managed', notes: 'Living poet; REVIEW' },
{ name: 'Sinéad Morrissey', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Alden Nowlan', status: 'rights_managed', deathYear: 1983, notes: 'Died 1983; copyright until at least 2053 in EU' },
{ name: 'Felicia Olusanya', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Billy Ramsell', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Edwin Arlington Robinson', status: 'public_domain', deathYear: 1935 },
{ name: 'Tim Seibles', status: 'rights_managed', notes: 'Living poet' },
{ name: 'William Shakespeare', status: 'public_domain', deathYear: 1616 },
{ name: 'Degna Stone', status: 'rights_managed', notes: 'Living poet' },

// --- 2028 OL additions ---
{ name: 'Maya Angelou', status: 'rights_managed', deathYear: 2014, notes: 'Died 2014; copyright until at least 2084 in EU' },
{ name: 'Raymond Carver', status: 'rights_managed', deathYear: 1988, notes: 'Died 1988; copyright until at least 2058 in EU' },
{ name: 'Austin Clarke', status: 'rights_managed', deathYear: 1974, notes: 'Died 1974; copyright until at least 2044 in EU' },
{ name: 'Samuel Taylor Coleridge', status: 'public_domain', deathYear: 1834 },
{ name: 'Tom French', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Nikki Giovanni', status: 'rights_managed', deathYear: 2024, notes: 'Died 2024; copyright until at least 2094 in EU' },
{ name: 'Vona Groarke', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Ted Hughes', status: 'rights_managed', deathYear: 1998, notes: 'Died 1998; copyright until at least 2068 in EU' },
{ name: 'Bernard O\'Donoghue', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Elizabeth Smither', status: 'rights_managed', notes: 'Living poet' },
{ name: 'Wisława Szymborska', status: 'rights_managed', deathYear: 2012, notes: 'Died 2012; copyright until at least 2082 in EU' },
```

---

## 5. Normalise poet name spelling

Pick ONE canonical form per poet and use it everywhere: JSON files, Supabase `notes.subject_key`, `past_questions.subject_key`, `poets.config.ts`, and any lookups.

**Recommendation: use the accented form as canonical** (matches the Department of Education circulars). Then in `getCopyrightMode()` and Supabase joins, do a case-insensitive lookup after stripping diacritics so legacy unaccented strings still match.

Add a helper `lib/normalisePoetName.ts`:

```ts
export function normalisePoetName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
```

Use it in `poets.config.ts`'s `poetMap` build step so both `"Eilean Ni Chuilleanain"` and `"Eiléan Ní Chuilleanáin"` resolve to the same config entry. Same for Morrissey, Szymborska, Cuarón.

Then run this one-off SQL to unify Supabase data (safe: updates only, no deletes):

```sql
-- preview before running
SELECT DISTINCT subject_key FROM notes WHERE subject_key ILIKE '%chuilleanain%' OR subject_key ILIKE '%ni chuill%';
SELECT DISTINCT subject_key FROM past_questions WHERE subject_key ILIKE '%chuilleanain%';

-- then normalise
UPDATE notes
SET subject_key = 'Eiléan Ní Chuilleanáin'
WHERE subject_key ILIKE 'eilean ni chuilleanain';

UPDATE past_questions
SET subject_key = 'Eiléan Ní Chuilleanáin'
WHERE subject_key ILIKE 'eilean ni chuilleanain';
```

Also fix the existing 2026 JSON files (`2026-poetry-hl.json`, `2026-poetry-ol.json`) to use the accented form. This is a one-line find/replace per file. The 2028 HL JSON already uses the accented form.

---

## 6. Known drift to fix in 2026/2027 JSONs

Minor, low risk. Fix while you are in there.

`data/circulars/2026-poetry-hl.json`:
- Change `"Eilean Ni Chuilleanain"` key to `"Eiléan Ní Chuilleanáin"` (Section 5).

`data/circulars/2026-poetry-ol.json`:
- Change the two `"Eilean Ni Chuilleanain"` entries to `"Eiléan Ní Chuilleanáin"`.

`data/circulars/2027-poetry-hl.json`:
- Already correct on Dickinson: `"I Heard a fly buzz - when I died"` matches the circular.

`data/circulars/2027-poetry-ol.json`:
- `"Sinead Morrissey"` → `"Sinéad Morrissey"`.

`data/circulars/2027-comparative.json`:
- `"Jeanette Winterson", "Why Be Happy When You Could Be Normal"` should stay without the question mark for 2027 (matches the circular). The 2028 circular uses `"Why Be Happy When You Could Be Normal?"` with the question mark and the 2028 JSON reflects that.

---

## 7. OPTIONAL — Sample Answer page (`/generate`)

Read Section 0 first. This change is a product call, not a bug fix.

Today the poet dropdown on `/generate` only shows poets with a verified quote bank in Supabase. That's 4 today (Rich, Kavanagh, Heaney, Yeats). If you want every prescribed poet to appear there, do this:

1. In `app/generate/page.tsx`, import the circular index:
   ```ts
   import { getCircular, getCircularYears } from "@/data/circulars";
   ```
2. Build the full poet universe for all years:
   ```ts
   const allPrescribedPoets = new Set<string>();
   for (const y of getCircularYears()) {
     const c = getCircular(y);
     if (!c) continue;
     Object.keys(c.poetryHL.poets).forEach((p) => allPrescribedPoets.add(p));
   }
   ```
3. Pass `allPrescribedPoets` and the existing `verifiedPoets` array down to `GenerateForm`.
4. In the dropdown, render every prescribed poet. For poets NOT in `verifiedPoets`, set the `<option>` `disabled` and append ` — no verified quote bank yet` to the label.

This preserves the generation-readiness gate while surfacing that coverage gap to the user. They see exactly which poets still need bank verification. Do NOT remove the gate without changing the generator — the Levenshtein bank-match validator will reject any answer whose quotes are not in the bank.

If that UX is not what the user wants, leave `/generate` alone and ship Sections 1–6 only. The prescribed-material pages will be fully populated across 2026/2027/2028, which is what was asked for verbatim.

---

## 8. Build order

1. Add 2028 block to `data/circulars/index.ts`. Run `npm run build` or `tsc --noEmit`. Fix any type errors.
2. Patch `app/poetry/page.tsx`. Smoke test: 2028 HL shows 8 poets.
3. Patch `app/comparative/page.tsx`. Smoke test: 2028 HL shows Literary Genre / Theme or Issue / Cultural Context.
4. Patch `app/single-text/page.tsx`. Smoke test: 2028 HL shows Hamlet.
5. Patch `app/slides/page.tsx`, `app/worksheet/page.tsx`, `app/video/page.tsx`, `app/poems/page.tsx`. Smoke test each.
6. Update `src/data/poets.config.ts` with the new poets from Section 4.
7. Normalise names (Section 5). Update Supabase via the SQL in that section.
8. Fix the small 2026/2027 drift from Section 6.
9. (Optional) Section 7 if you want the `/generate` dropdown to surface everything.

---

## 9. Smoke test checklist

- [ ] `data/circulars/index.ts` exports `getCircularYears()` returning `[2026, 2027, 2028]`
- [ ] `/poetry` with year=2028, level=HL shows 8 poets including Hopkins and Plath
- [ ] `/poetry` with year=2028, level=OL shows 31 poems
- [ ] `/comparative` with year=2028 shows `Hamlet` and `Othello` under drama, `Macbeth` no longer present
- [ ] `/single-text` with year=2028, level=HL shows Hamlet, Gatsby, Hamnet, Dracula, Girl on an Altar
- [ ] `/single-text` with year=2028, level=OL shows Room, A Raisin in the Sun, Sive, The Cove, The Underground Railroad
- [ ] `/slides`, `/worksheet`, `/video` all accept 2028 as a year
- [ ] `getCopyrightMode("Sylvia Plath")` returns `rights_managed`
- [ ] `getCopyrightMode("Gerard Manley Hopkins")` returns `public_domain`
- [ ] `getCopyrightMode("Eilean Ni Chuilleanain")` (no accents) returns the same value as `getCopyrightMode("Eiléan Ní Chuilleanáin")`
- [ ] No console warnings about "Poet … not found in poets.config.ts" when navigating any dropdown

---

## 10. Out of scope

Do not do these in this pass:
- Seeding new past_questions rows
- Seeding new PCLM rows for poets that don't have them
- Uploading new quote banks for poets that don't have verified notes
- Changing the Sample Answer generator itself
- Touching `lcenglishhub.ie` (different repo, different product)
