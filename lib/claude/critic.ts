/**
 * lib/claude/critic.ts
 *
 * Critic pass for generated poetry notes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CriticInput } from './prompts';

export interface CriticFlag {
  severity: 'block' | 'warn';
  section: string;
  line_or_quote: string;
  issue: string;
  recommended_fix: string;
  is_confirmed_violation: boolean;
}

export interface CriticResult {
  blockFlags: CriticFlag[];
  warnFlags: CriticFlag[];
  rawResponse: string;
}

const CRITIC_SYSTEM_PROMPT = `
You are a senior Leaving Certificate Higher Level English teacher auditing a
study note written by an AI. Your job is to catch errors that would embarrass
the teacher in front of students or cost marks in a Higher Level essay.

You check the note against the row's authorised metadata. Anything in the note
that is not supported by that metadata is a flag.

Block-level flags (hard fail, regenerate):
1. Any quote in the note not present in anchored_quotes (character-for-character).
   Tolerances (do NOT flag these):
   a. A single trailing period or comma present in one version but absent in the other.
   b. A leading capital on the first word where the anchored version has lowercase (quotes
      naturally get capitalised when they open a sentence — this is editorial, not a mismatch).
   Flag only when the body of the quote contains a genuine word or punctuation difference.
2. Any technique label not in the controlled glossary (check the glossary section).
   ONLY block when the label itself is absent from the glossary. Do NOT block a label
   that IS present in the glossary even if you believe another label would be more
   appropriate — flag that preference as warn only.
3. Any factual claim (date, person, event, source text) not present in
   historical_context.real_world_events, historical_context.source_texts,
   historical_context.biographical_anchors, or named_figures.
   SKIP this check entirely if all three of real_world_events, source_texts, and
   biographical_anchors are absent or empty arrays — an empty context cannot verify claims.
   EXEMPT: The Pairings section. Pairing rationale (why two poems share a theme or technique)
   is literary judgment, not a verifiable factual claim. Only apply rule 4 to pairings
   (check the poem IS in available_pairings) — do not apply rule 3 to pairing descriptions.
   EXEMPT: Well-established cultural symbolism (e.g. dove = peace, unicorn = purity and
   nobility, rose = love). These are general cultural knowledge, not poem-specific factual
   claims. Do not flag them unless directly contradicted by historical_context.
4. Any pairing not in available_pairings.
5. A mandatory section missing (Overview, Form and Structure, Stanza-by-Stanza,
   Themes, Tone, Exam Use, Pairings).
6. Ignoring a disputed_readings.guidance instruction (e.g. framing 1920s killings
   as Troubles-era when guidance says otherwise).
   SKIP entirely if disputed_readings is null or not provided — do not invent disputed
   readings rules that are not present in the input data.
7. Banned labels used: "biblical echoes", "the poet masterfully", bare "captures"
   or "evokes" with nothing specified.
8. Stanza count mismatch. If STRUCTURAL CONTRACT specifies EXPECTED_STANZA_COUNT = N,
   the Stanza-by-Stanza section MUST contain exactly N "Stanza K" blocks
   numbered 1 through N. More, fewer, re-numbered, merged, or invented
   sub-stanzas is a block-level failure. Report actual_count vs expected_count
   in the issue text so the retry prompt can fix it.
9. Apostrophe or direct-address mislabelling. Apostrophe or direct-address is
   claimed in the note, but the quoted line contains no second-person pronoun or
   vocative. "Apostrophe" requires the speaker addressing an absent or dead subject
   with "you", "thou", or a vocative name. A first-person declaration that merely
   mentions the subject in third person ("I will go to Aarhus / To see his
   peat-brown head") is NOT apostrophe. Flag as block and propose the correct
   technique (declarative statement, third-person description, intention, whatever
   fits).
10. Internal spelling/word-form inconsistency. The note spells or refers to the
    same distinctive word two different ways within the same note (e.g. "tumbril"
    in one subsection and "tumbrel" in another; "Nebelgard" once and "Nebelgård"
    elsewhere). Block and fix to the spelling used in anchored_quotes. If the word
    is not in anchored_quotes, block and require a single consistent spelling
    throughout.
11. Asymmetric stanza sections. Stanza-by-Stanza blocks are structurally asymmetric
    in a way that suggests the analysis is incomplete. If most stanzas have both a
    "Technique" subsection and a "Use in an essay" subsection, and one or more
    stanzas lack one of those subsections (and are not explicitly flagged as
    transitional with a "Function in the poem" subsection that serves the same
    role), flag as block. Every stanza must have either the standard
    three-subsection shape (Plain meaning / Technique / Use in an essay) or the
    explicit transitional shape (Plain meaning / Function in the poem) with clear
    justification.
    CRITICAL EXCEPTION: A stanza that uses "Function in the poem" is by definition
    in the transitional shape. Do NOT flag it under rule 11, even if all other
    stanzas use the standard shape. The two shapes are both valid and can coexist.

Warn-level flags (non-blocking, log for review):
1. Thin or speculative readings (overreach rule).
2. Spelling mismatch between a quoted word and its gloss within 150 words.
3. Section length outside target range.
4. Named figure present in named_figures but not used when the relevant quote appears.
5. Textual variant exists for a line the note quotes, and the variant is not mentioned.
6. Section-level inconsistency on a structural detail (e.g., volta line number differs between
   Form and Structure and Stanza analysis by one or two lines). These are cosmetic, not
   factual errors — flag as warn only.

Be conservative on blocks. Only block when you can point to a clear rule violation.
Everything else is a warn.

If the note is clean, call report_critic_findings with empty arrays for both blockFlags and warnFlags.

When you use the report_critic_findings tool, only include findings that are confirmed violations
with is_confirmed_violation: true. If you find yourself writing "actually this is fine" or
"retracting" or "no action needed" inside a flag's issue or recommended_fix field, DO NOT include
that flag. If you are unsure, set is_confirmed_violation: false and the caller will filter it out.
Do NOT use the issue or recommended_fix fields as a scratchpad for reasoning.
`.trim();

const CRITIC_TOOL = {
  name: 'report_critic_findings',
  description:
    'Report block flags and warn flags found in the generated poetry note. ' +
    'Only include a finding if you have already decided it is a real violation. ' +
    'Do not include retracted, uncertain, or self-doubted findings. ' +
    'Set is_confirmed_violation to true only when you are certain; set to false for soft or speculative findings and they will be filtered out.',
  input_schema: {
    type: 'object',
    properties: {
      blockFlags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['block'] },
            section: { type: 'string' },
            line_or_quote: { type: 'string' },
            issue: { type: 'string' },
            recommended_fix: { type: 'string' },
            is_confirmed_violation: { type: 'boolean' },
          },
          required: [
            'severity',
            'section',
            'line_or_quote',
            'issue',
            'recommended_fix',
            'is_confirmed_violation',
          ],
        },
      },
      warnFlags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['warn'] },
            section: { type: 'string' },
            line_or_quote: { type: 'string' },
            issue: { type: 'string' },
            recommended_fix: { type: 'string' },
            is_confirmed_violation: { type: 'boolean' },
          },
          required: [
            'severity',
            'section',
            'line_or_quote',
            'issue',
            'recommended_fix',
            'is_confirmed_violation',
          ],
        },
      },
    },
    required: ['blockFlags', 'warnFlags'],
  },
} as const;

function buildCriticUserMessage(input: CriticInput): string {
  const structuralBlock =
    input.stanzaPlan && input.expectedStanzaCount
      ? [
          `=== STRUCTURAL CONTRACT ===`,
          `EXPECTED_STANZA_COUNT = ${input.expectedStanzaCount}`,
          ``,
          input.stanzaPlan,
          ``,
        ]
      : [`=== STRUCTURAL CONTRACT ===`, `(not available for this row)`, ``];

  return [
    `=== GENERATED NOTE ===`,
    input.generatedNote,
    ``,
    ...structuralBlock,
    `=== ANCHORED QUOTES ===`,
    JSON.stringify(input.anchoredQuotes, null, 2),
    ``,
    `=== HISTORICAL CONTEXT ===`,
    JSON.stringify(input.historicalContext ?? {}, null, 2),
    ``,
    `=== NAMED FIGURES ===`,
    JSON.stringify(input.namedFigures, null, 2),
    ``,
    `=== TEXTUAL VARIANTS ===`,
    JSON.stringify(input.textualVariants, null, 2),
    ``,
    `=== AVAILABLE PAIRINGS ===`,
    JSON.stringify(input.availablePairings, null, 2),
    ``,
    `=== TECHNIQUE GLOSSARY ===`,
    input.techniqueGlossary,
    ``,
    `Now audit the note and call the report_critic_findings tool with your findings.`,
  ].join('\n');
}

export async function runCriticPass(
  client: Anthropic,
  input: CriticInput,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<CriticResult> {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const maxTokens = opts.maxTokens ?? 8192;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: CRITIC_SYSTEM_PROMPT,
    tools: [CRITIC_TOOL as any],
    tool_choice: { type: 'tool', name: 'report_critic_findings' } as any,
    messages: [{ role: 'user', content: buildCriticUserMessage(input) }],
  });

  const toolUse = response.content.find((b: any) => b.type === 'tool_use') as
    | { type: 'tool_use'; name: string; input: unknown }
    | undefined;

  if (!toolUse || toolUse.name !== 'report_critic_findings') {
    return {
      blockFlags: [
        {
          severity: 'block',
          section: 'critic',
          line_or_quote: '',
          issue: 'Critic did not invoke the tool.',
          recommended_fix: 'Retry critic pass.',
          is_confirmed_violation: true,
        },
      ],
      warnFlags: [],
      rawResponse: JSON.stringify(response.content),
    };
  }

  const findings = toolUse.input as {
    blockFlags?: CriticFlag[];
    warnFlags?: CriticFlag[];
  };

  const rawBlocks = Array.isArray(findings.blockFlags) ? findings.blockFlags : [];
  const rawWarns = Array.isArray(findings.warnFlags) ? findings.warnFlags : [];

  // Only keep findings the critic has confirmed.
  const blockFlags = rawBlocks.filter((f) => f.is_confirmed_violation === true);
  const warnFlags = rawWarns.filter((f) => f.is_confirmed_violation === true);

  return {
    blockFlags,
    warnFlags,
    rawResponse: JSON.stringify(toolUse.input),
  };
}

export function formatFlagsForRetry(flags: CriticFlag[]): string {
  return flags
    .map(
      (f, i) =>
        `${i + 1}. [${f.severity.toUpperCase()}] ${f.section}, "${f.line_or_quote}": ${f.issue}\n   Fix: ${f.recommended_fix}`
    )
    .join('\n');
}
