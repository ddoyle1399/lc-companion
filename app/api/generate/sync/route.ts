/**
 * app/api/generate/sync/route.ts
 *
 * Full pipeline with critic pass and one retry. Falls back if retry still blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  PromptContext,
  PoemQuote,
  PoemMetadata,
  PairingCandidate,
  buildPoetryNotePrompt,
  buildCriticInput,
  buildStanzaPlan,
} from '@/lib/claude/prompts';
import { runCriticPass, formatFlagsForRetry, CriticFlag } from '@/lib/claude/critic';

const FALLBACK_MESSAGE = `This note is being reviewed for accuracy and is temporarily unavailable. Please try another poem from your selection, or check back shortly.`;

const GENERATION_MODEL = 'claude-sonnet-4-6';
const GENERATION_MAX_TOKENS = 8000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subject, subKey, studentYear } = body as {
    subject: string;
    subKey: string;
    studentYear: '2026' | '2027';
  };

  if (!subject || !subKey || !studentYear) {
    return NextResponse.json(
      { error: 'subject, subKey, studentYear required' },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { data: row, error: rowErr } = await (supabase as any)
    .from('notes')
    .select('id, subject_key, sub_key, metadata, quotes')
    .eq('subject_key', subject)
    .eq('sub_key', subKey)
    .eq('status', 'verified')
    .single();

  if (rowErr || !row) {
    return NextResponse.json(
      { error: 'Verified poem row not found', detail: rowErr?.message },
      { status: 404 }
    );
  }

  const metadata = (row.metadata ?? {}) as PoemMetadata;
  const quotes = (row.quotes ?? []) as PoemQuote[];

  const { data: siblings } = await (supabase as any)
    .from('notes')
    .select('sub_key, metadata')
    .eq('subject_key', subject)
    .eq('status', 'verified')
    .neq('sub_key', subKey);

  const availablePairings: PairingCandidate[] = (siblings ?? [])
    .filter((s: any) => {
      const years = (s.metadata?.selection_years ?? []) as string[];
      return years.includes(studentYear);
    })
    .map((s: any) => ({
      subject_key: subject,
      sub_key: s.sub_key,
      one_line_summary: s.metadata?.one_line_summary,
    }));

  const ctx: PromptContext = {
    subject,
    subKey,
    metadata,
    quotes,
    availablePairings,
    studentYear,
  };

  const { system, user } = buildPoetryNotePrompt(ctx);
  let generated = await callGenerator(anthropic, system, user);

  console.log('[poetry-debug]', {
    sub: subKey,
    hasMetadata: Boolean(metadata),
    conf: metadata?.structure_confidence,
    quoteCount: quotes.length,
    pairings: availablePairings.length,
    studentYear,
  });

  const criticInput = buildCriticInput(generated, ctx);
  let criticResult = await runCriticPass(anthropic, criticInput);

  if (criticResult.blockFlags.length > 0) {
    console.log('[critic-block-round1]', {
      sub: subKey,
      blockCount: criticResult.blockFlags.length,
      warnCount: criticResult.warnFlags.length,
    });

    const expectedStanzaCount = (metadata.stanza_breaks ?? []).length;
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
            buildStanzaPlan(metadata),
            `=============================`,
          ].join('\n')
        : '';

    const retryUser = [
      user,
      ``,
      `Your previous attempt had the following issues. Rewrite the note to resolve every block flag:`,
      formatFlagsForRetry(criticResult.blockFlags),
      structuralEmphasis,
    ]
      .filter((s) => s !== '')
      .join('\n');

    generated = await callGenerator(anthropic, system, retryUser);
    const retryCriticInput = buildCriticInput(generated, ctx);
    criticResult = await runCriticPass(anthropic, retryCriticInput);
  }

  if (criticResult.blockFlags.length > 0) {
    console.log('[critic-block-final]', {
      sub: subKey,
      blockCount: criticResult.blockFlags.length,
    });

    await logGenerationAudit(supabase, {
      rowId: row.id,
      status: 'blocked',
      blockFlags: criticResult.blockFlags,
      warnFlags: criticResult.warnFlags,
      note: generated,
    });

    return NextResponse.json(
      {
        note: FALLBACK_MESSAGE,
        status: 'needs_review',
        flags: criticResult.blockFlags,
      },
      { status: 200 }
    );
  }

  await logGenerationAudit(supabase, {
    rowId: row.id,
    status: criticResult.warnFlags.length > 0 ? 'warn' : 'clean',
    blockFlags: [],
    warnFlags: criticResult.warnFlags,
    note: generated,
  });

  return NextResponse.json(
    {
      note: generated,
      status: criticResult.warnFlags.length > 0 ? 'warn' : 'clean',
      warnFlags: criticResult.warnFlags,
    },
    { status: 200 }
  );
}

async function callGenerator(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: GENERATION_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  return textBlock?.text ?? '';
}

async function logGenerationAudit(
  supabase: ReturnType<typeof createClient<any>>,
  payload: {
    rowId: string;
    status: 'clean' | 'warn' | 'blocked';
    blockFlags: CriticFlag[];
    warnFlags: CriticFlag[];
    note: string;
  }
) {
  try {
    await (supabase as any).from('generation_audit').insert({
      note_id: payload.rowId,
      status: payload.status,
      block_flags: payload.blockFlags,
      warn_flags: payload.warnFlags,
      note_snapshot: payload.note,
    });
  } catch (err) {
    console.error('[audit-log-fail]', err);
  }
}
