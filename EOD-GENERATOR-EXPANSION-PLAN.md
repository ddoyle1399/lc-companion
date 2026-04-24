# EOD Generator Expansion Plan — Single Text + Comparative

Goal: extend `/generate` from HL Poetry only to also cover HL Single Text and HL Comparative by end of day.

Questions are already seeded: 4 single-text rows (Othello × 2, Macbeth × 2), 18 comparative rows (GVV + Cultural Context across 2020-2023). Quote banks are the missing piece.

---

## Step 1 — UI: three-section selector [DONE]

`/generate` page gets a Section radio at top: Poetry / Single Text / Comparative.

Form fields swap based on section. Sections without verified banks show a disabled state with explanation driven by bank availability, not hardcoding.

Acceptance:
- Radio at top of form, defaults to Poetry
- Switching section clears dependent state (poet, text, mode)
- Single Text shows disabled state with "No verified quote banks for Macbeth or Othello yet" until banks exist
- Comparative shows disabled state with the same pattern
- Poetry section works exactly as today

Files touched: `app/generate/page.tsx`, `app/generate/GenerateForm.tsx`.

---

## Step 2 — Single Text generator: Macbeth + Othello (3-4 hours)

Shakespeare is canonical and out of copyright. No anthology scan needed — pull from Folger Shakespeare (authoritative digital text).

### 2a. Quote bank build
- Write a script or use agents to extract quotes from Macbeth and Othello
- Source: Folger Shakespeare. Pick roughly 40-60 quotes per play covering major scenes
- Each quote stored as `{text, act, scene, speaker, themes}` — adapt existing poem quote object shape
- Insert into `notes` table with `content_type = 'single_text_notes'`, `subject_key = 'Macbeth'` / `'Othello'`, `status = 'verified'`

### 2b. Prompt template
- New file: `lib/claude/singleTextAnswerPrompt.ts`
- Adapts the poetry prompt for single-text: character arc, theme, dramatic technique
- SELECTED THEMES block instead of SELECTED POEMS
- Same quote-density and no-em-dash rules

### 2c. API route
- New: `app/api/generate/single-text-answer/route.ts`
- Accepts: `questionId`, `gradeTier`, `textKey` ("Macbeth" | "Othello"), `selectedThemes` (array)
- Queries `notes` WHERE `content_type = 'single_text_notes' AND subject_key = :textKey`
- Validates quotes against the bank (same validator, passing text title)

### 2d. UI wiring
- Single Text section shows: text picker (Macbeth/Othello), question picker, theme checklist (3-5 themes), tier selector
- Themes list derived from bank metadata

Acceptance:
- Select Macbeth, pick 2023 C(i) question, H1, tick 3-4 themes, generate
- Answer references only Macbeth, validates against bank, ~1400 words
- Same for Othello

---

## Step 3 — Comparative generator: classic-text subset (4-6 hours)

Hard constraint: most prescribed comparative texts are contemporary and need anthology uploads. Six are public domain and scrapable today:

Macbeth, Othello, Hamlet, Dracula, Pride and Prejudice, Wuthering Heights.

Ship comparative for combinations of three of these six. When user uploads anthologies for contemporary texts (Hamnet, Small Things Like These, etc.) those banks plug in and widen coverage.

### 3a. Quote bank build
- Extract quotes from the 6 classic texts
- Dracula + P&P + Wuthering Heights from Project Gutenberg
- Macbeth + Othello + Hamlet from Folger (reusing the Shakespeare work from Step 2)
- Insert as `notes` with `content_type = 'comparative_text_notes'`

### 3b. Prompt template
- New file: `lib/claude/comparativeAnswerPrompt.ts`
- Fundamentally different: "compare these three texts across this mode"
- Mode-specific sub-rules for GVV vs Cultural Context
- Must reference all three texts, not just one

### 3c. API route
- New: `app/api/generate/comparative-answer/route.ts`
- Accepts: `questionId`, `gradeTier`, `selectedTexts` (array of exactly 3 text keys), `mode`
- Unions quote banks across the three chosen texts
- Validator reuses existing logic with concatenated bank

### 3d. UI wiring
- Comparative section shows: mode picker (GVV/CC), question picker filtered by mode, text multi-select (exactly 3), tier
- Only classic-subset texts selectable until more banks are verified

Acceptance:
- Pick GVV mode, 2023 A1(a), tick Dracula + P&P + Macbeth, H1, generate
- Answer compares all three texts across GVV, validates against unioned bank, ~1400 words
- Attempting to tick a 4th or fewer than 3 disables Generate

---

## Step 4 — QA and commit (1 hour)

Smoke tests:
- Macbeth H1 single-text generation
- Othello H1 single-text generation
- Comparative GVV with three classic texts
- Poetry still works (regression check)

Commit per major step, not one blob.

---

## Explicit non-goals for EOD

- Quote banks for contemporary prescribed texts (Hamnet, Small Things Like These, Purple Hibiscus, Banshees of Inisherin, etc.). These need anthology uploads.
- Film quote extraction (fundamentally different structure — needs script sources plus scene timing).
- OL (Ordinary Level) anything. HL only.
- Student-facing view of generations.
- Batch generation or queueing.

---

## Dependencies that can NOT be bypassed

1. Shakespeare quote accuracy — use Folger Shakespeare or equivalent canonical source. No WebSearch-scraped misquotes.
2. PCLM seeds for single text and comparative questions. Currently only poetry has PCLM. Without PCLM seeds, the new sections won't surface questions in their dropdowns. Either seed from marking schemes (same pattern as the poetry PCLM work done today) OR skip the PCLM gate for single-text/comparative routes and generate directly from the question text.
