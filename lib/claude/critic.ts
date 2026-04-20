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

Return a JSON object exactly matching this shape (no prose outside the JSON):

{
  "blockFlags": [
    {
      "severity": "block",
      "section": "Stanza 8 Technique",
      "line_or_quote": "called a euphemism",
      "issue": "Tell-tale skin and teeth is understatement or synecdoche, not a euphemism.",
      "recommended_fix": "Relabel as understatement (or synecdoche) and explain the part-for-whole effect."
    }
  ],
  "warnFlags": [
    {
      "severity": "warn",
      "section": "Stanza 1 Technique",
      "line_or_quote": "potential for growth",
      "issue": "Overreach. The figure is a dead man; growth is unsupported.",
      "recommended_fix": "Drop growth. Keep the gentleness reading."
    }
  ]
}

Block-level flags (hard fail, regenerate):
1. Any quote in the note not present in anchored_quotes (character-for-character).
2. Any technique label not in the controlled glossary (check the glossary section).
3. Any factual claim (date, person, event, source text) not present in
   historical_context.real_world_events, historical_context.source_texts,
   historical_context.biographical_anchors, or named_figures.
4. Any pairing not in available_pairings.
5. A mandatory section missing (Overview, Form and Structure, Stanza-by-Stanza,
   Themes, Tone, Exam Use, Pairings).
6. Ignoring a disputed_readings.guidance instruction (e.g. framing 1920s killings
   as Troubles-era when guidance says otherwise).
7. Banned labels used: "biblical echoes", "the poet masterfully", bare "captures"
   or "evokes" with nothing specified.
8. Stanza count mismatch. If STRUCTURAL CONTRACT specifies EXPECTED_STANZA_COUNT = N,
   the Stanza-by-Stanza section MUST contain exactly N "Stanza K" blocks
   numbered 1 through N. More, fewer, re-numbered, merged, or invented
   sub-stanzas is a block-level failure. Report actual_count vs expected_count
   in the issue text so the retry prompt can fix it.

Warn-level flags (non-blocking, log for review):
1. Thin or speculative readings (overreach rule).
2. Spelling mismatch between a quoted word and its gloss within 150 words.
3. Section length outside target range.
4. Named figure present in named_figures but not used when the relevant quote appears.
5. Textual variant exists for a line the note quotes, and the variant is not mentioned.

Be conservative on blocks. Only block when you can point to a clear rule violation.
Everything else is a warn.

If the note is clean, return:
{ "blockFlags": [], "warnFlags": [] }
`.trim();

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
    `Now audit the note. Return the JSON object.`,
  ].join('\n');
}

export async function runCriticPass(
  client: Anthropic,
  input: CriticInput,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<CriticResult> {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const maxTokens = opts.maxTokens ?? 4096;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: CRITIC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildCriticUserMessage(input) }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  const raw = textBlock?.text ?? '';

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      blockFlags: [
        {
          severity: 'block',
          section: 'critic',
          line_or_quote: '',
          issue: 'Critic returned no JSON.',
          recommended_fix: 'Retry critic pass.',
        },
      ],
      warnFlags: [],
      rawResponse: raw,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      blockFlags: Array.isArray(parsed.blockFlags) ? parsed.blockFlags : [],
      warnFlags: Array.isArray(parsed.warnFlags) ? parsed.warnFlags : [],
      rawResponse: raw,
    };
  } catch (err) {
    return {
      blockFlags: [
        {
          severity: 'block',
          section: 'critic',
          line_or_quote: '',
          issue: `Critic JSON parse failed: ${(err as Error).message}`,
          recommended_fix: 'Retry critic pass.',
        },
      ],
      warnFlags: [],
      rawResponse: raw,
    };
  }
}

export function formatFlagsForRetry(flags: CriticFlag[]): string {
  return flags
    .map(
      (f, i) =>
        `${i + 1}. [${f.severity.toUpperCase()}] ${f.section}, "${f.line_or_quote}": ${f.issue}\n   Fix: ${f.recommended_fix}`
    )
    .join('\n');
}
