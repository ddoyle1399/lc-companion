# Poem Selection for Sample Answer Generator — Build Spec for Claude Code

Paste into Claude Code in the `lc-companion` repo. Goal: on `/generate`, after the user picks a poet, show every prescribed poem by that poet for the selected exam cycle as a checkbox list. The user ticks which poems to include in the answer. The generator only sees quotes from those poems and is told to discuss only those poems.

This replaces the current behaviour where the model sees the entire verified bank for the poet and decides which poems to use.

---

## 1. Decisions made upfront

Read these first. If any is wrong, do NOT start coding — escalate.

1. **Explicit exam cycle year selector.** The form needs a year selector (2026/2027/2028) separate from the past question's year. The year determines which prescribed poem list is shown. Default to the current cycle: 2026 from today through August 2026, 2027 after that, etc. A simple date check in server component is fine.

2. **Past question year and cycle year are independent.** A 2024 past question can be selected when the cycle is 2026. Do not filter past questions by cycle year.

3. **Minimum 3 poems, maximum 6.** Under 3 is usually a weak answer for HL Poetry. Over 6 is too shallow at 1400 words. Enforce min 3 client-side (Generate disabled). Warn but allow up to 6. Block > 6.

4. **Show all prescribed poems, disable the unverified ones.** If a poem for the selected poet+year does NOT have a verified quote bank in Supabase, render its checkbox disabled with a label suffix like "— bank not verified". The user can see the coverage gap without being able to shoot themselves in the foot.

5. **The generator sees only the ticked poems' quotes.** Narrow the Supabase notes query to `sub_key IN (selectedPoems)`. The prompt also explicitly names the ticked poems and instructs Claude to discuss only those.

6. **Persist `selected_poems` on `sample_answers`.** Add a jsonb column. Needed for audit, for reviewer context, and so that regenerating a previously-approved answer is reproducible.

---

## 2. Backend changes

### 2.1 Supabase migration

Add a `selected_poems` column to `sample_answers`:

```sql
ALTER TABLE public.sample_answers
ADD COLUMN selected_poems jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sample_answers.selected_poems IS
'Array of poem sub_key strings the user asked the generator to include. Narrows the quote bank used for generation and validation.';
```

Run via `mcp__supabase__apply_migration` or add to your migration pipeline.

### 2.2 `app/api/generate/sample-answer/route.ts`

Accept two new fields in the POST body:

```ts
const examCycleYear = typeof b.examCycleYear === "number" ? b.examCycleYear : null;
const selectedPoems = Array.isArray(b.selectedPoems)
  ? b.selectedPoems.filter((x): x is string => typeof x === "string")
  : null;
```

Validate:
- `examCycleYear` must be one of `getCircularYears()` (2026 / 2027 / 2028)
- `selectedPoems` must have length between 3 and 6
- Every entry in `selectedPoems` must be a prescribed poem for `(poetKey, examCycleYear)` in the circular data. If not, return 400 `selected_poems_not_in_circular`.

Replace the current broad `notes` fetch:

```ts
const { data: notesRows, error: notesErr } = await supabase
  .from("notes")
  .select("id, sub_key, quotes")
  .eq("subject_key", poetKey)
  .eq("content_type", "poem_notes")
  .eq("status", "verified")
  .in("sub_key", selectedPoems);
```

Fail early if any selected poem didn't return a row:

```ts
const foundPoems = new Set((notesRows ?? []).map((r) => r.sub_key as string));
const missing = selectedPoems.filter((p) => !foundPoems.has(p));
if (missing.length > 0) {
  return NextResponse.json(
    { error: "unverified_poems_selected", missing },
    { status: 400 },
  );
}
```

Pass `selectedPoems` into `generateSampleAnswer` (see 2.3), then persist on save:

```ts
const saveResult = await saveSampleAnswer({
  ...existingArgs,
  selectedPoems,
});
```

### 2.3 `lib/claude/sampleAnswerPrompt.ts`

Extend the input type:

```ts
export type SampleAnswerPromptInput = {
  // ... existing fields
  selectedPoems: string[];  // required, non-empty
};
```

In `buildSampleAnswerUserMessage`, insert a SELECTED POEMS block above the QUOTE BANK:

```ts
const selectedPoemsBlock = input.selectedPoems
  .map((p, i) => `${i + 1}. ${p}`)
  .join("\n");
```

```ts
return `EXAM QUESTION (${input.questionYear}, Higher Level, Paper 2):
"${input.questionText}"

POET: ${input.poet}${focusLine}

SELECTED POEMS (you must discuss these, and ONLY these):
${selectedPoemsBlock}

TARGET WORD COUNT: ${input.targetWordCount} words.
...
```

Add a rule to `SHARED_RULES`:

```
- You must discuss the poems listed under SELECTED POEMS. Do not mention any other poem by this poet by name, even if you know it. The QUOTE BANK only contains quotes from the selected poems — this is by design.
```

### 2.4 `lib/claude/generateSampleAnswer.ts`

No logic changes needed. The type extension in 2.3 flows through automatically.

### 2.5 `lib/supabase/saveSampleAnswer.ts`

Extend the args and insert:

```ts
export interface SaveArgs {
  // ... existing
  selectedPoems: string[];
}

// in the insert payload
selected_poems: args.selectedPoems,
```

### 2.6 `/api/generate/questions` — optional tightening

Today this returns past questions by poet regardless of cycle year. That's correct (see decision 2). But consider also returning the cycle year on each question so the UI can show a subtle "2024 paper" tag. Already present as `exam_year`, no change needed.

### 2.7 New: `/api/generate/poems`

Add a GET endpoint that returns the full prescribed poem list for (poet, year) plus bank verification status:

```ts
// app/api/generate/poems/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPoemsForPoet } from "@/data/circulars";

export async function GET(req: NextRequest) {
  const poet = req.nextUrl.searchParams.get("poetKey");
  const yearStr = req.nextUrl.searchParams.get("year");
  if (!poet || !yearStr) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const year = parseInt(yearStr, 10);
  const prescribed = getPoemsForPoet(year, poet);
  if (prescribed.length === 0) {
    return NextResponse.json({ poems: [] });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("notes")
    .select("sub_key")
    .eq("subject_key", poet)
    .eq("content_type", "poem_notes")
    .eq("status", "verified")
    .in("sub_key", prescribed);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verified = new Set((data ?? []).map((r) => r.sub_key as string));
  const poems = prescribed.map((title) => ({
    title,
    verified: verified.has(title),
  }));

  return NextResponse.json({ poems });
}
```

---

## 3. Frontend changes

### 3.1 `app/generate/page.tsx` (server component)

Compute the current exam cycle:

```ts
function currentExamCycle(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1; // 1-12
  const year = now.getUTCFullYear();
  // The 2026 cycle runs until the June 2026 exam. After August 2026, bump to 2027.
  // Adjust cutoff to match your real academic calendar.
  return month >= 8 ? year + 1 : year;
}
```

Pass `availableYears` (from `getCircularYears()`) and `defaultYear` (from `currentExamCycle()`) to `GenerateForm`. Also pass the current verified poet list so the poet dropdown can still gate on "has at least one verified bank".

Better poet gating: replace the current "poets with any verified bank" query with "poets with at least one verified bank for the selected year". That's a client-side filter using the circular data + the verified list.

### 3.2 `app/generate/GenerateForm.tsx`

New state:

```ts
const [examCycleYear, setExamCycleYear] = useState<number>(defaultYear);
const [poems, setPoems] = useState<Array<{ title: string; verified: boolean }>>([]);
const [selectedPoems, setSelectedPoems] = useState<Set<string>>(new Set());
```

Fetching: whenever `(poet, examCycleYear)` changes, GET `/api/generate/poems?poetKey=…&year=…`. Clear `selectedPoems` on poet or year change.

UI layout:

```
┌──────────────────────────────────────────────┐
│ Exam cycle: ( 2026 ) ( 2027 ) ( 2028 )       │  radio group
├──────────────────────────────────────────────┤
│ Poet: [ Seamus Heaney ▾ ]                    │
├──────────────────────────────────────────────┤
│ Past question: [ 2024 — Heaney uses... ▾ ]   │
├──────────────────────────────────────────────┤
│ Poems to include (tick 3–6):                 │
│  ☑ The Forge                                 │
│  ☑ The Tollund Man                           │
│  ☑ A Constable Calls                         │
│  ☑ The Harvest Bow                           │
│  ☐ Bogland                                   │
│  ☐ Postscript                                │
│  ☐ The Underground                           │
│  ☐ Mossbawn: … Sunlight                      │
│  ☐ The Skunk                                 │
│  ☐ A Call                                    │
│  ☐ Tate's Avenue                             │
│  ☐ The Pitchfork                             │
│  ☐ Lightenings viii  — bank not verified     │  (disabled)
│                                              │
│  4 of 3–6 selected  ✓                        │
├──────────────────────────────────────────────┤
│ Grade tier: (•H1) ( H2 ) ( H3 )              │
├──────────────────────────────────────────────┤
│ [ Generate ]                                 │
└──────────────────────────────────────────────┘
```

Selection counter logic:

- 0–2 selected → red "Select at least 3 poems"
- 3–5 selected → green "N of 3–6 selected"
- 6 selected → amber "6 poems is a lot for 1400 words — consider 4 or 5"
- Generate button disabled unless 3–6 selected AND all other fields valid.

POST body shape:

```json
{
  "poetKey": "Seamus Heaney",
  "questionId": "<uuid>",
  "gradeTier": "H1",
  "examCycleYear": 2026,
  "selectedPoems": ["The Forge", "The Tollund Man", "A Constable Calls", "The Harvest Bow"]
}
```

### 3.3 Results panel — small additions

Add a "Poems used" row above the Answer panel so reviewers can see at a glance which poems were in scope vs which were actually quoted:

```
Poems in scope:   The Forge, The Tollund Man, A Constable Calls, The Harvest Bow
Poems quoted:     The Forge, The Tollund Man, The Harvest Bow       (3 of 4)
```

Derive "Poems quoted" by matching `quotes_used` back to the unioned notes rows (which have `sub_key`). If a selected poem is not quoted at all, flag it in amber — the user probably wants to regenerate.

---

## 4. Type updates

Update these together to keep the build green:

- `lib/claude/sampleAnswerPrompt.ts` — `SampleAnswerPromptInput.selectedPoems: string[]`
- `lib/supabase/saveSampleAnswer.ts` — `SaveArgs.selectedPoems: string[]`, insert payload
- `app/generate/GenerateForm.tsx` — `SampleAnswerRow.selected_poems: string[]`
- `app/api/generate/sample-answer/route.ts` — body validation

---

## 5. Validator implications

Your existing `validateQuotes` fuzzy-matches quotes against the bank passed to it. Because the bank now only contains quotes from selected poems, validation automatically enforces the scope constraint at the quote level. No change to `quoteValidator.ts` needed.

**Known gap (not in scope for this build):** if the model names a non-selected poem in prose without quoting from it ("Heaney's Bogland also deals with…"), the validator will not catch that. If this becomes a real problem, add a post-pass that scans the answer for prescribed-but-not-selected poem titles from the same poet and fails if any appear. Defer until you see it happen.

---

## 6. Smoke test

Works when:

- [ ] `/generate` loads with exam cycle defaulted to 2026
- [ ] Switching to 2028 re-filters the poet dropdown (Kavanagh disappears, Hopkins/Plath would appear if verified)
- [ ] Selecting Heaney with 2026 shows 13 poems, of which 12 are enabled and Lightenings viii is disabled with "bank not verified"
- [ ] Generate button is disabled with fewer than 3 poems ticked
- [ ] Generate button is disabled with more than 6 poems ticked
- [ ] Ticking 4 Heaney poems + 2024 question + H1 produces an answer that references only those 4 poems (manual spot check)
- [ ] `sample_answers.selected_poems` row column contains the ticked titles
- [ ] Regenerating with a different 4-poem set produces a noticeably different answer

---

## 7. Build order

1. Migration: add `selected_poems` column.
2. Types: update `SampleAnswerPromptInput`, `SaveArgs`, API body types.
3. New API route `/api/generate/poems`.
4. Update `/api/generate/sample-answer` to accept and use the new fields.
5. Update prompt builder to emit SELECTED POEMS block and shared rule.
6. Update `saveSampleAnswer` to persist `selected_poems`.
7. Frontend: add year selector, poem checklist, fetching, selection counter.
8. Frontend: results panel "poems used" summary.
9. Smoke test Heaney 2026 H1 end to end. Confirm answer is scoped.
10. Commit.

---

## 8. Out of scope (defer)

- Prose-level check for non-selected poem names (Section 5 gap).
- Recommended-poem hints (e.g. "for a Cultural Context answer, these 4 poems fit best") — interesting but deserves its own design.
- Reordering the ticked list to influence paragraph order — model figures this out for itself, let it.
- Locking poem selection to OL/HL level — the selector is HL-only today per existing scope.
- Cross-poet sample answers (impossible in HL anyway — the question names the poet).
