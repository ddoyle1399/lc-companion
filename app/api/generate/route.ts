import { NextRequest } from "next/server";
import { marked } from "marked";
import https from "node:https";
import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "@/lib/claude/client";
import {
  buildSystemPrompt,
  buildPoetryNotePrompt,
  buildComparativePrompt,
  buildWorksheetPrompt,
  buildCriticInput,
  buildStanzaPlan,
  type PoemMetadata,
  type PoemQuote,
  buildSlidesPrompt,
  buildSingleTextPrompt,
  buildUnseenPoetryPrompt,
  buildComprehensionPrompt,
  buildCompositionPrompt,
  PromptContext,
} from "@/lib/claude/prompts";
import { runCriticPass, formatFlagsForRetry } from "@/lib/claude/critic";
import { buildPoetExamSummary, buildComparativeExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { findProfileByTitle } from "@/data/profiles/comparative";
import { getPoemText } from "@/lib/poems/store";
import { saveNote } from "@/lib/supabase/saveNote";
import { mapPromptContextToNoteInput } from "@/lib/supabase/mapPromptContextToNoteInput";
import { getServerSupabase } from "@/lib/supabase/server";
import { extractQuotesAndThemes } from "@/lib/claude/extractQuotesAndThemes";
import { generateOutline, type OutlineSuccess } from "@/lib/claude/generateOutline";
import { findMatchingQuestions } from "@/lib/supabase/findMatchingQuestions";
import { saveOutlines } from "@/lib/supabase/saveOutlines";
import { runWithConcurrency } from "@/lib/util/concurrency";

function makeFreshAnthropicClient(): Anthropic {
  const agent = new https.Agent({ keepAlive: false });
  const freshFetch: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = ((init?.method ?? "POST") as string).toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers as HeadersInit).forEach((v, k) => { headers[k] = v; });
    }
    const body = init?.body != null ? String(init.body) : undefined;
    return new Promise<Response>((resolve, reject) => {
      const parsed = new URL(url);
      const req = https.request(
        { hostname: parsed.hostname, port: 443, path: parsed.pathname + parsed.search, method, headers, agent },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode!, headers: res.headers as Record<string, string> })));
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  };
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, fetch: freshFetch });
}

// Strips [VERIFY], [CHECK], [TODO], [NOTE] and similar bracketed internal markers
// from streamed text, handling markers that may span chunk boundaries.
function createVerifyStripper(poem?: string) {
  let buffer = "";
  const PATTERN = /\[(?:VERIFY|CHECK|TODO|NOTE)[^\]]*\]/gi;
  const MAX_LOOKAHEAD = 60;

  function process(incoming: string, flush = false): string {
    buffer += incoming;

    if (flush) {
      const cleaned = buffer.replace(PATTERN, (match) => {
        console.warn(
          `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
        );
        return "";
      });
      buffer = "";
      return cleaned;
    }

    const lastOpen = buffer.lastIndexOf("[");
    if (lastOpen === -1 || buffer.length - lastOpen > MAX_LOOKAHEAD) {
      const safe = lastOpen === -1 ? buffer : buffer.slice(0, lastOpen);
      const hold = lastOpen === -1 ? "" : buffer.slice(lastOpen);
      const cleaned = safe.replace(PATTERN, (match) => {
        console.warn(
          `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
        );
        return "";
      });
      buffer = hold;
      return cleaned;
    }

    const safe = buffer.slice(0, lastOpen);
    buffer = buffer.slice(lastOpen);
    return safe.replace(PATTERN, (match) => {
      console.warn(
        `Warning: verification marker stripped from output${poem ? ` for "${poem}"` : ""}: ${match}`
      );
      return "";
    });
  }

  return { process };
}

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

const FALLBACK_MESSAGE = `This note is being reviewed for accuracy and is temporarily unavailable. Please try another poem from your selection, or check back shortly.`;

// Race a promise against a timeout. Returns null on timeout so the caller can
// decide whether to fall through or escalate. This prevents a hung Anthropic
// socket from holding the SSE stream open indefinitely.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const t = setTimeout(() => {
      console.error(`[generate] ${label} timed out after ${ms}ms`);
      resolve(null);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        console.error(`[generate] ${label} threw:`, err);
        resolve(null);
      }
    );
  });
}

// Critic + retry are slow on long Heaney notes (full anchored quote bank,
// historical context, technique glossary). Audit data shows round-1 critic
// alone routinely runs 40-90s, occasionally pushing past 100s. 150s gives
// headroom without letting a truly hung socket wedge the stream forever.
const CRITIC_TIMEOUT_MS = 150_000;
const RETRY_GEN_TIMEOUT_MS = 150_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, circular, level, contentType, userInstructions } = body;

    if (!year || !level || !contentType) {
      return errorResponse("Missing required fields: year, level, contentType");
    }

    const context: PromptContext = {
      year,
      circular: circular || "0016/2024",
      level,
      contentType,
      userInstructions,
    };

    let userPrompt: string;
    let poetrySystemOverride: string | undefined;
    let poetryPromptCtx: PromptContext | undefined;
    let useWebSearch = false;
    let webSearchMaxUses = 3;

    switch (contentType) {
      case "poetry": {
        const { poet, poem, textbookAnalysis } = body;
        if (!poet || !poem) {
          return errorResponse("Poetry notes require poet and poem");
        }
        context.poet = poet;
        context.poem = poem;
        context.examSummary = buildPoetExamSummary(poet);

        const prescribedPoems = level === "HL"
          ? getPoemsForPoet(year, poet)
          : getOLPoemsForPoet(year, poet);
        context.prescribedPoems = prescribedPoems;

        if (poem) {
          const storedText = await getPoemText(poet, poem);
          if (storedText) {
            context.poemText = storedText;
          }
        }

        if (textbookAnalysis) {
          context.textbookAnalysis = textbookAnalysis;
        }

        // Read metadata and quotes from the most recent saved note for this poem.
        // These are set manually or by the extraction pipeline after first generation.
        try {
          const supabase = getServerSupabase();
          const { data: existingNote, error: noteError } = await supabase
            .from("notes")
            .select("id, status, content_type, subject_key, sub_key, metadata, quotes")
            .eq("content_type", "poem_notes")
            .eq("subject_key", poet)
            .eq("sub_key", poem)
            .eq("status", "verified")
            .limit(1)
            .maybeSingle();

          console.log("[poetry-debug-query]", {
            poet,
            poem,
            error: noteError?.message ?? null,
            rowFound: !!existingNote,
            rowId: existingNote?.id ?? null,
            rowStatus: existingNote?.status ?? null,
          });

          // If verified query found nothing, log all rows for this poem to diagnose
          if (!existingNote) {
            const { data: allRows } = await supabase
              .from("notes")
              .select("id, status, content_type, subject_key, sub_key")
              .eq("subject_key", poet)
              .eq("sub_key", poem)
              .limit(5);
            console.log("[poetry-debug-allrows]", allRows ?? []);
          }

          if (existingNote?.metadata) {
            const m = existingNote.metadata as Record<string, unknown>;
            context.poemMetadata = {
              total_lines: m.total_lines as PoemMetadata["total_lines"],
              stanza_breaks: m.stanza_breaks as PoemMetadata["stanza_breaks"],
              section_breaks: m.section_breaks as PoemMetadata["section_breaks"],
              form: m.form as PoemMetadata["form"],
              structure_confidence: m.structure_confidence as PoemMetadata["structure_confidence"],
              quote_text_anchored: m.quote_text_anchored as PoemMetadata["quote_text_anchored"],
              edition_source: m.edition_source as PoemMetadata["edition_source"],
              historical_context: m.historical_context as PoemMetadata["historical_context"],
              named_figures: m.named_figures as PoemMetadata["named_figures"],
              textual_variants: m.textual_variants as PoemMetadata["textual_variants"],
            };
          }

          if (existingNote?.quotes) {
            context.structuredQuotes = existingNote.quotes as Array<string | PoemQuote>;
          }

          const { data: siblings } = await supabase
            .from("notes")
            .select("sub_key, metadata")
            .eq("content_type", "poem_notes")
            .eq("subject_key", poet)
            .eq("status", "verified")
            .neq("sub_key", poem);

          const studentYearStr = String(year);
          context.availablePairings = (siblings ?? [])
            .filter((s) => {
              const years = (s.metadata as Record<string, unknown>)?.selection_years as string[] ?? [];
              return years.length === 0 || years.includes(studentYearStr);
            })
            .map((s) => ({
              subject_key: poet,
              sub_key: s.sub_key as string,
              one_line_summary: (s.metadata as Record<string, unknown>)?.one_line_summary as string | undefined,
            }));
        } catch (err) {
          console.warn("[poetry-debug] metadata lookup failed, continuing without it", err);
        }

        // PERMANENT GUARD — refuse to generate unless strict-mode prerequisites are met.
        // The legacy fallback in buildPoetrySystemPrompt produces unreliable output
        // (cross-poet pairings, thin stanzas, fabricated historical claims). Never
        // let it run. If this fires, the fix is upstream: add a verified poem_notes
        // row with a full anchored quote bank and structural metadata.
        {
          const _meta = context.poemMetadata;
          const _quotes = context.structuredQuotes ?? [];
          const _reasons: string[] = [];
          if (!_meta) {
            _reasons.push('no verified poem_notes row found for this poet/poem');
          } else {
            if (_meta.structure_confidence !== 'high') {
              _reasons.push(`structure_confidence=${String(_meta.structure_confidence ?? 'missing')} (need "high")`);
            }
            if (_meta.quote_text_anchored !== true) {
              _reasons.push(`quote_text_anchored=${String(_meta.quote_text_anchored ?? 'missing')} (need true)`);
            }
          }
          if (_quotes.length === 0) {
            _reasons.push('no anchored quotes');
          }
          if (_reasons.length > 0) {
            console.error('[poetry-strict-guard] blocked generation', { poet, poem, reasons: _reasons });
            return errorResponse(
              `Cannot generate "${poem}" by ${poet}: strict-mode prerequisites missing (${_reasons.join('; ')}). Add a verified poem_notes row with structure_confidence="high", quote_text_anchored=true, and an anchored quote bank before generating.`,
              422
            );
          }
        }

        context.studentYear = String(year) as '2026' | '2027';

        console.log("[poetry-debug]", {
          hasMetadata: !!context.poemMetadata,
          conf: context.poemMetadata?.structure_confidence,
          quoteCount: context.structuredQuotes?.length ?? 0,
          pairingCount: context.availablePairings?.length ?? 0,
        });

        useWebSearch = !context.poemText;
        {
          poetryPromptCtx = {
            ...context,
            subject: poet,
            subKey: poem,
            metadata: context.poemMetadata,
            quotes: context.structuredQuotes?.filter((q): q is PoemQuote => typeof q !== 'string'),
          };
          const { system: pSystem, user: pUser } = buildPoetryNotePrompt(poetryPromptCtx);
          poetrySystemOverride = pSystem;
          userPrompt = pUser;
        }
        break;
      }

      case "comparative": {
        const {
          comparativeMode,
          comparativeTexts,
          comparativeNoteType,
          comparativeCharacterName,
          comparativeArgumentFocus,
          comparativeQuestionText,
          comparativeQuestionFormat,
        } = body;

        const noteType = comparativeNoteType || "mode_grid";

        // Note types are organised in three families with different input requirements.
        // Single-text family: 1 text. Cross-text family: 3 texts. Question family: 3 texts + question.
        const singleTextNoteTypes = new Set([
          "text_full_breakdown",
          "text_character",
          "text_key_moments",
          "text_mode_profile",
          "text_relationships",
          "text_quote_bank",
        ]);
        const crossTextNoteTypes = new Set([
          "mode_grid",
          "comparison_grid_table",
          "comparative_argument",
          "sample_paragraph",
        ]);
        const questionNoteTypes = new Set([
          "question_plan",
          "sample_answer",
        ]);

        if (singleTextNoteTypes.has(noteType)) {
          if (!comparativeTexts || comparativeTexts.length !== 1) {
            return errorResponse(
              `Comparative ${noteType} requires exactly 1 text (got ${comparativeTexts?.length ?? 0})`
            );
          }
          if (noteType === "text_character" && !comparativeCharacterName) {
            return errorResponse("text_character requires a comparativeCharacterName");
          }
          if (noteType === "text_mode_profile" && !comparativeMode) {
            return errorResponse("text_mode_profile requires a comparativeMode");
          }
        } else if (crossTextNoteTypes.has(noteType)) {
          if (!comparativeMode || !comparativeTexts || comparativeTexts.length !== 3) {
            return errorResponse(
              `Comparative ${noteType} requires a mode and exactly 3 texts`
            );
          }
          if (
            (noteType === "comparative_argument" || noteType === "sample_paragraph") &&
            !comparativeArgumentFocus
          ) {
            return errorResponse(
              `Comparative ${noteType} requires a comparativeArgumentFocus`
            );
          }
        } else if (questionNoteTypes.has(noteType)) {
          if (!comparativeTexts || comparativeTexts.length !== 3) {
            return errorResponse(
              `Comparative ${noteType} requires exactly 3 texts`
            );
          }
          if (!comparativeQuestionText) {
            return errorResponse(
              `Comparative ${noteType} requires comparativeQuestionText`
            );
          }
          if (!comparativeQuestionFormat) {
            return errorResponse(
              `Comparative ${noteType} requires comparativeQuestionFormat (Q1a_30 / Q1b_40 / Q2_70)`
            );
          }
        } else {
          return errorResponse(`Unknown comparativeNoteType: ${noteType}`);
        }

        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;
        context.comparativeNoteType = noteType;
        context.comparativeCharacterName = comparativeCharacterName;
        context.comparativeArgumentFocus = comparativeArgumentFocus;
        context.comparativeQuestionText = comparativeQuestionText;
        context.comparativeQuestionFormat = comparativeQuestionFormat;
        if (comparativeMode) {
          context.comparativeExamPattern = buildComparativeExamSummary(comparativeMode);
        }

        // Look up verified profiles for each text. Parallel array to comparativeTexts;
        // null entries mean "no profile yet, fall back to web search for that text".
        const texts = (comparativeTexts as Array<{ title: string }>) ?? [];
        context.comparativeProfiles = texts.map((t) =>
          findProfileByTitle(year, t.title)
        );
        const profileCount = context.comparativeProfiles.filter(
          (p) => p != null
        ).length;
        const allProfiled = profileCount === texts.length && texts.length > 0;

        // If every text has a profile, web search is unnecessary. Otherwise still
        // allow web search so the model can verify quotes for unprofiled texts.
        useWebSearch = !allProfiled;
        webSearchMaxUses = allProfiled ? 0 : 5;
        userPrompt = buildComparativePrompt(context);
        break;
      }

      case "worksheet": {
        const { worksheetContentType, activityTypes, poet, poem, author, textTitle, comparativeMode, comparativeTexts } = body;
        context.worksheetContentType = worksheetContentType;
        context.activityTypes = activityTypes;
        context.poet = poet;
        context.poem = poem;
        context.author = author;
        context.textTitle = textTitle;
        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;

        useWebSearch = true;
        userPrompt = buildWorksheetPrompt(context);
        break;
      }

      case "slides": {
        const { slidesContentType, poet, poem, author, textTitle, comparativeMode, comparativeTexts } = body;
        context.slidesContentType = slidesContentType;
        context.poet = poet;
        context.poem = poem;
        context.author = author;
        context.textTitle = textTitle;
        context.comparativeMode = comparativeMode;
        context.comparativeTexts = comparativeTexts;

        useWebSearch = true;
        userPrompt = buildSlidesPrompt(context);
        break;
      }

      case "single_text": {
        const { author, textTitle, textType } = body;
        if (!author || !textTitle) {
          return errorResponse("Single text notes require author and textTitle");
        }
        context.author = author;
        context.textTitle = textTitle;
        context.textType = textType;

        // Reuse the comparative profile for single-text notes. Same text
        // knowledge powers both Paper 2 questions; no point regenerating.
        const profile = findProfileByTitle(year, textTitle);
        context.singleTextProfile = profile;

        // If a profile is present, web search is unnecessary. Prompt rules
        // require the model to anchor in the substrate and quote only from
        // the bank.
        useWebSearch = !profile;
        webSearchMaxUses = profile ? 0 : 5;
        userPrompt = buildSingleTextPrompt(context);
        break;
      }

      case "unseen_poetry": {
        useWebSearch = false;
        userPrompt = buildUnseenPoetryPrompt(context);
        break;
      }

      case "comprehension": {
        const { focusArea } = body;
        context.focusArea = focusArea || "both";

        useWebSearch = false;
        userPrompt = buildComprehensionPrompt(context);
        break;
      }

      case "composition": {
        const { compositionType } = body;
        if (!compositionType) {
          return errorResponse("Composition notes require a compositionType");
        }
        context.compositionType = compositionType;

        useWebSearch = false;
        userPrompt = buildCompositionPrompt(context);
        break;
      }

      default:
        return errorResponse(`Content type "${contentType}" is not supported`);
    }

    const systemPrompt = poetrySystemOverride ?? buildSystemPrompt(context);
    const client = getClient();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      ...(useWebSearch
        ? {
            tools: [
              {
                type: "web_search_20250305" as const,
                name: "web_search" as const,
                max_uses: webSearchMaxUses,
              },
            ],
          }
        : {}),
    });

    const encoder = new TextEncoder();
    const stripper = createVerifyStripper(context.poem ?? context.textTitle);
    const readableStream = new ReadableStream({
      async start(controller) {
        let accumulatedText = "";

        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const cleaned = stripper.process(event.delta.text);
              if (cleaned) {
                accumulatedText += cleaned;
                const chunk = `data: ${JSON.stringify({ text: cleaned })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            }
            if (
              event.type === "content_block_start" &&
              event.content_block.type === "server_tool_use" &&
              event.content_block.name === "web_search"
            ) {
              const status = `data: ${JSON.stringify({ status: "searching" })}\n\n`;
              controller.enqueue(encoder.encode(status));
            }
          }

          const tail = stripper.process("", true);
          if (tail) {
            accumulatedText += tail;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: tail })}\n\n`));
          }

          // Critic pass + retry + audit (strict-mode poetry only).
          // Critic requires anchored quotes — skip for legacy-mode poems where anchoredQuotes is empty.
          const _criticMeta = poetryPromptCtx?.metadata ?? {};
          const _isStrictMode =
            _criticMeta.structure_confidence === 'high' && _criticMeta.quote_text_anchored === true;

          if (accumulatedText && context.contentType === "poetry" && poetrySystemOverride && poetryPromptCtx && _isStrictMode) {
            const poetCtx = poetryPromptCtx;
            const criticStartMs = Date.now();

            // Audit variables declared outside try so audit always runs even if critic throws.
            let auditStatus: 'success' | 'retry_success' | 'fallback' | 'critic_error' | 'audit_failed' = 'critic_error';
            let initialBlockCount = 0;
            let finalBlockCount = 0;
            let finalWarnCount = 0;
            let finalBlockFlags: import('@/lib/claude/critic').CriticFlag[] = [];
            let finalWarnFlags: import('@/lib/claude/critic').CriticFlag[] = [];
            let finalText = accumulatedText;
            let criticResult: import('@/lib/claude/critic').CriticResult | null = null;

            try {
              // Round 1 critic — fresh client, 60s timeout.
              const criticClient1 = makeFreshAnthropicClient();
              criticResult = await withTimeout(
                runCriticPass(criticClient1, buildCriticInput(accumulatedText, poetCtx)),
                CRITIC_TIMEOUT_MS,
                'round-1 critic'
              );
              if (!criticResult) {
                // Critic hung. Ship the streamed text unaudited.
                auditStatus = 'critic_error';
                throw new Error('critic timed out');
              }
              initialBlockCount = criticResult.blockFlags.length;
              finalBlockCount = criticResult.blockFlags.length;
              finalWarnCount = criticResult.warnFlags.length;
              finalBlockFlags = criticResult.blockFlags;
              finalWarnFlags = criticResult.warnFlags;
              auditStatus = 'success';

              if (criticResult.blockFlags.length > 0) {
                const meta = poetCtx.metadata ?? {};
                const expectedStanzaCount = (meta.stanza_breaks ?? []).length;
                const stanzaCountFlag = criticResult.blockFlags.find(
                  (f) =>
                    f.section?.toLowerCase().includes('stanza') &&
                    /stanza.count|stanza.*count|count mismatch|actual_count|expected_count|stanza-by-stanza/i.test(
                      f.issue ?? ''
                    )
                );

                const structuralEmphasis =
                  expectedStanzaCount > 0 && stanzaCountFlag
                    ? [
                        ``,
                        `=== STRUCTURAL CORRECTION ===`,
                        `Your previous attempt did not produce the required number of Stanza-by-Stanza blocks.`,
                        `The poem has EXACTLY ${expectedStanzaCount} stanzas. Produce exactly ${expectedStanzaCount} "Stanza K" blocks numbered 1 through ${expectedStanzaCount}.`,
                        `Do not merge, split, renumber, or invent sub-stanzas. Follow the STRUCTURAL CONTRACT in the system prompt verbatim.`,
                        ``,
                        buildStanzaPlan(meta),
                        `=============================`,
                      ].join('\n')
                    : '';

                // Build QUOTE CORRECTION block for quote-mismatch flags.
                const normalizeQuote = (s: string): string =>
                  s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

                const quoteFlags = criticResult.blockFlags.filter((f) => {
                  const issue = f.issue.toLowerCase();
                  return (
                    issue.includes('quote') &&
                    (issue.includes('mismatch') ||
                      issue.includes('capital') ||
                      issue.includes('character') ||
                      issue.includes('exact') ||
                      issue.includes('verbatim'))
                  );
                });

                const anchoredQuotes = poetCtx.quotes ?? [];
                const quoteCorrectionItems: string[] = [];
                for (const qf of quoteFlags) {
                  const normFlag = normalizeQuote(qf.line_or_quote);
                  const matched = anchoredQuotes.find(
                    (aq) => normalizeQuote(aq.text) === normFlag
                  );
                  if (matched) {
                    quoteCorrectionItems.push(
                      `Replace: "${qf.line_or_quote}"\n   With (exact): "${matched.text}"`
                    );
                  } else {
                    console.log(
                      `[generate] quote correction: no anchored match for "${qf.line_or_quote}" — skipping`
                    );
                  }
                }

                const quoteCorrection =
                  quoteCorrectionItems.length > 0
                    ? [
                        ``,
                        `=== QUOTE CORRECTION ===`,
                        `The previous draft contained quote text that does not match the anchored quote bank. Replace each flagged quote with the exact anchored text, character-for-character, including capitalisation and punctuation:`,
                        ``,
                        ...quoteCorrectionItems.map((item, i) => `${i + 1}. ${item}`),
                        ``,
                        `Every quote in your note must match its entry in ANCHORED QUOTES character-for-character.`,
                        `========================`,
                      ].join('\n')
                    : '';

                // Pass warn flags to retry too. We are already paying the cost of
                // regenerating; might as well clean surface issues (figurative "landscape",
                // cautioned devices, textual variants not flagged) at the same time.
                const warnForRetry = criticResult.warnFlags.length > 0
                  ? [
                      ``,
                      `The previous attempt also had the following warn-level issues. Fix these too while you are rewriting:`,
                      formatFlagsForRetry(criticResult.warnFlags),
                    ].join('\n')
                  : '';

                const retryUser = [
                  userPrompt,
                  ``,
                  `Your previous attempt had the following issues. Rewrite the note to resolve every block flag:`,
                  formatFlagsForRetry(criticResult.blockFlags),
                  warnForRetry,
                  quoteCorrection,
                  structuralEmphasis,
                ]
                  .filter((s) => s !== '')
                  .join('\n');

                // Retry generation — streaming keeps TCP active during long generations.
                // SSE tokens flow continuously so no intermediary can close the idle connection.
                // 90s timeout prevents a hung socket from blocking the stream close.
                let retryText = '';
                try {
                  // 300ms delay: lets the undici connection pool discard any stale keep-alive socket
                  await new Promise((r) => setTimeout(r, 300));
                  const retryClient = makeFreshAnthropicClient();
                  const retryStream = retryClient.messages.stream({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 8000,
                    system: poetrySystemOverride,
                    messages: [{ role: 'user', content: retryUser }],
                  });
                  const retryMsg = await withTimeout(
                    retryStream.finalMessage(),
                    RETRY_GEN_TIMEOUT_MS,
                    'retry generation'
                  );
                  if (retryMsg) {
                    const retryBlock = retryMsg.content.find((b: any) => b.type === 'text') as
                      | { type: 'text'; text: string }
                      | undefined;
                    retryText = retryBlock?.text ?? '';
                  }
                } catch (retryConnErr) {
                  console.error('[generate] retry generation failed:', retryConnErr);
                }

                if (retryText) {
                  // Round 2 critic — fresh client, 60s timeout.
                  try {
                    const criticClient2 = makeFreshAnthropicClient();
                    const retryCriticResult = await withTimeout(
                      runCriticPass(criticClient2, buildCriticInput(retryText, poetCtx)),
                      CRITIC_TIMEOUT_MS,
                      'round-2 critic'
                    );
                    if (!retryCriticResult) {
                      // Round-2 critic timed out — ship the retry draft but flag the audit failure.
                      finalText = retryText;
                      auditStatus = 'audit_failed';
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ replace: retryText })}\n\n`));
                    } else {
                      finalBlockFlags = retryCriticResult.blockFlags;
                      finalWarnFlags = retryCriticResult.warnFlags;
                      finalBlockCount = retryCriticResult.blockFlags.length;
                      finalWarnCount = retryCriticResult.warnFlags.length;
                      // Sentinel flag means the critic itself failed structurally (tool not invoked),
                      // not a real content finding. Ship the retry but mark as audit_failed.
                      const isSentinelFailure = retryCriticResult.blockFlags.some(
                        (f) => f.issue === 'Critic did not invoke the tool.'
                      );
                      finalText = retryText;
                      auditStatus = isSentinelFailure ? 'audit_failed' : 'retry_success';
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ replace: retryText })}\n\n`));
                    }
                  } catch (critic2Err) {
                    console.error('[generate] round-2 critic failed:', critic2Err);
                    // Round-2 critic threw — ship the retry draft but flag the audit failure.
                    finalText = retryText;
                    auditStatus = 'audit_failed';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ replace: retryText })}\n\n`));
                  }
                } else {
                  // Retry generation itself failed — show fallback message (no usable content)
                  auditStatus = 'fallback';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ fallback: FALLBACK_MESSAGE })}\n\n`));
                }
              }
            } catch (criticErr) {
              console.error('[generate] critic pass failed:', criticErr);
            }

            // Critic event — always emitted (skipped only if round-1 threw before producing a result)
            if (criticResult) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    critic: {
                      status: finalBlockCount > 0 ? 'block' : finalWarnCount > 0 ? 'warn' : 'clean',
                      blockFlags: finalBlockFlags,
                      warnFlags: finalWarnFlags,
                    },
                  })}\n\n`
                )
              );
            }

            // Audit log — always written regardless of retry/critic outcome
            const elapsedMs = Date.now() - criticStartMs;
            try {
              const supabaseAudit = getServerSupabase();
              const { error: auditInsertErr } = await supabaseAudit.from('generation_audit').insert({
                subject_key: poetCtx.subject,
                sub_key: poetCtx.subKey,
                status: auditStatus,
                elapsed_ms: elapsedMs,
                block_flag_count_initial: initialBlockCount,
                block_flag_count_final: finalBlockCount,
                warn_flag_count: finalWarnCount,
                block_flags: finalBlockFlags,
                warn_flags: finalWarnFlags,
              });
              if (auditInsertErr) {
                console.error('[generate] audit insert error:', auditInsertErr.message, auditInsertErr.code);
              }
            } catch (auditErr) {
              console.error('[generate] audit log failed:', auditErr);
            }

            // Audit debug SSE event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  audit: {
                    status: auditStatus,
                    blocksFinal: finalBlockCount,
                    warnsFinal: finalWarnCount,
                    elapsedMs,
                  },
                })}\n\n`
              )
            );

            if (finalText !== accumulatedText) {
              accumulatedText = finalText;
            }
          }

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
              const outlineLevel: "higher" | "ordinary" = context.level === "HL" ? "higher" : "ordinary";

              if (subjectKey) {
                const matches = await findMatchingQuestions({ subjectKey, level: outlineLevel });

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

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return errorResponse("Failed to generate content", 500);
  }
}
