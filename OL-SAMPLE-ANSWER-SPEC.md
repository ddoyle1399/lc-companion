# OL Sample Answer Generation (Implementation Spec for Claude Code)

**Date:** 18 April 2026
**Deadline:** 24 April 2026 (6 days including today)
**Audience:** Claude Code in VS Code, Companion App repo.
**Depends on:** Phase 5 HL pipeline (PHASE-5-SAMPLE-ANSWER-SPEC.md) already implemented or implementable. This doc extends that pipeline to Ordinary Level. It does not replace it.

**Read first:**
- `SAMPLE-ANSWER-GENERATION-PLAN.md`
- `PHASE-5-SAMPLE-ANSWER-SPEC.md` (the HL mechanics this OL spec extends)
- `PCLM-MARKING-SCHEME.md` (framework, shared with HL)
- `OL-GRADE-PROFILES.md` (OL tier behavioural calibration, paired doc to this spec)
- `OL-English-Sample-Answers-Research.md` (source landscape)

---

## One-sentence summary

Extend the existing Phase 5 pipeline so that, given an OL past question and an OL note with a verified quote bank (where applicable), the system generates tier-calibrated OL sample answers across all four OL exam sections, enforces the SEC primacy rule, and rejects any answer with an unverified quote.

---

## Honest framing before anything else

Read these before starting. They override enthusiasm.

1. **Zero observed OL student scripts.** All OL tier calibration in OL-GRADE-PROFILES.md is inferred from SEC marking schemes and Aoife anchor papers. The output will read plausibly as O1/O4/O6 to a competent LC English teacher, but has not been validated against actual marked OL scripts. Surface it in the UI as "Strong / Solid / Passing" before 24 April, rename to O1/O4/O6 only after 2+ observed scripts per genre are marked against the profile.

2. **OL quote bank coverage is narrower than HL.** OL Prescribed Poetry uses the same Paper 2 poet list as HL. If a poem already has a verified HL quote bank, it works for OL. OL Single Text (Macbeth, The Tenant of Wildfell Hall) and OL Comparative need fresh text-specific quote banks. There is no verified Macbeth or Wildfell Hall quote bank in the system today. By 24 April, at minimum one OL Single Text quote bank must be extracted and spot-checked (default: Macbeth, because Aoife has 3 Macbeth anchors).

3. **OL Composing and OL Unseen Poetry do not need quote banks.** Composing is personal prose. Unseen Poetry is a first-read response. Both sections therefore ship earlier and more safely than Single Text or Comparative.

4. **OL Comprehending Q A and Q B are graded on Combined Criteria, not Discrete.** This is the biggest pipeline difference from HL. The validator, prompt, and schema all need to support Combined Criteria mode (P+C and L+M paired marking) for sub-parts of 10, 15, 20 and 30 marks.

5. **Scope is generation, not delivery.** By 24 April the pipeline must be able to generate OL answers end to end. Moving those answers into theh1club.ie, adding UI toggles for OL vs HL, and marking them approved is Phase 6. Do not scope-creep this into a product launch.

---

## Decisions locked (do not re-debate in this phase)

1. **Scope:** all four OL exam sections. Paper 1 Section I Comprehending (Q A and Q B), Paper 1 Section II Composing, Paper 2 Section I Single Text, Paper 2 Section II Comparative, Paper 2 Section III Poetry (Unseen plus Prescribed).
2. **Tiers:** three OL tiers generated per question: O1, O4, O6. Rationale: O1 is the aspirational ceiling, O4 is the honest middle of the cohort, O6 is the pass/fail hinge. H1/H4 in HL generates two answers per outline; OL generates three.
3. **Marking modes:** the schema and prompts must support both `discrete` (as in HL) and `combined` (new for OL). Combined mode pairs P+C and L+M and scores per sub-part band.
4. **Model per tier:**
   - O1: `claude-sonnet-4-6` (needs sophistication even at OL ceiling)
   - O4: `claude-haiku-4-5-20251001` (mid-tier, shallower analysis is a feature)
   - O6: `claude-haiku-4-5-20251001` (pass-tier, attempts but incomplete)
5. **Quote validator hard gate applies to all OL sections that carry a quote bank.** Composing and Unseen Poetry bypass the hard gate but still run a "no fabricated attribution" pass (no lines like "as Orwell wrote" etc).
6. **All rows save with `approved = false`.** Manual approval as in HL.
7. **Length targets per tier per section:** from OL-GRADE-PROFILES.md. Soft target in prompt, measured post-generation, flagged if outside +/- 15 percent.
8. **Primacy rule `C <= P AND L <= P`:** enforced at schema level via CHECK constraint, same as HL. For Combined Criteria, the paired scores must still respect the rule when decomposed (i.e. if P+C band scored X, the implied P and C both satisfy primacy).
9. **Indicative material source:** SEC OL marking schemes 2020-2025 (already downloaded to `sec-marking-schemes/`) are the primary reference. Aoife OL PDFs (already downloaded to `ol-anchors/`) are the voice/register anchor, not the quote source.

---

## OL exam structure (the table the generator keys off)

| Section | Question type | Mark cap | Marking mode | Quote bank needed |
|---|---|---|---|---|
| P1 S1 Q A | `comprehension_ol` | 50 (15+15+20) | combined | no (text-within-question) |
| P1 S1 Q B | `composition_ol` | 50 | discrete | no |
| P1 S2 | `composition_ol` | 100 | discrete | no |
| P2 S1 Single Text | `single_text_ol` | 60 (2 x 30, each 3 x 10) | combined | yes |
| P2 S2 (a)(i) | `comparative_ol` | 15 | combined | yes |
| P2 S2 (a)(ii) | `comparative_ol` | 15 | combined | yes |
| P2 S2 (b) | `comparative_ol` | 40 | discrete | yes |
| P2 S3 Unseen | `unseen_poetry_ol` | 20 (2 x 10) | combined | no (poem-within-question) |
| P2 S3 Prescribed 1(a) | `prescribed_poetry_ol` | 15 | combined | yes |
| P2 S3 Prescribed 1(b) | `prescribed_poetry_ol` | 15 | combined | yes |
| P2 S3 Prescribed 2 | `prescribed_poetry_ol` | 20 | combined | yes |

The generator must look up `marking_mode` and `mark_cap` from this table per question, not from the question row alone. Add a lookup helper `getOLQuestionMeta(questionCode)` that returns this struct.

---

## Schema changes

### Migration file: `supabase/migrations/0003_ol_sample_answers.sql`

```sql
-- 1. Extend grade_tier CHECK constraint to include OL tiers.
alter table sample_answers drop constraint if exists sample_answers_grade_tier_check;
alter table sample_answers add constraint sample_answers_grade_tier_check
  check (grade_tier in (
    'H1','H2','H3','H4','H5','H6','H7',
    'O1','O2','O3','O4','O5','O6','O7'
  ));

-- 2. Extend question_type CHECK to include OL-specific types.
-- Rationale: OL comprehension and composition are structurally different enough
-- from HL to warrant their own type markers even though generation code can
-- share infrastructure.
alter table sample_answers drop constraint if exists sample_answers_question_type_check;
alter table sample_answers add constraint sample_answers_question_type_check
  check (question_type in (
    'poetry','single_text','comparative','composition','comprehension','unseen_poetry',
    'prescribed_poetry_ol','unseen_poetry_ol','single_text_ol','comparative_ol',
    'composition_ol','comprehension_ol'
  ));

-- 3. Relax PCLM primacy CHECK to accept Combined Criteria shape.
-- Combined mode stores pclm_target as { "mode": "combined", "P_plus_C": n, "L_plus_M": n, "cap": n }
-- Discrete mode stores pclm_target as { "mode": "discrete", "P": n, "C": n, "L": n, "M": n }
-- The primacy rule still applies in discrete. In combined, the paired totals
-- are bounded by the sub-part cap, which covers the rule implicitly.
alter table sample_answers drop constraint if exists pclm_primacy;
alter table sample_answers add constraint pclm_primacy check (
  (pclm_target->>'mode') = 'combined'
  or (
    (pclm_target->>'mode') = 'discrete'
    and (pclm_target->>'C')::int <= (pclm_target->>'P')::int
    and (pclm_target->>'L')::int <= (pclm_target->>'P')::int
  )
);

-- 4. New column: level ('HL' | 'OL') for easy filtering.
alter table sample_answers add column if not exists level text
  not null default 'HL'
  check (level in ('HL','OL'));

create index if not exists sample_answers_level on sample_answers (level);

-- 5. New table: ol_text_quote_banks for verified OL Single Text and Comparative
--    quote banks. Separate from notes.quotes because OL texts are not in notes yet
--    and we want an explicit audit trail per text.
create table if not exists ol_text_quote_banks (
  id uuid primary key default gen_random_uuid(),
  text_key text not null unique, -- 'macbeth', 'wildfell_hall', 'the_kings_speech', etc.
  text_title text not null,
  author text not null,
  quotes jsonb not null, -- array of verified verbatim quotes
  extracted_by text not null default 'claude-haiku-4-5-20251001',
  spot_checked_by text,
  spot_checked_at timestamptz,
  source_edition text, -- e.g. 'Wordsworth Classics 2005'
  created_at timestamptz default now()
);

alter table ol_text_quote_banks enable row level security;

-- 6. Extend past_question_pclm with OL-specific fields.
alter table past_question_pclm
  add column if not exists level text not null default 'HL' check (level in ('HL','OL')),
  add column if not exists ol_sub_parts jsonb; -- structure of sub-parts and marks
```

Run via Supabase SQL editor. Confirm with:
```sql
select constraint_name from information_schema.check_constraints where constraint_schema = 'public';
```
Expect to see the new constraint names. Then:
```sql
insert into sample_answers (...) values (...) returning id;
```
Sanity test with one OL row before batch generation.

---

## Files to create or modify

### Modify: `lib/sampleAnswer/poemWhitelist.ts`

Extend the whitelist to separate OL and HL contexts, and to cover non-poetry OL texts.

```typescript
type VerifiedSource =
  | { kind: 'poem'; subject_key: string; sub_key: string; levels: ('HL' | 'OL')[] }
  | { kind: 'text'; text_key: string; levels: ('HL' | 'OL')[] };

export const VERIFIED_SOURCES: ReadonlyArray<VerifiedSource> = [
  // Existing HL
  { kind: 'poem', subject_key: 'kavanagh', sub_key: 'advent', levels: ['HL'] },
  // Add OL Prescribed Poetry poems as their banks are spot-checked.
  // Add OL Single Text texts as ol_text_quote_banks rows are spot-checked.
];

export function isSourceVerifiedForLevel(
  source: { kind: 'poem'; subject_key: string; sub_key: string | null }
        | { kind: 'text'; text_key: string },
  level: 'HL' | 'OL',
): boolean {
  if (source.kind === 'poem') {
    if (!source.sub_key) return false;
    return VERIFIED_SOURCES.some(v =>
      v.kind === 'poem' &&
      v.subject_key === source.subject_key &&
      v.sub_key === source.sub_key &&
      v.levels.includes(level),
    );
  }
  return VERIFIED_SOURCES.some(v =>
    v.kind === 'text' &&
    v.text_key === source.text_key &&
    v.levels.includes(level),
  );
}
```

Keep the old `isPoemVerified` signature and point it at the new helper for backwards compatibility so HL code does not regress.

### Modify: `lib/sampleAnswer/quoteValidator.ts`

Three changes:

1. Accept an optional `minCoveragePct` threshold per tier and per mark cap. OL 10-mark questions legitimately use 1-2 quotes; an H1 50-mark essay uses 5-8. Stop treating low coverage as a failure at OL sub-parts.

2. Add `mode: 'strict' | 'attribution_only'`. Composing and Unseen Poetry run in `attribution_only` mode: no quote bank, but still flag "as X writes" patterns naming a real author with fabricated text.

3. Accept the quote bank in two shapes: `string[]` (existing, for single-source poems) and `Array<{text: string; source: string}>` (new, for multi-source Comparative answers where quotes come from different texts). The validator treats the combined flat list for matching; the source array is for downstream UI.

```typescript
export type QuoteValidatorInput = {
  answerText: string;
  quoteBank: string[] | Array<{ text: string; source: string }>;
  mode: 'strict' | 'attribution_only';
  markCap: number;
  tier: 'H1'|'H2'|'H3'|'H4'|'H5'|'H6'|'H7'|'O1'|'O2'|'O3'|'O4'|'O5'|'O6'|'O7';
};
```

Implementation notes: the existing substring + fuzzy matching logic is correct. The changes are input shape, mode gate, and removing the coverage_pct failure case.

### New: `lib/sampleAnswer/olQuestionMeta.ts`

The lookup helper from the structure table above. One source of truth for mark_cap, marking_mode, quote_bank_required per OL question code.

```typescript
export type OLQuestionMeta = {
  section: 'P1_S1_QA' | 'P1_S1_QB' | 'P1_S2' | 'P2_S1_ST' | 'P2_S2_CI' | 'P2_S2_CII' | 'P2_S2_B' | 'P2_S3_UNSEEN' | 'P2_S3_PRES_A' | 'P2_S3_PRES_B' | 'P2_S3_PRES_2';
  questionType: string;
  markCap: number;
  markingMode: 'discrete' | 'combined';
  quoteBankRequired: boolean;
  defaultTargetWords: { O1: number; O4: number; O6: number };
  pclmTemplate: Record<string, unknown>; // shape depends on mode
};

export function getOLQuestionMeta(sectionKey: OLQuestionMeta['section']): OLQuestionMeta;
```

Populate from OL-GRADE-PROFILES.md word counts and from the SEC 2025 scheme.

### New: `lib/claude/olPromptModules/` (folder)

One module per OL section. Each module exports `buildSystemPrompt(tier: 'O1'|'O4'|'O6')` and `buildUserMessage(input)`.

Module files:
- `olComposingPrompt.ts`
- `olCompQAPrompt.ts`
- `olCompQBPrompt.ts`
- `olUnseenPoetryPrompt.ts`
- `olPrescribedPoetryPrompt.ts`
- `olSingleTextPrompt.ts`
- `olComparativePrompt.ts`

Each module's system prompt is constructed as `sharedOLRules + sectionSpecificRules[tier] + antiPatterns[tier]`. See the skeletons section below.

### Modify: `lib/claude/generateSampleAnswer.ts`

Dispatch on `question_type` + `level`:

```typescript
function selectPromptModule(level: 'HL'|'OL', questionType: string) {
  if (level === 'HL') return existingHLPromptModule;
  switch (questionType) {
    case 'composition_ol': return olComposingPrompt;
    case 'comprehension_ol': return olCompQAPrompt; // Q A/B differentiated by sub-parts
    case 'unseen_poetry_ol': return olUnseenPoetryPrompt;
    case 'prescribed_poetry_ol': return olPrescribedPoetryPrompt;
    case 'single_text_ol': return olSingleTextPrompt;
    case 'comparative_ol': return olComparativePrompt;
    default: throw new Error(`unknown OL question type: ${questionType}`);
  }
}
```

Model selection: `tier === 'O1' ? sonnet : haiku` for all OL sections. H1 HL uses sonnet. H4 HL uses haiku.

### Modify: API endpoint `POST /api/generate/sample-answer`

Accept `{ outlineId, tier, level }`. For OL, generate one answer per call. The caller requests O1, O4, O6 separately (three calls per outline). This mirrors the HL pattern of two calls per outline (H1, H4).

---

## Prompt module skeletons

Full drafts in `ol-prompt-modules/` (next deliverable, see Day 2 below). Shape per module:

### Shared OL rules (prepended to every OL system prompt)

```
You are writing a Leaving Certificate English Ordinary Level answer.

ABSOLUTE RULES:
- Use UK English spelling (colour, organised, analyse, centre).
- Never use em dashes.
- Output only the answer text. No preamble, no heading, no markdown fences, no meta-commentary.
- Address the question directly. OL marking rewards clear communication over ornament.
- If a quote bank is supplied, every quote you use must be copied verbatim from it. If no quote bank is supplied, do NOT attribute invented lines to named authors or characters.
- Hit the target word count within plus or minus 15 percent.
- Paragraphs should be short (3-5 sentences typically). OL markers reward signposted structure.
```

### Tier overlays

O1 overlay (applies across all sections):
```
YOU ARE WRITING AT THE OL CEILING (O1 equivalent, ~85-90 percent).
Behaviours required:
- Thesis or focus sentence clearly linked to the question in the first two sentences.
- Points are developed, not just stated. A point is a claim + evidence (quote or example) + brief explanation.
- Varied sentence length. Not all short. Not all long.
- Clear paragraph structure with topic sentences.
- Strong, direct vocabulary. Do not reach for rare words. Precision beats ornament at OL.
- Correct mechanics throughout. At O1, spelling, punctuation, and grammar are effectively fully correct.
Anti-patterns:
- "In conclusion," as a paragraph opener.
- Generic adjectives (profound, striking, powerful) without a specific reason attached.
- Over-long sentences that lose the reader. OL rewards clarity.
```

O4 overlay:
```
YOU ARE WRITING AT THE OL MIDDLE (O4 equivalent, ~60 percent).
Behaviours required:
- Topic is addressed but handled at surface level.
- Quotes or examples are present and correctly chosen but dropped in ("For example...") rather than woven.
- Sentence length is more uniform than an O1 answer.
- Paragraphs are present but may not all have clear topic sentences.
- Some mechanical errors are realistic. Two or three spelling slips, a comma splice or two, one or two awkward sentences. Not so many that meaning is lost.
- Retells more than argues.
Anti-patterns:
- Do not write this as a perfect O1 answer. Shallow and serviceable is the target.
- Do not write it as incoherent either. O4 is passing competently, not failing.
- Do not invent quotes or examples.
```

O6 overlay:
```
YOU ARE WRITING AT THE OL PASS LINE (O6 equivalent, ~40-45 percent).
Behaviours required:
- The question is engaged with but not always directly answered. Some paragraphs drift.
- A clear attempt at structure. Introduction and conclusion are present but thin.
- Mostly correct basic spelling. Occasional run-on sentences. Mechanical errors are visible.
- Points are often stated without development. Quote or example appears, but explanation is minimal.
- Vocabulary is basic but functional.
- Length is shorter than O1 and O4 targets.
Anti-patterns:
- Do not write nonsense. O6 is a pass, not a fail.
- Do not invent quotes.
- Do not refuse to address the question. The attempt matters at this tier.
```

### Per-section specific rules (inserted between shared and tier overlay)

These are the distinctive constraints per section. Full text lives in each module file.

- **olComposingPrompt**: No quote bank. 700 (O6) / 900 (O4) / 1100 (O1) word targets. Genre signalling (short story uses narrative arc; personal essay uses "I" voice; speech uses direct address). Warns against generic moral-at-the-end endings at O1.
- **olCompQAPrompt**: Text-within-question mode. Refer back to the printed text using line numbers or short verbatim quotes (no external quote bank). Sub-parts of 15-15-20 marks, Combined Criteria P+C and L+M. Per sub-part word targets: 100 / 150 / 200 at O1.
- **olCompQBPrompt**: 50-mark composition, Discrete Criteria. Common tasks: short talk, diary entry, letter, blog post. Register must match the task register (talk = spoken voice, letter = formal register). Same tier word targets as main composition, scaled down.
- **olUnseenPoetryPrompt**: Poem-within-question. Two sub-parts of 10 marks each, Combined. 100-word answer at O1 per sub-part, 70 at O4, 50 at O6. Personal response phrasing valued ("I felt...", "The line that struck me was...").
- **olPrescribedPoetryPrompt**: Quote bank required. Smaller than HL essays: 15, 15, or 20 mark sub-parts. Word targets: 150-250 per sub-part at O1. Heavy use of Combined Criteria marking.
- **olSingleTextPrompt**: Quote bank required (from `ol_text_quote_banks`). 2 x 30-mark questions, each split into 3 x 10 Combined. Per sub-part word targets: 150 at O1, 100 at O4, 70 at O6.
- **olComparativePrompt**: Multi-text quote bank. (a)(i) and (a)(ii) at 15 marks each, Combined. (b) at 40 marks, Discrete. For Combined sub-parts, lighter quote load; for (b), full essay treatment at 500-700 words at O1.

---

## Validator per-section behaviour

| Section | Mode | Min coverage | Notes |
|---|---|---|---|
| Composing | attribution_only | N/A | No quote bank, but block fabricated author/source attributions. |
| Q A | attribution_only | N/A | Text is printed in the paper, generator can quote from it directly; we just don't have a pre-extracted bank for every Q A text. For now, treat as attribution_only and fix in Phase 6. |
| Q B | attribution_only | N/A | Composition variant. |
| Single Text | strict | 1 quote per sub-part at O1, 0-1 at O4/O6 | Pull from ol_text_quote_banks. |
| Comparative (a)(i)/(ii) | strict | 1 quote minimum at O1 | Pull from multi-text bank. |
| Comparative (b) | strict | 3-5 quotes at O1 | Full essay, multi-text. |
| Unseen Poetry | attribution_only | N/A | Poem printed on paper. |
| Prescribed Poetry | strict | 2-3 at O1, 1-2 at O4, 1 at O6 | Pull from existing verified poem banks. |

The validator's hard-gate failure condition is unchanged: any fabricated quote (strict mode) or any fabricated author attribution (both modes) blocks save.

---

## Quote bank build plan for OL

Today the system has one verified quote bank: Kavanagh Advent (HL). Shortfall:

| Bank | Needed for | Priority for 24 April | Source |
|---|---|---|---|
| Macbeth | OL Single Text | P0 (must) | Full First Folio text, via Project Gutenberg plain text edition. |
| The Tenant of Wildfell Hall | OL Single Text | P1 (nice to have, student demand is lower than Macbeth) | Project Gutenberg. |
| OL Prescribed Poetry bank extensions | OL Prescribed | P1 | Whichever HL poems are already in `notes`; extend verification to OL level. |
| Comparative texts (depends on 2026 list) | OL Comparative | P2 (defer if blocked on 2026 list confirmation) | SEC circular + text source. |

Extraction flow:
1. Pull Project Gutenberg plain text.
2. Pass through existing quote extractor (same one that built Advent).
3. Manual spot-check. Target 40-60 quotes per text.
4. Insert row into `ol_text_quote_banks` with `spot_checked_by` set.
5. Add to `VERIFIED_SOURCES` whitelist.

Budget: Macbeth extraction + spot-check = half a day. Wildfell Hall = half a day. Do Macbeth by EOD Day 3.

---

## Build order (18 April -> 24 April)

Six days including today. Two days of buffer for breakage.

**Day 0 (today, 18 April, afternoon):**
- OL-GRADE-PROFILES.md written. [DONE]
- OL-SAMPLE-ANSWER-SPEC.md written. [IN PROGRESS]
- OL prompt module skeletons drafted (in `ol-prompt-modules/` folder). [NEXT]

**Day 1 (19 April):**
- Schema migration `0003_ol_sample_answers.sql` written, applied to dev DB.
- `olQuestionMeta.ts` populated and unit-tested.
- `quoteValidator.ts` refactored to support mode and new input shape. Unit tests for attribution_only mode.
- `poemWhitelist.ts` refactored to `VERIFIED_SOURCES` shape.

**Day 2 (20 April):**
- Full prompt modules written for Composing and Unseen Poetry (no quote bank needed, ships fastest).
- Generate first O1/O4/O6 triplet for a 2024 OL Composing task. Manual review.
- Generate first O1/O4/O6 triplet for a 2024 OL Unseen Poetry task. Manual review.

**Day 3 (21 April):**
- Macbeth quote bank extracted, spot-checked, inserted into `ol_text_quote_banks`.
- Full prompt module for olSingleTextPrompt.
- Generate first triplet for a 2024 OL Macbeth sub-part. Manual review.
- Full prompt module for olCompQAPrompt and olCompQBPrompt.

**Day 4 (22 April):**
- Full prompt module for olPrescribedPoetryPrompt. Generate first triplet against Kavanagh Advent (HL bank reused at OL level via levels extension).
- Full prompt module for olComparativePrompt.
- Begin Comparative text quote bank extraction (whichever two texts Diarmuid confirms are 2026 OL list).

**Day 5 (23 April):**
- Full end-to-end generation run across all 7 section types at all 3 tiers. 21 answers total for the sanity sample.
- Validator fail-rate measurement. Fix any section where fail-rate is above 10 percent.
- Spot-read one answer per section with Diarmuid for voice and register.

**Day 6 (24 April):**
- Bug fixes. Close any gaps.
- Document what's shippable and what's parked for Phase 6 (UI surfacing, student-facing labels, approval workflow).
- Hand over.

If Day 4 slips, the Comparative module is the acceptable sacrifice because OL Comparative requires 2026 list confirmation which is outside this pipeline's control. Ship five of seven section types shippable on 24 April, with Comparative scaffolded but parked on bank confirmation.

---

## What "shippable on 24 April" means

For the pipeline to be declared shippable by 24 April it must meet all of these:

1. Schema migration applied to production DB.
2. OL rows can be inserted respecting all CHECK constraints.
3. All 7 OL prompt modules exist and pass their own smoke test (generate one O1 answer per module, validator passes).
4. At least one verified OL quote bank exists (`macbeth` in `ol_text_quote_banks`).
5. The poem whitelist has been extended to cover OL for at least one poem.
6. Generation endpoint accepts `level: 'OL'` and dispatches correctly.
7. Validator rejects OL answers with fabricated quotes (strict mode) or fabricated attributions (attribution_only mode).
8. No HL regression: running the existing H1/H4 Kavanagh generation produces the same output as before the OL changes (snapshot test).

What is explicitly not required on 24 April:
- UI changes to surface OL vs HL.
- Student-facing labels ("Strong/Solid/Passing" vs "O1/O4/O6").
- Approval workflow for OL answers.
- Full coverage of 2026 OL Comparative text pair.
- Full coverage of every OL Prescribed Poetry poem.

These are Phase 6 and must not block the 24 April deadline.

---

## Post-24-April follow-up (Phase 6 seed list)

Log these immediately after Day 6 hand-over. They are out of scope for 24 April but real.

1. Pull 2+ marked OL scripts per section (14 total minimum) from Diarmuid's teaching archive. Mark them against OL-GRADE-PROFILES.md. Adjust tier calibration based on observed data.
2. Confirm 2026 OL Single Text list and OL Comparative pair. Build quote banks accordingly.
3. Replace tier labels in UI from O1/O4/O6 to Strong/Solid/Passing until observed calibration is confirmed.
4. Build approval workflow UI so Diarmuid can spot-approve OL answers without SQL.
5. Extend verified source list across all OL Prescribed Poetry poems by running extraction + spot-check in batch.
6. Decide whether to generate O2, O3, O5, O7 fill tiers or keep the three-tier model. Three feels right but not proven.

---

## Known risks

- **Quote bank extraction quality for Macbeth.** Shakespeare's line structure and archaic spelling may confuse the extractor. Mitigate by cross-checking extractor output against a known-good Macbeth concordance before whitelisting.
- **OL tier calibration drift at scale.** Inferred profiles may produce answers that cluster together once generated in volume. First real test is the Day 5 sanity sample. If O1/O4/O6 triplets for a section do not read as three distinct tiers, the per-section tier overlay needs sharpening.
- **Combined Criteria marking mode correctness.** This is new to the codebase. Write the schema migration CHECK constraint test carefully; a bad CHECK will either block legitimate OL rows or allow illegitimate ones.
- **SEC 2026 OL question format.** We are generating against 2020-2025 historical papers. 2026 paper lands in early June. If format shifts (new sub-part weighting, new genre in Composing), the module table above needs revisiting. Low risk but flag it.

---

## Decisions not yet made (flag for Diarmuid)

These do not block Day 1 work but need answers by the end of Day 3:

1. **Q B marking mode per year.** Historical papers sometimes treat Q B as a mini-composition (Discrete) and sometimes as a shorter task (Combined). Spec currently defaults to Discrete. Diarmuid to confirm from 2025 scheme reading.
2. **Whether to generate a full triplet per sub-part, or a single combined answer per multi-part question (Q A, Single Text, Prescribed Poetry 1).** Current plan is per sub-part, which is closer to how OL students actually write. Changing to combined is cheaper on generation cost but less useful pedagogically. Spec defaults to per sub-part. Flag if cost becomes a factor.
3. **Whether OL Composing at O1 gets Sonnet or Haiku.** Spec defaults Sonnet for O1 to keep quality high. Haiku is cheaper. If generation volume grows, reassess.

---

## Appendix: section checklist for reviewer

When reviewing a generated OL answer, the human reviewer checks:

- [ ] Question addressed directly in the opening?
- [ ] Tier register correct (O1 sophisticated, O4 serviceable, O6 thin but passing)?
- [ ] Quote bank compliance (strict mode) or no fabricated attribution (attribution_only)?
- [ ] UK English throughout?
- [ ] No em dashes?
- [ ] Word count within +/- 15 percent of target?
- [ ] Paragraph structure appropriate for OL (short, signposted)?
- [ ] Sub-part marking mode respected (Combined or Discrete)?
- [ ] No banned phrases: "In conclusion,", "Furthermore,", "This powerful line..."?
- [ ] Sounds like a student at that tier, not an AI imitating one?

If any checkbox fails, do not mark `approved = true`. Send back to regeneration with adjusted prompt.
