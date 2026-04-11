# Phase 3 — Outline Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a note streams and its quotes/themes are extracted, one Claude Haiku call fires per matching past exam question and produces a structured outline (thesis + 3 body moves + closing + examiner note), which is saved to `question_outlines` with `approved = false`.

**Architecture:** Five new files handle the pipeline in discrete layers (concurrency util, DB query, Claude call, DB write). Two existing API routes are modified to insert the outline block between extraction and save. The hook gains two new state fields to surface outline status. No migrations required — `question_outlines` table already exists.

**Tech Stack:** TypeScript, Next.js App Router, Anthropic SDK (`@anthropic-ai/sdk`), Supabase JS client (`@supabase/supabase-js`), React hooks.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/util/concurrency.ts` | `runWithConcurrency<T,R>` — fan-out with cap |
| Create | `lib/supabase/findMatchingQuestions.ts` | Query `past_questions` by `subject_key` + `level` |
| Create | `lib/claude/outlinePrompt.ts` | Build the user message for outline generation |
| Modify | `lib/claude/prompts.ts` | Append `buildOutlineSystemPrompt()` export |
| Create | `lib/claude/generateOutline.ts` | Claude Haiku call, JSON parse, shape guard, timeout |
| Create | `lib/supabase/saveOutlines.ts` | Bulk insert into `question_outlines` |
| Modify | `app/api/generate/route.ts` | Wire outline block between extraction and save |
| Modify | `app/api/generate/sync/route.ts` | Mirror outline block in sync route |
| Modify | `lib/hooks/useStreamGenerate.ts` | Handle `outlines` + `outlinesSave` SSE events |

---

## Task 1: `lib/util/concurrency.ts`

**Files:**
- Create: `lib/util/concurrency.ts`

- [ ] **Step 1: Create the file**

```typescript
/**
 * Run `task` over `items` with at most `limit` concurrent invocations.
 * Preserves input order in the results array.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await task(items[i]);
    }
  });

  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add lib/util/concurrency.ts
git commit -m "phase3(outline): add runWithConcurrency helper"
```

---

## Task 2: `lib/supabase/findMatchingQuestions.ts`

**Files:**
- Create: `lib/supabase/findMatchingQuestions.ts`

- [ ] **Step 1: Create the file**

```typescript
import { getServerSupabase } from "./server";

export type MatchingQuestion = {
  id: string;
  exam_year: number | null;
  paper: number | null;
  level: "higher" | "ordinary";
  section: string | null;
  question_text: string;
  subject_key: string;
};

export async function findMatchingQuestions(params: {
  subjectKey: string;
  level: "higher" | "ordinary";
}): Promise<MatchingQuestion[]> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("past_questions")
      .select("id, exam_year, paper, level, section, question_text, subject_key")
      .eq("subject_key", params.subjectKey)
      .eq("level", params.level)
      .order("exam_year", { ascending: false });

    if (error) return [];
    return (data as MatchingQuestion[]) ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/findMatchingQuestions.ts
git commit -m "phase3(outline): add findMatchingQuestions Supabase query"
```

---

## Task 3: `lib/claude/outlinePrompt.ts`

**Files:**
- Create: `lib/claude/outlinePrompt.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { OutlineInput } from "./generateOutline";

export function buildOutlineUserMessage(input: OutlineInput): string {
  const headerParts: string[] = [];
  if (input.questionYear) headerParts.push(`Year ${input.questionYear}`);
  if (input.questionPaper) headerParts.push(`Paper ${input.questionPaper}`);
  headerParts.push(input.questionLevel === "higher" ? "Higher Level" : "Ordinary Level");
  if (input.questionSection) headerParts.push(input.questionSection);
  const questionHeader = headerParts.join(", ");

  const quotesBlock = input.noteQuotes.length > 0
    ? input.noteQuotes.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "(No quotes extracted from note)";

  const themesBlock = input.noteThemes.length > 0
    ? input.noteThemes.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "(No themes extracted from note)";

  return `You are writing a structured essay outline for this SEC exam question on ${input.poet}${input.poem ? ` (focus poem: ${input.poem})` : ""}.

EXAM QUESTION (${questionHeader}):
"${input.questionText}"

AVAILABLE VERBATIM QUOTES (you must pick from this list only):
${quotesBlock}

THEMES ALREADY IDENTIFIED IN THE NOTE:
${themesBlock}

NOTE CONTEXT (for reference only — do not quote from it, use only the AVAILABLE VERBATIM QUOTES list above):
${input.noteBody.slice(0, 4000)}

Produce the outline as JSON.`;
}
```

- [ ] **Step 2: Type-check (will fail until generateOutline.ts exists — skip for now, check after Task 5)**

---

## Task 4: Add `buildOutlineSystemPrompt` to `lib/claude/prompts.ts`

**Files:**
- Modify: `lib/claude/prompts.ts` (append at end of file)

- [ ] **Step 1: Read the last few lines to confirm the append point**

```bash
tail -5 /Users/diarmuiddoyle/lc-companion/lib/claude/prompts.ts
```

- [ ] **Step 2: Append the new export**

Open `lib/claude/prompts.ts` and add at the very end of the file:

```typescript
export function buildOutlineSystemPrompt(): string {
  return `You are an experienced Leaving Certificate English teacher in Ireland writing a structured essay outline for a Higher or Ordinary Level student.

ABSOLUTE RULES:
- Output valid JSON only. No preamble, no markdown, no explanation outside the JSON.
- The JSON must have exactly these keys: thesis_line, body_moves, closing_move, examiner_note.
- body_moves must be an array of exactly 3 objects, each with keys: move, quote, gloss.
- Every quote must be copied verbatim from the list of quotes provided in the user message. Do not invent quotes. Do not paraphrase. If you cannot find a suitable verbatim quote for a body move, pick the closest one from the provided list.
- thesis_line is one sentence, maximum 30 words, that directly answers the exam question asked.
- Each body_moves[].move is a short label for the argument of that paragraph, maximum 12 words.
- Each body_moves[].gloss is 1-2 sentences explaining why this quote serves the move and how a student should use it in the paragraph. Speak directly to the student.
- closing_move is one sentence describing what the final paragraph should do to close the argument.
- examiner_note is an optional short tip (1-2 sentences) about what an SEC examiner looks for in a strong answer to this specific question. Use null if you have nothing specific to say.

STYLE:
- Use UK English spelling (colour, organised, analyse).
- Never use em dashes. Use commas, full stops, colons, semicolons.
- Be direct and specific. Do not use filler phrases like "this powerful statement" or "the poet masterfully".
- Write like a teacher talking to a student, not a textbook.

You must respect the exact wording of the exam question. If the question is about loneliness, your thesis must address loneliness. Do not substitute your own theme.`;
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add lib/claude/prompts.ts
git commit -m "phase3(outline): add buildOutlineSystemPrompt to prompts.ts"
```

---

## Task 5: `lib/claude/generateOutline.ts`

**Files:**
- Create: `lib/claude/generateOutline.ts`

This is the Claude Haiku call. Follows the same pattern as `extractQuotesAndThemes.ts`: `getClient()`, `messages.create`, `Promise.race` timeout, shape guard, never throws.

- [ ] **Step 1: Create the file**

```typescript
import { getClient } from "./client";
import { buildOutlineSystemPrompt } from "./prompts";
import { buildOutlineUserMessage } from "./outlinePrompt";

const OUTLINE_MODEL = "claude-haiku-4-5-20251001";
const OUTLINE_MAX_TOKENS = 1200;
const OUTLINE_TIMEOUT_MS = 30_000;

export type OutlineBodyMove = {
  move: string;
  quote: string;
  gloss: string;
};

export type OutlineSuccess = {
  ok: true;
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
  model: string;
};

export type OutlineFailure = {
  ok: false;
  error: string;
};

export type OutlineResult = OutlineSuccess | OutlineFailure;

export type OutlineInput = {
  questionId: string;
  questionText: string;
  questionYear: number | null;
  questionPaper: number | null;
  questionLevel: "higher" | "ordinary";
  questionSection: string | null;
  poet: string;
  poem: string | null;
  noteBody: string;
  noteQuotes: string[];
  noteThemes: string[];
};

function isBodyMove(value: unknown): value is OutlineBodyMove {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.move === "string" &&
    typeof obj.quote === "string" &&
    typeof obj.gloss === "string"
  );
}

function isValidShape(value: unknown): value is {
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
} {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.thesis_line !== "string") return false;
  if (typeof obj.closing_move !== "string") return false;
  if (obj.examiner_note !== null && typeof obj.examiner_note !== "string") return false;
  if (!Array.isArray(obj.body_moves)) return false;
  if (obj.body_moves.length !== 3) return false;
  if (!obj.body_moves.every(isBodyMove)) return false;

  return true;
}

export async function generateOutline(input: OutlineInput): Promise<OutlineResult> {
  const client = getClient();

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("outline generation timeout")), OUTLINE_TIMEOUT_MS)
    );

    const callPromise = client.messages.create({
      model: OUTLINE_MODEL,
      max_tokens: OUTLINE_MAX_TOKENS,
      system: buildOutlineSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildOutlineUserMessage(input),
        },
      ],
    });

    const response = await Promise.race([callPromise, timeoutPromise]);

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );

    if (!textBlock) {
      return { ok: false, error: "no text block in outline response" };
    }

    const raw = textBlock.text.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[generateOutline] JSON parse failed. Raw:", raw.slice(0, 200));
      return { ok: false, error: "outline response was not valid JSON" };
    }

    if (!isValidShape(parsed)) {
      console.error("[generateOutline] Shape validation failed. Parsed:", JSON.stringify(parsed).slice(0, 300));
      return { ok: false, error: "outline response had wrong shape" };
    }

    return {
      ok: true,
      thesis_line: parsed.thesis_line,
      body_moves: parsed.body_moves,
      closing_move: parsed.closing_move,
      examiner_note: parsed.examiner_note,
      model: OUTLINE_MODEL,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "outline generation failed";
    console.error("[generateOutline] error:", message);
    return { ok: false, error: message };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/claude/generateOutline.ts lib/claude/outlinePrompt.ts
git commit -m "phase3(outline): add generateOutline and outlinePrompt helpers"
```

---

## Task 6: `lib/supabase/saveOutlines.ts`

**Files:**
- Create: `lib/supabase/saveOutlines.ts`

- [ ] **Step 1: Create the file**

```typescript
import { getServerSupabase } from "./server";
import type { OutlineSuccess } from "../claude/generateOutline";

export type SaveOutlinesInput = {
  noteId: string;
  outlines: Array<{
    questionId: string;
    outline: OutlineSuccess;
  }>;
};

export type SaveOutlinesResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; inserted: number };

export async function saveOutlines(input: SaveOutlinesInput): Promise<SaveOutlinesResult> {
  if (input.outlines.length === 0) {
    return { ok: true, inserted: 0 };
  }

  try {
    const supabase = getServerSupabase();
    const rows = input.outlines.map(({ questionId, outline }) => ({
      note_id: input.noteId,
      question_id: questionId,
      thesis_line: outline.thesis_line,
      body_moves: outline.body_moves,
      closing_move: outline.closing_move,
      examiner_note: outline.examiner_note,
      generation_model: outline.model,
      approved: false,
    }));

    const { error, data } = await supabase
      .from("question_outlines")
      .insert(rows)
      .select("id");

    if (error) {
      return { ok: false, error: error.message, inserted: 0 };
    }
    return { ok: true, inserted: data?.length ?? 0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
      inserted: 0,
    };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/saveOutlines.ts
git commit -m "phase3(outline): add saveOutlines Supabase insert helper"
```

---

## Task 7: Wire outline block into `app/api/generate/route.ts`

**Files:**
- Modify: `app/api/generate/route.ts`

The outline block goes between the `extraction` SSE event and `marked.parse`. A `pendingOutlines` array is declared before the block and consumed after `saveNote`.

- [ ] **Step 1: Add imports at the top of the file**

The existing imports end with:
```typescript
import { extractQuotesAndThemes } from "@/lib/claude/extractQuotesAndThemes";
```

Add three new imports immediately after that line:

```typescript
import { generateOutline, type OutlineSuccess } from "@/lib/claude/generateOutline";
import { findMatchingQuestions } from "@/lib/supabase/findMatchingQuestions";
import { saveOutlines } from "@/lib/supabase/saveOutlines";
import { runWithConcurrency } from "@/lib/util/concurrency";
```

- [ ] **Step 2: Replace the post-stream persistence block**

Find this exact block (starts at "Stream completed cleanly"):

```typescript
          // Stream completed cleanly. Extract quotes/themes, then persist.
          if (accumulatedText) {
            try {
              const bodyText = accumulatedText;

              // Run extraction before save. Never blocks the user's note display.
              const extractionResult = await extractQuotesAndThemes(bodyText);
              const quotes = extractionResult.ok ? extractionResult.quotes : null;
              const themes = extractionResult.ok ? extractionResult.themes : null;

              if (!extractionResult.ok) {
                console.error("[generate] extraction failed:", extractionResult.error);
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    extraction: {
                      ok: extractionResult.ok,
                      quotesCount: quotes?.length ?? 0,
                      themesCount: themes?.length ?? 0,
                      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
                    },
                  })}\n\n`
                )
              );

              const bodyHtml = marked.parse(bodyText) as string;
              const noteInput = mapPromptContextToNoteInput(
                context,
                bodyHtml,
                bodyText,
                "claude-sonnet-4-20250514",
                quotes,
                themes
              );
              const saveResult = await saveNote(noteInput);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ save: saveResult })}\n\n`)
              );
            } catch (saveErr) {
              const errMsg = saveErr instanceof Error ? saveErr.message : "Save failed";
              console.error("[generate] save error:", saveErr);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ save: { ok: false, error: errMsg } })}\n\n`
                )
              );
            }
          }
```

Replace it with:

```typescript
          // Stream completed cleanly. Extract quotes/themes, generate outlines, then persist.
          if (accumulatedText) {
            try {
              const bodyText = accumulatedText;

              // Run extraction before save. Never blocks the user's note display.
              const extractionResult = await extractQuotesAndThemes(bodyText);
              const quotes = extractionResult.ok ? extractionResult.quotes : null;
              const themes = extractionResult.ok ? extractionResult.themes : null;

              if (!extractionResult.ok) {
                console.error("[generate] extraction failed:", extractionResult.error);
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    extraction: {
                      ok: extractionResult.ok,
                      quotesCount: quotes?.length ?? 0,
                      themesCount: themes?.length ?? 0,
                      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
                    },
                  })}\n\n`
                )
              );

              // Generate outlines for every matching past question.
              let pendingOutlines: Array<{ questionId: string; outline: OutlineSuccess }> = [];
              const subjectKey = context.poet ?? context.textTitle ?? context.comparativeMode ?? null;
              const level: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

              if (subjectKey) {
                const matches = await findMatchingQuestions({ subjectKey, level });

                if (matches.length === 0) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        outlines: { ok: true, matched: 0, generated: 0, failed: 0, note: "no_past_questions" },
                      })}\n\n`
                    )
                  );
                } else {
                  const outlineQuotes = extractionResult.ok ? extractionResult.quotes : [];
                  const outlineThemes = extractionResult.ok ? extractionResult.themes : [];

                  const results = await runWithConcurrency(matches, 3, async (q) => {
                    const outline = await generateOutline({
                      questionId: q.id,
                      questionText: q.question_text,
                      questionYear: q.exam_year,
                      questionPaper: q.paper,
                      questionLevel: q.level,
                      questionSection: q.section,
                      poet: context.poet ?? subjectKey,
                      poem: context.poem ?? null,
                      noteBody: bodyText,
                      noteQuotes: outlineQuotes,
                      noteThemes: outlineThemes,
                    });
                    return { questionId: q.id, outline };
                  });

                  pendingOutlines = results.filter(
                    (r): r is { questionId: string; outline: OutlineSuccess } => r.outline.ok
                  );

                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        outlines: {
                          ok: true,
                          matched: matches.length,
                          generated: pendingOutlines.length,
                          failed: results.length - pendingOutlines.length,
                        },
                      })}\n\n`
                    )
                  );
                }
              } else {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      outlines: { ok: true, matched: 0, generated: 0, failed: 0, note: "no_subject_key" },
                    })}\n\n`
                  )
                );
              }

              const bodyHtml = marked.parse(bodyText) as string;
              const noteInput = mapPromptContextToNoteInput(
                context,
                bodyHtml,
                bodyText,
                "claude-sonnet-4-20250514",
                quotes,
                themes
              );
              const saveResult = await saveNote(noteInput);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ save: saveResult })}\n\n`)
              );

              // Save outlines only once we have a noteId.
              if (saveResult.ok && pendingOutlines.length > 0) {
                const outlinesResult = await saveOutlines({
                  noteId: saveResult.noteId,
                  outlines: pendingOutlines,
                });
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ outlinesSave: outlinesResult })}\n\n`)
                );
              }
            } catch (saveErr) {
              const errMsg = saveErr instanceof Error ? saveErr.message : "Save failed";
              console.error("[generate] save error:", saveErr);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ save: { ok: false, error: errMsg } })}\n\n`
                )
              );
            }
          }
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "phase3(outline): wire outline generation into streaming route"
```

---

## Task 8: Wire outline block into `app/api/generate/sync/route.ts`

**Files:**
- Modify: `app/api/generate/sync/route.ts`

- [ ] **Step 1: Add imports**

The existing imports end with:
```typescript
import { extractQuotesAndThemes } from "@/lib/claude/extractQuotesAndThemes";
```

Add immediately after:

```typescript
import { generateOutline, type OutlineSuccess } from "@/lib/claude/generateOutline";
import { findMatchingQuestions } from "@/lib/supabase/findMatchingQuestions";
import { saveOutlines } from "@/lib/supabase/saveOutlines";
import { runWithConcurrency } from "@/lib/util/concurrency";
```

- [ ] **Step 2: Replace the extraction-through-response block**

Find this exact block:

```typescript
    let noteId: string | undefined;
    let saveError: string | undefined;
    let extraction: { ok: boolean; quotesCount: number; themesCount: number; error?: string };

    // Run extraction before save.
    const extractionResult = await extractQuotesAndThemes(content);
    const quotes = extractionResult.ok ? extractionResult.quotes : null;
    const themes = extractionResult.ok ? extractionResult.themes : null;

    if (!extractionResult.ok) {
      console.error("[sync/generate] extraction failed:", extractionResult.error);
    }

    extraction = {
      ok: extractionResult.ok,
      quotesCount: quotes?.length ?? 0,
      themesCount: themes?.length ?? 0,
      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
    };

    try {
      const bodyText = content;
      const bodyHtml = marked.parse(bodyText) as string;
      const noteInput = mapPromptContextToNoteInput(
        context,
        bodyHtml,
        bodyText,
        "claude-sonnet-4-20250514",
        quotes,
        themes
      );
      const saveResult = await saveNote(noteInput);
      if (saveResult.ok) {
        noteId = saveResult.noteId;
      } else {
        saveError = saveResult.error;
      }
    } catch (saveErr) {
      saveError = saveErr instanceof Error ? saveErr.message : "Save mapping failed";
      console.error("[sync/generate] save error:", saveErr);
    }

    return new Response(
      JSON.stringify({ content, contentType, noteId, saveError, extraction }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
```

Replace with:

```typescript
    let noteId: string | undefined;
    let saveError: string | undefined;
    let extraction: { ok: boolean; quotesCount: number; themesCount: number; error?: string };
    let outlines: { ok: boolean; matched: number; generated: number; failed: number; note?: string };
    let outlinesSave: { ok: boolean; inserted: number; error?: string } | undefined;

    // Run extraction before save.
    const extractionResult = await extractQuotesAndThemes(content);
    const quotes = extractionResult.ok ? extractionResult.quotes : null;
    const themes = extractionResult.ok ? extractionResult.themes : null;

    if (!extractionResult.ok) {
      console.error("[sync/generate] extraction failed:", extractionResult.error);
    }

    extraction = {
      ok: extractionResult.ok,
      quotesCount: quotes?.length ?? 0,
      themesCount: themes?.length ?? 0,
      ...(extractionResult.ok ? {} : { error: extractionResult.error }),
    };

    // Generate outlines for every matching past question.
    let pendingOutlines: Array<{ questionId: string; outline: OutlineSuccess }> = [];
    const subjectKey = context.poet ?? context.textTitle ?? context.comparativeMode ?? null;
    const level: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

    if (subjectKey) {
      const matches = await findMatchingQuestions({ subjectKey, level });

      if (matches.length === 0) {
        outlines = { ok: true, matched: 0, generated: 0, failed: 0, note: "no_past_questions" };
      } else {
        const outlineQuotes = extractionResult.ok ? extractionResult.quotes : [];
        const outlineThemes = extractionResult.ok ? extractionResult.themes : [];

        const results = await runWithConcurrency(matches, 3, async (q) => {
          const outline = await generateOutline({
            questionId: q.id,
            questionText: q.question_text,
            questionYear: q.exam_year,
            questionPaper: q.paper,
            questionLevel: q.level,
            questionSection: q.section,
            poet: context.poet ?? subjectKey,
            poem: context.poem ?? null,
            noteBody: content,
            noteQuotes: outlineQuotes,
            noteThemes: outlineThemes,
          });
          return { questionId: q.id, outline };
        });

        pendingOutlines = results.filter(
          (r): r is { questionId: string; outline: OutlineSuccess } => r.outline.ok
        );

        outlines = {
          ok: true,
          matched: matches.length,
          generated: pendingOutlines.length,
          failed: results.length - pendingOutlines.length,
        };
      }
    } else {
      outlines = { ok: true, matched: 0, generated: 0, failed: 0, note: "no_subject_key" };
    }

    try {
      const bodyText = content;
      const bodyHtml = marked.parse(bodyText) as string;
      const noteInput = mapPromptContextToNoteInput(
        context,
        bodyHtml,
        bodyText,
        "claude-sonnet-4-20250514",
        quotes,
        themes
      );
      const saveResult = await saveNote(noteInput);
      if (saveResult.ok) {
        noteId = saveResult.noteId;

        // Save outlines once we have a noteId.
        if (pendingOutlines.length > 0) {
          const outlinesResult = await saveOutlines({
            noteId: saveResult.noteId,
            outlines: pendingOutlines,
          });
          outlinesSave = outlinesResult;
        }
      } else {
        saveError = saveResult.error;
      }
    } catch (saveErr) {
      saveError = saveErr instanceof Error ? saveErr.message : "Save mapping failed";
      console.error("[sync/generate] save error:", saveErr);
    }

    return new Response(
      JSON.stringify({ content, contentType, noteId, saveError, extraction, outlines, outlinesSave }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/sync/route.ts
git commit -m "phase3(outline): wire outline generation into sync route"
```

---

## Task 9: Handle new SSE events in `lib/hooks/useStreamGenerate.ts`

**Files:**
- Modify: `lib/hooks/useStreamGenerate.ts`

- [ ] **Step 1: Add new state type and state variables**

Find this block at the top of the `useStreamGenerate` function:

```typescript
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
```

Replace with:

```typescript
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outlinesStatus, setOutlinesStatus] = useState<{
    ok: boolean;
    matched: number;
    generated: number;
    failed: number;
    note?: string;
  } | null>(null);
  const [outlinesSaveStatus, setOutlinesSaveStatus] = useState<{
    ok: boolean;
    inserted?: number;
    error?: string;
  } | null>(null);
```

- [ ] **Step 2: Reset new state in `generate` callback**

Find this block inside the `generate` callback:

```typescript
      setNoteId(null);
      setSaveError(null);
```

Replace with:

```typescript
      setNoteId(null);
      setSaveError(null);
      setOutlinesStatus(null);
      setOutlinesSaveStatus(null);
```

- [ ] **Step 3: Handle new SSE events in the parse block**

Find this block inside the SSE parse loop:

```typescript
                } else if (parsed.save) {
                  if (parsed.save.ok) {
                    setNoteId(parsed.save.noteId);
                  } else {
                    setSaveError(parsed.save.error);
                  }
                } else if (parsed.text) {
```

Replace with:

```typescript
                } else if (parsed.save) {
                  if (parsed.save.ok) {
                    setNoteId(parsed.save.noteId);
                  } else {
                    setSaveError(parsed.save.error);
                  }
                } else if (parsed.outlines) {
                  setOutlinesStatus(parsed.outlines);
                } else if (parsed.outlinesSave) {
                  setOutlinesSaveStatus(parsed.outlinesSave);
                } else if (parsed.text) {
```

- [ ] **Step 4: Add new state to the reset callback**

Find the `reset` callback body:

```typescript
    setOutput("");
    setError("");
    setSearchStatus("");
    setNoteId(null);
    setSaveError(null);
    rawOutputRef.current = "";
    foundHeadingRef.current = false;
```

Replace with:

```typescript
    setOutput("");
    setError("");
    setSearchStatus("");
    setNoteId(null);
    setSaveError(null);
    setOutlinesStatus(null);
    setOutlinesSaveStatus(null);
    rawOutputRef.current = "";
    foundHeadingRef.current = false;
```

- [ ] **Step 5: Add new fields to the return object and interface**

Find the `UseStreamGenerateReturn` interface:

```typescript
interface UseStreamGenerateReturn {
  output: string;
  rawOutput: string;
  generating: boolean;
  error: string;
  searchStatus: string;
  noteId: string | null;
  saveError: string | null;
  generate: (body: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  reset: () => void;
}
```

Replace with:

```typescript
interface UseStreamGenerateReturn {
  output: string;
  rawOutput: string;
  generating: boolean;
  error: string;
  searchStatus: string;
  noteId: string | null;
  saveError: string | null;
  outlinesStatus: {
    ok: boolean;
    matched: number;
    generated: number;
    failed: number;
    note?: string;
  } | null;
  outlinesSaveStatus: {
    ok: boolean;
    inserted?: number;
    error?: string;
  } | null;
  generate: (body: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  reset: () => void;
}
```

Find the return statement:

```typescript
  return {
    output,
    rawOutput: rawOutputRef.current,
    generating,
    error,
    searchStatus,
    noteId,
    saveError,
    generate,
    stop,
    reset,
  };
```

Replace with:

```typescript
  return {
    output,
    rawOutput: rawOutputRef.current,
    generating,
    error,
    searchStatus,
    noteId,
    saveError,
    outlinesStatus,
    outlinesSaveStatus,
    generate,
    stop,
    reset,
  };
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useStreamGenerate.ts
git commit -m "phase3(outline): expose outlinesStatus and outlinesSaveStatus in hook"
```

---

## Task 10: End-to-end verification

No automated test framework is configured. Verification is manual against the dev server.

**Prerequisites:**
- `npm run dev` is running (`http://localhost:3000`)
- Supabase service role key is the rotated one (already confirmed)
- At least one past question exists in `past_questions` for a poet you are about to generate (e.g. Patrick Kavanagh or W.B. Yeats)

- [ ] **Step 1: TypeScript clean check**

```bash
cd /Users/diarmuiddoyle/lc-companion && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 2: Happy path — poet with 1 matching question**

Generate a note for Patrick Kavanagh (any poem, HL 2027) via the app UI. Watch the browser console or network tab. The SSE stream should contain (in order):
1. `text` delta events
2. `extraction` event: `{ ok: true, quotesCount: N, themesCount: M }`
3. `outlines` event: `{ ok: true, matched: 1, generated: 1, failed: 0 }`
4. `save` event: `{ ok: true, noteId: "..." }`
5. `outlinesSave` event: `{ ok: true, inserted: 1 }`
6. `[DONE]`

Then verify in Supabase SQL editor:

```sql
select
  o.id,
  o.thesis_line,
  jsonb_array_length(o.body_moves) as move_count,
  o.closing_move,
  o.examiner_note,
  o.approved,
  o.generation_model,
  q.question_text,
  q.exam_year
from question_outlines o
join past_questions q on q.id = o.question_id
where o.note_id = (select id from notes order by generated_at desc limit 1);
```

Expected: 1 row, `move_count = 3`, `approved = false`, `generation_model = 'claude-haiku-4-5-20251001'`.

- [ ] **Step 3: Happy path — poet with multiple matching questions**

Generate a note for W.B. Yeats (HL 2027) if you have 3+ past questions for Yeats. Expected: `outlines` event reports `matched: 3, generated: 3`, SQL query returns 3 rows all with `move_count = 3`.

- [ ] **Step 4: Empty case — poet with zero past questions**

Generate a note for a content type or poet not present in `past_questions` (e.g. a comparative note, or a poet whose questions haven't been seeded). Expected: `outlines` event fires with `matched: 0, generated: 0`, `note: "no_past_questions"`. Note saves cleanly. No `outlinesSave` event fires.

- [ ] **Step 5: Spot-check quote fidelity**

Pick any `body_moves` row from Step 2. For each of the 3 body moves, confirm the `quote` field appears verbatim in the parent note's `quotes` column:

```sql
select
  n.quotes,
  o.body_moves
from question_outlines o
join notes n on n.id = o.note_id
where o.note_id = (select id from notes order by generated_at desc limit 1);
```

In the result, each `body_moves[*].quote` value should appear as a string in the `quotes` array. Spot-check at least 5 quotes across all outline rows.

- [ ] **Step 6: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "phase3(outline): fixups from manual verification"
```

---

## Spec Coverage Check (self-review)

| Requirement | Task |
|-------------|------|
| Model locked to `claude-haiku-4-5-20251001` | Task 5 (`OUTLINE_MODEL` constant) |
| One outline per matching past question, no cap | Task 7/8 (`findMatchingQuestions` + `runWithConcurrency`) |
| Empty case emits `outlines.matched: 0`, note saves | Task 7/8 (zero-match branch) |
| Outlines generated after extraction, before save | Task 7/8 (ordering in block) |
| Concurrency cap of 3 | Task 7/8 (`runWithConcurrency(matches, 3, ...)`) |
| `approved = false` on insert | Task 6 (`saveOutlines`) |
| `body_moves` exactly 3 entries enforced | Task 5 (`isValidShape` checks `length !== 3`) |
| Quotes verbatim from extracted list, not invented | Task 4 (`buildOutlineSystemPrompt` ABSOLUTE RULES) |
| `outlines` SSE event before `save` event | Task 7 (ordering) |
| `outlinesSave` SSE event after `save` event | Task 7 (ordering) |
| Hook exposes both new SSE event fields | Task 9 |
| Sync route mirrors streaming route | Task 8 |
| No tier gating in Phase 3 | Not implemented — correct |
| No frontend render in Phase 3 | Not implemented — correct |
| `buildOutlineSystemPrompt` in `prompts.ts` | Task 4 |
| `runWithConcurrency` in `lib/util/concurrency.ts` | Task 1 |
