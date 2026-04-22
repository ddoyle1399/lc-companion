import { describe, it, expect } from 'vitest';
import { runDeterministicChecks } from './critic';

const TOLLUND_SAMPLE = `# "The Tollund Man" by Seamus Heaney

## 3. Stanza-by-Stanza
Stanza 2 Plain meaning: the physical details preserved in the bog - the victim's eyelids and pointed cap.
Stanza 4 Plain meaning: cap, noose, and girdle - the ritual implements.
Stanza 7 Technique: employs syncretism, blending pagan sacrifice with Christian preservation.
Stanza 9 Technique: uses synecdoche, reducing victims to "flesh".

## Themes
Heaney mythologises the landscape itself. Landscape holds historical violence in its very geography.

## Style violations to catch
The poet does not delve into the question. A multifaceted approach creates a tapestry of meaning.
Pretend — em dash — test.
Ritual — rather than meaningless brutality — provides a framework.
understanding violence as ritual - rather than meaningless brutality - provides a framework.
`;

const CLEAN_SAMPLE = `# "Clean Note" by Test Poet

## Stanza-by-Stanza
Stanza 1 Plain meaning: the speaker walks down the road. Technique: the metaphor of the journey signals self-discovery.

## Themes
The poem explores memory and identity. The speaker's voice carries quiet authority throughout.

## Compound words are fine
peat-brown, blue-grey, half-light. None of these should fire. Hyphen-separated lists like one-two-three are fine.
`;

describe('runDeterministicChecks', () => {
  it('flags em dash characters as block', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.some((f) => f.severity === 'block' && /em dash|En dash|Em dash/i.test(f.issue))).toBe(true);
  });

  it('flags spaced-hyphen as block', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.some((f) => f.severity === 'block' && /spaced-hyphen/i.test(f.issue))).toBe(true);
  });

  it('flags syncretism as block (off-glossary)', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.some((f) => f.severity === 'block' && /syncretism/i.test(f.issue))).toBe(true);
  });

  it('flags banned filler words as block (delve, multifaceted, tapestry)', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    const blocks = flags.filter((f) => f.severity === 'block');
    expect(blocks.some((b) => /delve/i.test(b.issue))).toBe(true);
    expect(blocks.some((b) => /multifaceted/i.test(b.issue))).toBe(true);
    expect(blocks.some((b) => /tapestry/i.test(b.issue))).toBe(true);
  });

  it('flags synecdoche as warn (cautioned)', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.some((f) => f.severity === 'warn' && /synecdoche/i.test(f.issue))).toBe(true);
  });

  it('flags landscape as warn (figurative ambiguity)', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.some((f) => f.severity === 'warn' && /landscape/i.test(f.issue))).toBe(true);
  });

  it('returns no block flags for clean text', () => {
    const flags = runDeterministicChecks(CLEAN_SAMPLE);
    const blocks = flags.filter((f) => f.severity === 'block');
    expect(blocks).toEqual([]);
  });

  it('does not flag compound hyphens (peat-brown)', () => {
    const flags = runDeterministicChecks('The poem uses peat-brown imagery and half-light tones.');
    expect(flags.length).toBe(0);
  });

  it('produces is_confirmed_violation: true on every flag (so retry path picks them up)', () => {
    const flags = runDeterministicChecks(TOLLUND_SAMPLE);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.is_confirmed_violation === true)).toBe(true);
  });
});
