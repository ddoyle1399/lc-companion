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
    technique_glossary: 'imagery: visual images that appeal to the senses.',
  },
  quotes: [{ line: 'foo', index: 1 }],
  availablePairings: [],
} as any;

describe('validatePoetryMetadata', () => {
  it('passes a complete context', () => {
    const r = validatePoetryMetadata(minimalValidCtx);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('flags missing metadata block entirely', () => {
    const ctx = { ...minimalValidCtx, metadata: null };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('metadata (entire block)');
  });

  it('flags wrong quote_schema_version', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, quote_schema_version: 1 } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('quote_schema_version'))).toBe(true);
  });

  it('flags structure_confidence not high', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, structure_confidence: 'low' } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('structure_confidence'))).toBe(true);
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
    expect(r.missing.some((m) => m.includes('section_breaks'))).toBe(true);
  });

  it('allows empty section_breaks array (no sections is valid)', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, section_breaks: [] } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(true);
  });

  it('flags empty stanza_breaks array', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, stanza_breaks: [] } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('stanza_breaks'))).toBe(true);
  });

  it('flags empty technique_glossary', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, technique_glossary: '' } };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('technique_glossary'))).toBe(true);
  });

  it('flags missing quotes array', () => {
    const ctx = { ...minimalValidCtx, quotes: [] };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('quotes'))).toBe(true);
  });

  it('allows empty availablePairings array (no pairings is valid)', () => {
    const ctx = { ...minimalValidCtx, availablePairings: [] };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(true);
  });

  it('flags missing availablePairings entirely', () => {
    const ctx = { ...minimalValidCtx, availablePairings: undefined };
    const r = validatePoetryMetadata(ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes('availablePairings'))).toBe(true);
  });

  it('buildPoetryNotePrompt throws MetadataIncompleteError on bad context', () => {
    const ctx = { ...minimalValidCtx, metadata: { ...minimalValidCtx.metadata, technique_glossary: '' } };
    expect(() => buildPoetryNotePrompt(ctx)).toThrow(MetadataIncompleteError);
  });

  it('MetadataIncompleteError carries subject, subKey, and missing fields', () => {
    const ctx = {
      ...minimalValidCtx,
      metadata: { ...minimalValidCtx.metadata, historical_context: null, technique_glossary: '' },
    };
    try {
      buildPoetryNotePrompt(ctx);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MetadataIncompleteError);
      const e = err as MetadataIncompleteError;
      expect(e.subject).toBe('Test Poet');
      expect(e.subKey).toBe('Test Poem');
      expect(e.missing.length).toBeGreaterThanOrEqual(2);
      expect(e.kind).toBe('metadata_incomplete');
    }
  });
});
