import { describe, it, expect } from 'vitest';
import { buildPoetryNotePrompt, validatePoetryMetadata, MetadataIncompleteError } from '../prompts';

const minimalValidCtx = {
  subject: 'Test Poet',
  subKey: 'Test Poem',
  studentYear: '2026' as const,
  metadata: {
    quote_schema_version: 2,
    structure_confidence: 'high',
    stanza_breaks: [1],
    section_breaks: [],
    total_lines: 14,
    historical_context: { source_texts: [], biographical_anchors: [] },
    named_figures: [],
    textual_variants: [],
    technique_glossary: 'imagery: ...',
  },
  quotes: [{ text: 'foo', line_number: 1 }],
  availablePairings: [],
} as any;

describe('validatePoetryMetadata', () => {
  it('passes a complete context', () => {
    const r = validatePoetryMetadata(minimalValidCtx);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('flags missing metadata entirely', () => {
    const ctx = { ...minimalValidCtx, metadata: undefined };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('metadata (entire block)');
  });

  it('flags missing historical_context', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, historical_context: undefined } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('metadata.historical_context');
  });

  it('flags null section_breaks (Sunlight regression)', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, section_breaks: null } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m: string) => m.includes('section_breaks'))).toBe(true);
  });

  it('flags empty technique_glossary', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, technique_glossary: '' } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m: string) => m.includes('technique_glossary'))).toBe(true);
  });

  it('flags wrong quote_schema_version', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, quote_schema_version: 1 } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m: string) => m.includes('quote_schema_version'))).toBe(true);
  });

  it('flags structure_confidence not high', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, structure_confidence: 'medium' } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m: string) => m.includes('structure_confidence'))).toBe(true);
  });

  it('flags empty quotes array', () => {
    const ctx = { ...minimalValidCtx, quotes: [] };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m: string) => m.includes('quotes'))).toBe(true);
  });

  it('allows empty availablePairings array', () => {
    const ctx = { ...minimalValidCtx, availablePairings: [] };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(true);
  });
});

describe('buildPoetryNotePrompt', () => {
  it('throws MetadataIncompleteError on incomplete context', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, technique_glossary: '' } };
    expect(() => buildPoetryNotePrompt(ctx)).toThrow(MetadataIncompleteError);
  });

  it('error contains subject and subKey', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, technique_glossary: '' } };
    try {
      buildPoetryNotePrompt(ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(MetadataIncompleteError);
      const err = e as MetadataIncompleteError;
      expect(err.subject).toBe('Test Poet');
      expect(err.subKey).toBe('Test Poem');
      expect(err.missing).toContain('metadata.technique_glossary (non-empty string required)');
    }
  });

  it('returns system and user strings for a valid context', () => {
    const result = buildPoetryNotePrompt(minimalValidCtx);
    expect(typeof result.system).toBe('string');
    expect(typeof result.user).toBe('string');
    expect(result.system.length).toBeGreaterThan(0);
    expect(result.user).toContain('Test Poem');
  });
});
