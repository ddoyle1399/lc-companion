# Generate Sample Answer UI — Build Spec for Claude Code (app repo)

Paste this whole file into Claude Code running in your LC Companion App repo. It builds the "Generate Sample Answer" UI in the admin dashboard.

**Goal**: a working dashboard page where the user picks (poet, past question, grade tier), clicks Generate, and sees the sample answer render below with PCLM scores and validator results.

**Scope**: HL poetry only for this first build. No single text, no comparative, no OL. Those come later when their banks and seeds exist. Single code path, single happy flow, graceful errors for missing prerequisites.

---

## 1. Context on existing state (facts from Supabase kdylqzuyzwxuxhnwmkxw)

You already have:

- `past_questions` table, 16 rows, `subject_key` holds the poet name ("Seamus Heaney", "Patrick Kavanagh", "W.B. Yeats", etc.)
- `past_question_pclm` table, 3 rows currently seeded: Heaney 2024, Kavanagh 2023, Yeats 2022. Each row has `question_id` FK, `mark_cap`, `marking_mode`, `examiner_expectation`, `pclm_template` jsonb, `indicative_material` jsonb, `code`, `source_pdf`.
- `notes` table, 74 rows, contains the verified quote banks. Rows where `content_type = 'poem_notes'` AND `status = 'verified'` are production-ready quote banks. Each row has `subject_key` (poet), `sub_key` (poem title), `quotes` jsonb.
- `sample_answers` table, 0 rows, ready for writes. Schema enforces C <= P AND L <= P via CHECK constraint.
- `/api/generate/sample-answer` route file exists but has never been successfully called.

---

## 2. Route to build

Add a new admin-only page at `/dashboard/generate` (or whatever the existing admin routing convention is, match it).

Do NOT expose this route to students. It is a staff-only tool for generating and reviewing answers before publication.

---

## 3. Page layout

A single form with three controls, a Generate button, and a results panel below.

### Control 1: Poet selector

- Dropdown, label "Poet"
- Options populated by Supabase query: `SELECT DISTINCT subject_key FROM notes WHERE content_type = 'poem_notes' AND status = 'verified' ORDER BY subject_key`
- This is the GATE: only poets with at least one verified quote bank appear.

### Control 2: Past question selector

- Dropdown, label "Past question"
- Options populated by: `SELECT q.id, q.exam_year, q.question_text FROM past_questions q INNER JOIN past_question_pclm pc ON pc.question_id = q.id WHERE q.subject_key = :selectedPoet AND q.section = 'poetry_prescribed' ORDER BY q.exam_year DESC`
- Display format: `{exam_year} — {first 80 chars of question_text}…`
- GATE: only past questions with a seeded PCLM row appear. If none exist for the selected poet, show inline message: "No seeded past questions for this poet yet. Seed a PCLM row first."

### Control 3: Grade tier

- Radio group or dropdown, label "Grade tier"
- Options: H1, H2, H3 (default H1)
- Lock to HL only for now. Do not show OL tiers.

### Generate button

- Disabled until all three controls have valid selections
- On click, POST to `/api/generate/sample-answer` with body:
  ```json
  {
    "questionId": "<uuid>",
    "gradeTier": "H1",
    "poetKey": "W.B. Yeats"
  }
  ```
- Show loading state while request is in flight. Expect 15-60 seconds for Claude Sonnet 4.6 to generate + validate.

### Results panel

Appears below the form once a response arrives. Four sections:

**A. PCLM scores**
Render as a small grid: P/C/L/M headers, two rows (target vs achieved).
Pull from `sample_answers.pclm_target` jsonb. If validator result includes scoring, show both.

**B. Answer text**
Render `sample_answers.answer_text` in a scrollable prose block.
Above it, word count from `sample_answers.word_count`.

**C. Validator result**
Render `sample_answers.validator_result` jsonb:
- Pass/fail indicator (green tick or red cross)
- If fail, list the failures: unverified quotes, misattributions, hallucinations
- Pass/fail indicator on each individual quote used (`quotes_used` jsonb)

**D. Approve button**
Single button, "Approve for publication". Updates `sample_answers.approved = true` when clicked. Adds reviewer_notes from a textarea above the button if the reviewer wants to leave a note.

---

## 4. API contract

The `/api/generate/sample-answer` route should:

**Accept**: POST with JSON body `{ questionId, gradeTier, poetKey }`.

**Do**:
1. Fetch the past_question_pclm row for questionId. If missing, return 400.
2. Fetch the past_questions row for questionId for the question text.
3. Fetch all verified notes for this poetKey: `SELECT sub_key, quotes FROM notes WHERE subject_key = :poetKey AND content_type = 'poem_notes' AND status = 'verified'`. Union all quotes into a flat array. If empty, return 400.
4. Build the system prompt + user message using your existing `sampleAnswerPrompt.ts` router. For HL Poetry this should use `prompt-template-prescribed-poetry.md` shape.
5. Call Claude (Sonnet 4.6 for H1/H2, Haiku 4.5 for H3) with the built prompt. Set temperature and max_tokens per grade tier.
6. Run the response through `quoteValidator.ts`. Every quote in the answer must fuzzy-match (Levenshtein <= 2) against the unioned quote bank AND the speaker/poem attribution must be correct.
7. If validator fails: return 422 with `{ status: "validation_failed", failures: [...] }`. Do NOT write to sample_answers on validator fail. Write to generation_audit instead for debugging.
8. If validator passes: insert into `sample_answers` with all fields populated. Return the new row.

**Return shape** on success:
```json
{
  "status": "success",
  "sampleAnswer": { ...full sample_answers row }
}
```

**Return shape** on validator fail:
```json
{
  "status": "validation_failed",
  "failures": [
    { "quote": "quoted phrase", "reason": "not in bank", "poem": "..." }
  ],
  "rawAnswer": "the full text that was generated, so we can review"
}
```

---

## 5. Error handling

The page must handle four distinct error states cleanly, inline under the Generate button:

1. **No quote bank for poet**: "Quote bank not yet verified for this poet. Upload an anthology scan first."
2. **No PCLM seed for question**: "No PCLM target seeded for this question. Seed the marking scheme first."
3. **Claude API error** (rate limit, auth, model unavailable): "Generation service temporarily unavailable. Try again in a few seconds."
4. **Validator failed**: Show the raw answer (for debugging) plus the list of failed quotes. Offer a "Regenerate" button.

---

## 6. Styling

Match existing dashboard components. No new design language. Use the same button style, form inputs, and card containers already in the dashboard.

If there's a `<Card>` component, wrap the form in one. If there's a consistent layout shell for admin pages, use it.

Keep the page uncluttered. Left-aligned, max-width around 900px, not full-bleed.

---

## 7. Minimal smoke test acceptance

Page is working when:
- Three poets appear in the poet dropdown (Adrienne Rich, Patrick Kavanagh, Seamus Heaney, W.B. Yeats should all show — we have 4 with verified banks)
- Selecting W.B. Yeats shows "2022 — The bold and brilliant imagery…" in the question dropdown
- Selecting Patrick Kavanagh shows "2023 — How successfully, in your opinion, does Kavanagh employ…"
- Selecting Seamus Heaney shows "2024 — Heaney uses a deceptively simple style…"
- Clicking Generate with Heaney 2024 + H1 returns a sample answer within 60 seconds
- The returned answer is ~1400 words for H1, references at least 4 Heaney poems from the verified bank, and the validator passes
- The answer persists in `sample_answers` table (row count goes from 0 to 1)

---

## 8. Out of scope for this build (defer)

- OL tiers (O1/O4/O6)
- Single text questions (no quote banks yet)
- Comparative questions (no quote banks yet, no PCLM seeds)
- Student-facing view of approved sample answers (different page, different scope)
- Version history / comparison between generations of the same question
- Cost tracking UI (should log to generation_audit but no UI for it yet)

---

## 9. Build order for Claude Code

1. Create the page route and component shell with the three controls (no submit yet).
2. Wire the Supabase queries to populate poet + past_question dropdowns.
3. Add the Generate button with stubbed onClick that logs to console.
4. Verify `/api/generate/sample-answer` responds (start with a mock success response, then wire the real orchestrator).
5. Wire the real POST and render the success response.
6. Add validator-fail handling and the Regenerate flow.
7. Add the Approve button and reviewer notes.
8. Manual smoke test: generate Heaney 2024 H1. Confirm sample_answers row appears.
