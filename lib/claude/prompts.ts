/**
 * lib/claude/prompts.ts
 *
 * Poetry note prompt builders for the LC Companion App.
 * Implements the Poetry Note Production Spec v1.0 (19 April 2026).
 *
 * Key contract:
 *  - Generator must only quote from `anchored_quotes` (no training-memory quotes).
 *  - Generator must only recommend pairings from `available_pairings`.
 *  - Generator must produce all 6 mandatory sections, in order.
 *  - Generator labels techniques only from the controlled glossary.
 *  - No overreach (speculative readings without textual license).
 *  - Historical claims may only come from `historical_context` and `named_figures`.
 *  - Textual variants flagged with guidance.
 *
 * Any row missing `metadata.structure_confidence='high'` or
 * `metadata.quote_text_anchored=true` is rejected by the strict guard in
 * app/api/generate/route.ts (422). There is no longer a legacy fallback
 * prompt. buildPoetrySystemPrompt throws if called without strict metadata.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// Legacy interface required by comparative note builder
export interface ComparativeTextEntry {
  title: string;
  author?: string;
  director?: string;
  category: string;
}

export interface PoemQuote {
  text: string;
  line_start: number;
  line_end: number;
  stanza_index: number;
  section_index?: number;
  tags?: string[];
}

export interface PoemMetadata {
  quote_schema_version?: number;
  total_lines?: number;
  stanza_breaks?: number[];
  section_breaks?: number[] | null;
  form?: string;
  structure_confidence?: string;
  quote_text_anchored?: boolean;
  quote_bank_source?: string;
  edition_source?: string;
  historical_context?: HistoricalContext;
  named_figures?: NamedFigure[];
  textual_variants?: TextualVariant[];
  selection_years?: string[];
  selection_years_confirmed?: boolean;
}

export interface HistoricalContext {
  composition_date?: string;
  collection?: string;
  publisher?: string;
  real_world_events?: Array<{ event: string; date: string; relevance: string }>;
  source_texts?: Array<{ author: string; title: string; year: string; relevance: string }>;
  disputed_readings?: Array<{ detail: string; options: string[]; guidance: string }>;
  biographical_anchors?: string[];
}

export interface NamedFigure {
  name: string;
  role: string;
  appears_as: string;
  source: string | null;
  use_in_essay: string;
}

export interface TextualVariant {
  line_number: number;
  phrase_in_our_edition: string;
  alternate_readings: string[];
  alternate_sources: string[];
  our_source: string;
  guidance: string;
}

export interface PairingCandidate {
  subject_key: string;
  sub_key: string;
  one_line_summary?: string;
}

export interface PromptContext {
  // New strict-mode poetry pipeline fields
  subject?: string;
  subKey?: string;
  metadata?: PoemMetadata;
  quotes?: PoemQuote[];
  availablePairings?: PairingCandidate[] | Array<{ sub_key: string; form: string; total_lines: number | null; themes?: string[] }>;
  studentYear?: '2026' | '2027';

  // Legacy fields used by streaming route (app/api/generate/route.ts)
  year?: number;
  circular?: string;
  level?: 'HL' | 'OL';
  contentType?: 'poetry' | 'comparative' | 'worksheet' | 'slides' | 'single_text' | 'unseen_poetry' | 'comprehension' | 'composition';
  poet?: string;
  poem?: string;
  author?: string;
  textTitle?: string;
  comparativeMode?: string;
  comparativeTexts?: ComparativeTextEntry[];

  /**
   * Verified substrate per text, parallel to comparativeTexts.
   * Each entry is either a ProfileEntry (from data/profiles/comparative/index.ts)
   * or null if no profile exists for that text yet.
   * When non-null, prompts must anchor in the profile and quote only from the
   * provided quote bank for that text.
   */
  comparativeProfiles?: Array<{
    profile: unknown; // ComparativeTextProfile imported as JSON; typed loosely here to avoid circular import.
    quotes: unknown;  // QuoteBank.
  } | null>;

  /**
   * Verified substrate for the Single Text question (Paper 2 Section I).
   * The same profile that backs comparative analysis backs single-text analysis,
   * because the underlying text knowledge (plot, characters, key moments,
   * quotes) is the same. Looked up via findProfileByTitle(year, textTitle).
   */
  singleTextProfile?: {
    profile: unknown;
    quotes: unknown;
  } | null;

  // Comparative note-type system (added April 2026 revamp).
  // Default is "mode_grid" (the original 5-section note) so existing callers keep working.
  comparativeNoteType?:
    | 'mode_grid'                // 3 texts + 1 mode, the original 5-section comparative note
    | 'text_full_breakdown'      // 1 text, full plot+character+theme+moments breakdown for comparative use
    | 'text_character'           // 1 text + character name, deep character study with mode-relevance tags
    | 'text_key_moments'         // 1 text, 5-8 key moments tagged to all four modes
    | 'text_mode_profile'        // 1 text + 1 mode, how this text serves this specific mode in depth
    | 'text_relationships'       // 1 text, relationship map between characters
    | 'text_quote_bank'          // 1 text, themed quote bank organised by character and theme
    | 'comparison_grid_table'    // 3 texts + 1 mode, the visual grid (texts x mode-axes)
    | 'comparative_argument'     // 3 texts + mode + argument focus, one detailed cross-text argument
    | 'sample_paragraph'         // 3 texts + mode + angle, one A-then-B-then-C model paragraph
    | 'question_plan'            // 3 texts + question + format, structured exam answer plan
    | 'sample_answer';           // 3 texts + question + format, full H1 sample answer
  comparativeCharacterName?: string;       // for text_character
  comparativeArgumentFocus?: string;       // for comparative_argument
  comparativeQuestionText?: string;        // for question_plan / sample_answer
  comparativeQuestionFormat?: 'Q1a_30' | 'Q1b_40' | 'Q2_70';

  userInstructions?: string;
  examSummary?: string;
  prescribedPoems?: string[];
  poemText?: string;
  comparativeExamPattern?: string;
  textbookAnalysis?: {
    formStructure: string;
    themes: string;
    literaryTechniques: string;
    toneAndMood: string;
    imagery: string;
    historicalContext: string;
    stanzaSummary: string;
    keyQuotations: string;
    examAngles: string;
    comparativeLinks: string;
  };
  worksheetContentType?: 'poetry' | 'single_text' | 'comparative' | 'unseen_poetry' | 'comprehension' | 'composition';
  activityTypes?: string[];
  slidesContentType?: 'poetry' | 'comparative' | 'general' | 'single_text' | 'unseen_poetry' | 'comprehension' | 'composition';
  textType?: 'shakespeare' | 'novel' | 'play';
  focusArea?: 'question_a' | 'question_b' | 'both';
  compositionType?: 'personal_essay' | 'short_story' | 'speech' | 'discursive' | 'feature_article' | 'descriptive';
  poemMetadata?: PoemMetadata;
  structuredQuotes?: Array<string | PoemQuote>;
}

// -----------------------------------------------------------------------------
// Controlled technique glossary (spec section 4)
// -----------------------------------------------------------------------------

export const TECHNIQUE_GLOSSARY = `
Controlled technique glossary. You may ONLY label a device with one of these terms.
If a line's effect does not match any term below, describe it in plain language
without naming a device. Never invent a term.

Tropes / figures:
- metaphor: A is B directly.
- simile: A is like/as B.
- metonymy: part-for-associated (e.g. "the crown" for the monarchy).
- synecdoche: part-for-whole or whole-for-part (e.g. "skin and teeth" for the bodies).
- personification: inanimate given human attributes.
- apostrophe: direct address to absent, dead, or non-human addressee.
- oxymoron: two contradictory terms placed together (e.g. "sad freedom").
- paradox: a self-contradictory statement that reveals a truth.
- irony (verbal, situational, or dramatic, state which).
- euphemism: softer substitute for something harsh ("passed away"). NOT for brutal plain naming.
- understatement: deliberately downplays ("tell-tale skin and teeth" understates mass murder).
  Use the bare label "understatement". Do NOT pair it with "(litotes)"; the technical term is banned.
- hyperbole: deliberate exaggeration.
- symbolism: object stands for an abstract idea.
- allusion: reference to another text or historical event (name the source).
- pathetic fallacy: nature reflects human emotion.

Sound:
- alliteration, assonance, consonance, sibilance, onomatopoeia, cacophony, euphony.

Structure / syntax:
- enjambment, caesura, end-stopped line, volta, anaphora, asyndeton, polysyndeton, inversion.

Imagery: visual (or "visual imagery"), auditory, tactile, olfactory, gustatory, kinaesthetic,
  synaesthesia, religious imagery (when sacred or spiritual images are used), death imagery.

Register / mode:
- Christian register: using biblical or liturgical diction and imagery in a secular or pagan context.
- dramatic monologue: single speaker addresses an implied listener.

BANNED labels (do not use, zero exceptions):
- "biblical echoes", too vague. Use "allusion to [specific source]" or "Christian register".
- "syncretism", grad-school vocabulary. Describe the effect in plain language: "Heaney places pagan sacrifice and Christian relic-keeping in the same frame."
- "powerful", "evocative", "striking", "beautiful", not techniques.
- "captures", "underscores", "highlights", "evokes" without specifying what, filler verbs.
- "the poet masterfully" or any sentence starting with this, AI filler.
- "cataloguing", "cataloguing lines", "listing technique" as named devices. Use the glossary term
  "asyndeton" (list without conjunctions) only if that is literally what the line does. Otherwise
  describe the effect in plain language ("the short lines list three items in succession") without
  labelling it as a named device.
- Any other descriptive word used as if it were a named technique (for example "signposting",
  "mirroring", "echoing", "cataloguing"). If the word is not on the glossary above, do not bold
  it as a Technique and do not frame it as "uses X" or "employs X". Only glossary terms may be
  used as named devices. Plain description is always acceptable.
`.trim();

// -----------------------------------------------------------------------------
// Structural contract (derived from verified metadata, injected into prompt)
// -----------------------------------------------------------------------------

/**
 * Turns stanza_breaks + section_breaks + total_lines + form into a human-readable
 * block that tells the generator exactly how many stanzas to produce, what line
 * ranges each stanza covers, and how stanzas group into Parts. Returns '' if
 * metadata is too thin to compute a plan.
 */
export function buildStanzaPlan(meta: PoemMetadata): string {
  const breaks = meta.stanza_breaks ?? [];
  const total = meta.total_lines;
  const form = meta.form ?? 'unspecified';
  const sections = meta.section_breaks ?? [];

  if (breaks.length === 0 || !total || total <= 0) {
    return '';
  }

  const stanzaCount = breaks.length;

  const ranges = breaks.map((start, i) => {
    const end = i < breaks.length - 1 ? breaks[i + 1] - 1 : total;
    return { index: i + 1, start, end };
  });

  const romanNumeral = (n: number): string => {
    const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return map[n - 1] ?? String(n);
  };

  const sectionAssignments: Array<{ part: number; stanzas: number[] }> = [];
  if (sections.length > 0) {
    for (let s = 0; s < sections.length; s++) {
      const secStart = sections[s];
      const secEnd = s < sections.length - 1 ? sections[s + 1] - 1 : total;
      const stanzasIn = ranges
        .filter((r) => r.start >= secStart && r.end <= secEnd)
        .map((r) => r.index);
      if (stanzasIn.length > 0) {
        sectionAssignments.push({ part: s + 1, stanzas: stanzasIn });
      }
    }
  }

  const lines: string[] = [];
  lines.push(`STRUCTURAL CONTRACT (derived from verified metadata, do not deviate):`);
  lines.push(``);
  lines.push(`- Form: ${form}`);
  lines.push(`- Total lines: ${total}`);
  lines.push(`- Total stanzas: ${stanzaCount}`);
  if (sectionAssignments.length > 0) {
    lines.push(`- Parts: ${sectionAssignments.length}`);
  }
  lines.push(``);
  lines.push(`Stanza line ranges:`);
  for (const r of ranges) {
    lines.push(`  Stanza ${r.index}: lines ${r.start}-${r.end}`);
  }

  if (sectionAssignments.length > 0) {
    lines.push(``);
    lines.push(`Part grouping:`);
    for (const a of sectionAssignments) {
      const first = a.stanzas[0];
      const last = a.stanzas[a.stanzas.length - 1];
      lines.push(`  Part ${romanNumeral(a.part)}: stanzas ${first}-${last}`);
    }
  }

  lines.push(``);
  lines.push(
    `In Section 3 (Stanza-by-Stanza), produce EXACTLY ${stanzaCount} blocks labelled`
  );
  lines.push(
    `"Stanza 1" through "Stanza ${stanzaCount}". Do not merge, split, renumber, or invent`
  );
  lines.push(
    `sub-stanzas. If a stanza has no anchored quote, still produce its block and`
  );
  lines.push(
    `describe its function without quoting, as specified in the OUTPUT TEMPLATE.`
  );
  if (sectionAssignments.length > 0) {
    lines.push(
      `Group the Stanza-by-Stanza blocks under "### Part I", "### Part II", etc. per the Part grouping above.`
    );
  }

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Core poetry prompt builders
// -----------------------------------------------------------------------------

const OVERREACH_RULE = `
OVERREACH RULE: One well-supported reading beats three speculative ones.
Every interpretive claim must name the textual feature that licenses it.
If you cannot point to a specific word, image, sound, or structural feature
that supports the reading, drop the reading. Do not pad.

Known patterns to avoid:
- "suggests potential for growth" from images of dead/static things (e.g. seed-pods of corpse eyelids)
- "sweetness emerging from darkness" from industrial/labour imagery (e.g. turf-cutting scars)
- "evokes" without specifying what it evokes
- treating literal description as symbolic without textual warrant
- naming a specific historical event or era as the "primary" or "most famous" referent
  of a word or image when historical_context does not anchor that allusion. Example:
  the word "tumbril" does NOT primarily allude to the French Revolution unless
  historical_context says so. Generalise instead: "carts used to carry the condemned
  to execution, a detail that places this killing within a broader history of ritual
  and political violence." Same for "trenches" → World War I, "ovens" → the Holocaust,
  etc. If the specific allusion is not in historical_context, drop the specificity.
- The hedge phrase "most famously" almost always signals an unsupported specific
  attribution. If you find yourself writing "most famously", stop and check whether
  historical_context supports the claim. If not, rewrite without it.
`.trim();

const STYLE_GUARDRAILS = `
STYLE GUARDRAILS. These are enforced by a deterministic post-generation check.
Every violation blocks publication and triggers a retry. Read them carefully.

1. NO EM DASHES OR EN DASHES. Not the character —, not the character –, not ever.
2. NO SPACED HYPHENS AS EM-DASH SUBSTITUTES. Never write " - " (space, hyphen,
   space) between phrases as a parenthetical break. If you feel the urge to
   write "understanding violence as ritual - rather than meaningless brutality -
   provides", rewrite as "understanding violence as ritual, rather than as
   meaningless brutality, provides" or as two sentences. Compound words like
   "peat-brown" are fine (no spaces around the hyphen).
3. BANNED WORDS (never use): delve, delves, delved, delving, multifaceted,
   tapestry, tapestries. Replace with specific, concrete language that says
   what actually happens.
4. CAUTIONED WORDS (never use figuratively): landscape, nuanced. "Landscape"
   is fine if the poem is literally about a landscape. It is banned when used
   as a metaphor ("the landscape of memory", "mythologises the landscape").
5. DEVICE LABELS MUST COME FROM THE APPROVED GLOSSARY (see TECHNIQUE GLOSSARY
   section). Banned device labels include syncretism, metonymy, litotes,
   anaphora, chiasmus, zeugma, synesthesia, epistrophe. Use "repetition"
   instead of "anaphora". Prefer plain description to a fancy label.
6. "synecdoche" is cautioned. Only use it if a student would be expected to
   identify it. Prefer describing the effect (e.g. "the reduction of victims
   to body parts") over labelling it.
7. The Pairings section must list ONLY poems from AVAILABLE PAIRINGS above.
   Never reference poems by other poets. Never reference poems not on the
   available list. If the list is empty, say "No available pairings for this
   selection year" and move on.
`.trim();

const CONSISTENCY_RULE = `
CONSISTENCY RULE:
- Any word you quote must be spelled the same way in your commentary. If the poem
  spells it "tumbril", your gloss spells it "tumbril", not "tumbrel".
- Any named person, place, date, or event you mention must appear in the row's
  historical_context or named_figures. Do not cite dates or people from memory.
- Any pairing you recommend must appear in the available_pairings list for the
  student's selection year. Never recommend a poem not on that list.
- Any quote you use must appear verbatim in the anchored_quotes array.
  If a stanza has no anchored quote coverage, describe its function without quoting.

STANZA ANCHORING RULE (CRITICAL, zero tolerance):
Every anchored_quotes entry has a "stanza_index" field. That field is authoritative.
A quote with stanza_index=K belongs in the "Stanza K" block of Section 3, and ONLY
in that block. You may not move a quote into an adjacent stanza even if the
analysis flows better that way. If stanza_index=1 for "The mild pods of his eye-lids",
that line is analysed inside Stanza 1, not Stanza 2. If two anchored quotes share the
same stanza_index, both belong in that one Stanza block. Stanza blocks whose
stanza_index has no anchored quote coverage use the "Function in the poem" shape.

Before you write each Stanza block, look at the anchored_quotes array and list,
in your head, which quotes have that stanza_index. Those are the only quotes that
may appear in that block. If you realise mid-draft that you have placed a quote
in the wrong stanza, stop and rewrite both stanza blocks before moving on.

DISPUTED READINGS RULE (applies universally):
If historical_context.disputed_readings contains guidance, that guidance applies
to every section of the note: Overview, Form and Structure, Stanza-by-Stanza,
Themes, Tone, Exam Use, and Pairings. Not just the stanza where the quote appears.
If the Themes section references a stanza covered by disputed_readings guidance,
the Themes section must follow that guidance too. Never carve out a re-reading
of a quote in Themes that contradicts the guidance you followed in Stanza analysis.

TEXTUAL VARIANTS RULE:
If textual_variants contains a line you quote in the note, the Exam Use section
must include a one-sentence note flagging the variant and stating that either
form is acceptable. Example: "Some editions read 'Out here in Jutland'; either
form is acceptable if a student quotes from a different edition."
`.trim();

const OUTPUT_TEMPLATE = `
MANDATORY OUTPUT TEMPLATE. Produce all seven sections, in this order, with these exact headings:

# "{{title}}" by {{poet}}

## 1. Overview
3 to 6 sentences. Must include: collection, composition date, one sentence of
historical or biographical context (drawn ONLY from historical_context), one
sentence on what the poem does. No filler.

## 2. Form and Structure
MANDATORY. Line count. Stanza shape. Parts or sections if any. Rhyme scheme (or
note its absence). Meter tendency. Sound-pattern tendencies. Pacing effects of
short or long lines. 4 to 7 sentences.

## 3. Stanza-by-Stanza
One block per stanza. For numbered parts, use "### Part I", "### Part II", etc.
Then each stanza:

### Stanza N
**Plain meaning**: 1-2 sentences.
**Technique**: named devices from the glossary only, tied to specific anchored quote.
**Use in an essay**: specific exam utility (what it proves, what question type it fits,
what a memorable quote is). Never a pairing line here.

If a stanza has no anchored quote coverage, write:
### Stanza N
**Plain meaning**: 1-2 sentences.
**Function in the poem**: describe role (transitional, pivot, climactic, etc.) without quoting.

## 4. Themes
2 to 4 themes. Each theme backed by at least two anchored quotes. Each theme
has: theme name in bold, 2-4 sentences of analysis, concrete exam angle.

## 5. Tone
MANDATORY. Describe tone and how it changes across the poem. For multi-part
poems, tone per part. 3 to 5 sentences.

## 6. Exam Use
Strongest essay angles. One or two quotes worth memorising. The most common
student mistake on this poem. 4 to 6 sentences.

## 7. Pairings
2 to 3 poems ONLY from available_pairings for the student's selection year.
For each pairing: one sentence on the shared element, one sentence on the
productive contrast.
`.trim();

// -----------------------------------------------------------------------------
// Prompt assembly
// -----------------------------------------------------------------------------

export function buildPoetrySystemPrompt(ctx: PromptContext): string {
  const meta = ctx.metadata ?? {};
  const isStrict = meta?.structure_confidence === 'high' && meta?.quote_text_anchored === true;

  if (!isStrict) {
    // Defence in depth. The route-level strict guard should have blocked this
    // already; if we get here it means the guard was bypassed or a new caller
    // was added. Fail loud rather than silently producing degraded output.
    throw new Error(
      `buildPoetrySystemPrompt called without strict-mode metadata for "${ctx.subKey ?? ''}" by ${ctx.subject ?? ''}. ` +
        `structure_confidence=${String(meta?.structure_confidence ?? 'missing')}, ` +
        `quote_text_anchored=${String(meta?.quote_text_anchored ?? 'missing')}. ` +
        `Add a verified poem_notes row with complete metadata before generating.`
    );
  }

  const anchoredQuotesBlock = JSON.stringify(ctx.quotes ?? [], null, 2);
  const historicalBlock = JSON.stringify(meta.historical_context ?? {}, null, 2);
  const figuresBlock = JSON.stringify(meta.named_figures ?? [], null, 2);
  const variantsBlock = JSON.stringify(meta.textual_variants ?? [], null, 2);
  const pairingsBlock = JSON.stringify(ctx.availablePairings ?? [], null, 2);
  const editionSource = meta.edition_source ?? 'unspecified (flag to user)';
  const selectionYear = ctx.studentYear ?? '2026';
  const stanzaPlan = buildStanzaPlan(meta);

  return [
    `You are an experienced Leaving Certificate Higher Level English teacher writing study notes for Irish LC students.`,
    `You write in UK English. You do not use em dashes anywhere. You write in clear, direct, exam-relevant prose.`,
    ``,
    `CURRENT TASK: produce a study note on "${ctx.subKey}" by ${ctx.subject}.`,
    `Student is preparing for the ${selectionYear} exam.`,
    `Edition source: ${editionSource}.`,
    ``,
    `STRICT MODE: this poem has an anchored quote bank and verified structural metadata.`,
    `You MUST follow the contract below. Violations are caught by a critic pass and block publication.`,
    ``,
    `===== ANCHORED QUOTES (the only quotes you may use) =====`,
    anchoredQuotesBlock,
    `==========================================================`,
    ``,
    `===== HISTORICAL CONTEXT (the only factual anchors you may cite) =====`,
    historicalBlock,
    `======================================================================`,
    ``,
    `===== NAMED FIGURES (names, roles, and essay-use notes) =====`,
    figuresBlock,
    `=============================================================`,
    ``,
    `===== TEXTUAL VARIANTS (flag with guidance where relevant) =====`,
    variantsBlock,
    `================================================================`,
    ``,
    `===== AVAILABLE PAIRINGS (the only poems you may recommend) =====`,
    pairingsBlock,
    `=================================================================`,
    ``,
    TECHNIQUE_GLOSSARY,
    ``,
    STYLE_GUARDRAILS,
    ``,
    OVERREACH_RULE,
    ``,
    CONSISTENCY_RULE,
    ``,
    // Structural contract (only if metadata is rich enough to compute one).
    ...(stanzaPlan ? [stanzaPlan, ``] : []),
    OUTPUT_TEMPLATE.replace('{{title}}', ctx.subKey ?? '').replace('{{poet}}', ctx.subject ?? ''),
    ``,
    `Begin. Do not preface with any meta commentary. Go straight into the H1 heading.`,
  ].join('\n');
}

export function buildPoetryNotePrompt(ctx: PromptContext): {
  system: string;
  user: string;
} {
  const system = buildPoetrySystemPrompt(ctx);
  const user = `Write the full study note for "${ctx.subKey ?? ''}" by ${ctx.subject ?? ''} per the contract above.`;
  return { system, user };
}

// -----------------------------------------------------------------------------
// Legacy fallback removed (22 April 2026). The route-level strict guard in
// app/api/generate/route.ts now rejects requests that lack strict-mode
// metadata, and buildPoetrySystemPrompt above throws if it is ever called
// without the required flags. Do not reintroduce a legacy path.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Utility: build the critic-pass input from a generated note + row
// -----------------------------------------------------------------------------

export interface CriticInput {
  generatedNote: string;
  anchoredQuotes: PoemQuote[];
  historicalContext: HistoricalContext | null;
  namedFigures: NamedFigure[];
  textualVariants: TextualVariant[];
  availablePairings: PairingCandidate[];
  techniqueGlossary: string;
  subject: string;
  subKey: string;
  stanzaPlan: string;
  expectedStanzaCount: number | null;
}

export function buildCriticInput(
  generatedNote: string,
  ctx: PromptContext
): CriticInput {
  const meta = ctx.metadata ?? {};
  const breaks = meta.stanza_breaks ?? [];
  const pairings = (ctx.availablePairings ?? []) as PairingCandidate[];
  return {
    generatedNote,
    anchoredQuotes: (ctx.quotes ?? []) as PoemQuote[],
    historicalContext: meta.historical_context ?? null,
    namedFigures: meta.named_figures ?? [],
    textualVariants: meta.textual_variants ?? [],
    availablePairings: pairings,
    techniqueGlossary: TECHNIQUE_GLOSSARY,
    subject: ctx.subject ?? '',
    subKey: ctx.subKey ?? '',
    stanzaPlan: buildStanzaPlan(meta),
    expectedStanzaCount: breaks.length > 0 ? breaks.length : null,
  };
}

// =============================================================================
// LEGACY PROMPT BUILDERS (used by app/api/generate/route.ts streaming endpoint)
// =============================================================================

function getReadingLevel(level: "HL" | "OL"): string {
  if (level === "OL") {
    return `JUNIOR CYCLE / ORDINARY LEVEL:
- Reading age: 12-14
- Maximum sentence length: 22 words
- Vocabulary: straightforward, no complex terms without immediate explanation
- There is scope for slightly more complexity on occasion, but no dramatic vocabulary jumps`;
  }
  return `SENIOR CYCLE / HIGHER LEVEL:
- Reading age: 14-17
- Maximum sentence length: no hard cap, but keep sentences clear and avoid run-on constructions
- Vocabulary: can be more sophisticated, but the goal is always clarity over complexity
- Literary terminology (metaphor, enjambment, juxtaposition, etc.) is expected and appropriate, but must always be connected to meaning rather than dropped in for show
- The principle remains: simplify topics students do not understand. Put complex ideas into accessible language.`;
}

function getComparativeModes(year: number, level: "HL" | "OL"): string {
  if (year === 2026) {
    return level === "HL"
      ? "Cultural Context, General Vision and Viewpoint, Literary Genre"
      : "Social Setting, Relationships, Hero, heroine, villain";
  }
  return level === "HL"
    ? "Theme or Issue, Cultural Context, General Vision and Viewpoint"
    : "Theme, Social Setting, Relationships";
}

function formatTextEntry(t: ComparativeTextEntry): string {
  if (t.director) {
    return `"${t.title}" dir. ${t.director} (${t.category})`;
  }
  return `"${t.title}" by ${t.author} (${t.category})`;
}

function buildQuoteAccuracyBlock(context: PromptContext): string {
  if (context.contentType === "poetry" && context.poemText) {
    return `QUOTE ACCURACY:
The full text of the poem has been provided below. You have the actual text in front of you. Use it.
- Quote directly and confidently from the provided text. No [VERIFY] tags needed.
- Do not invent or fabricate any quotes. Only quote words that appear in the provided text.
- If you want to quote a phrase, check it against the provided text first.
- Cross-reference every quotation against the text before including it.`;
  }

  if (context.contentType === "poetry") {
    return `QUOTE ACCURACY IS THE SINGLE MOST IMPORTANT RULE:
STEP 1: READ THE POEM FIRST. You have access to the web_search tool. Before writing ANY analysis, use it to search for the full text of "${context.poem}" by ${context.poet}. Find a reliable source (Poetry Foundation, poets.org, or similar). Read the full text carefully.

STEP 2: ONLY AFTER you have read the poem text via web search, begin your analysis. If web search fails to find the full text, state this clearly at the top of the note and fall back to paraphrasing.

STEP 3: QUOTE RULES:
- If you successfully found and read the poem text via web search, quote directly and confidently. No [VERIFY] tags needed for quotes you can see in the search results.
- If web search did not return the full text, follow these rules:
  - DEFAULT TO PARAPHRASING. Describe what lines say in your own words.
  - If you include ANY direct quote from memory, flag it with [VERIFY].
  - A note with accurate paraphrasing is infinitely better than confident but wrong quotes.
- Do NOT invent phrases, similes, metaphors, or images that you are not certain exist in the poem.`;
  }

  if (context.contentType === "comparative") {
    return `QUOTE ACCURACY:
You have access to the web_search tool. Use it to verify key quotes from each of the three texts.
- For each text, search for key passages you plan to quote. Verify the wording before including it.
- If you cannot verify a quote via web search, paraphrase instead and flag it with [VERIFY].
- Never fabricate a quote. A paraphrased reference is always better than an inaccurate direct quote.
- Do not quote literary critics or secondary sources. Only quote the texts themselves.`;
  }

  if (context.contentType === "worksheet") {
    return `QUOTE ACCURACY:
If you include direct quotes from any text, use web_search to verify them first.
- If you cannot verify a quote, paraphrase instead or flag it with [VERIFY].
- For close reading exercises, ensure passages are accurate. Use web search to find the correct wording.
- Never fabricate quotes for exam-style questions.`;
  }

  if (context.contentType === "single_text") {
    return `QUOTE ACCURACY IS CRITICAL FOR SINGLE TEXT NOTES:
You have access to the web_search tool. Before writing your analysis, use it to search for key quotes from "${context.textTitle}" by ${context.author}.
- Search for character quotes, pivotal scenes, and thematic passages.
- Only quote words you have verified via web search. No inventing quotes.
- If you cannot verify a quote, paraphrase the passage and flag with [VERIFY].
- A note with accurate paraphrasing is better than confident but wrong quotes.
- Do not quote literary critics or secondary sources. Only quote the text itself.`;
  }

  if (context.contentType === "unseen_poetry" || context.contentType === "comprehension" || context.contentType === "composition") {
    return `QUOTE ACCURACY:
This is a skills-based guide. If you include example quotes from texts, ensure they are accurate or clearly labelled as illustrative examples.
- For practice exercises using public domain poems, verify the poem text via web search if needed.
- Do not fabricate quotes from any specific text.`;
  }

  // Slides: minimal guidance
  return `QUOTE ACCURACY:
If you include direct quotes on slides, ensure they are accurate. Use web_search to verify key quotes.
If unsure, paraphrase or flag with [VERIFY].`;
}

export function buildSystemPrompt(context: PromptContext): string {
  if (context.contentType === 'poetry') {
    return `You are an experienced Leaving Certificate English teacher writing per-poem study notes for Higher Level students. You write the way a teacher talks to a student in a one-to-one grind, not the way a textbook publishes filler. Your job is to make the poem usable in an exam, not to pad a page.

<absolute_rules>
1. Every double-quoted phrase must appear verbatim in <quote_bank>. Do not invent, paraphrase, or modernise quotes inside quotation marks.
2. Produce exactly the number of stanza sections specified by <structure.stanza_breaks>. Not more, not fewer. If <structure.confidence> is "unverified", omit the stanza-by-stanza section entirely and use the theme-led structure described in <output_format.degraded_mode>.
3. Any stanza-count claim in the Overview must equal the number of stanza sections you produce. If they disagree, regenerate.
4. UK English. Banned spellings: color, analyze, organize, recognize, honor, defense, behavior, favorite, neighborhood.
5. No em dashes (—). No en dashes (–) in prose. Use commas, full stops, colons, semicolons, parentheses.
6. Banned phrases (case-insensitive): "this line captures", "the poet employs", "masterfully", "evocative language and imagery", "deceptively simple", "visual imagery dominates", "creates a vivid picture", "establishes the poem's central metaphor", "powerful statement underscores", "reinforcing the idea that", "Furthermore", "Moreover", "In conclusion", "It is important to note", "comprehensive", "revolutionise", "unlock your potential". If your draft contains any of these, rewrite the sentence.
7. Begin the response directly with the markdown H1 title. No preamble, no meta-commentary, no narration of your process.
</absolute_rules>

<voice>
Direct and specific. "Kavanagh is being deliberately ironic here", not "the poet employs irony". Vary sentence length. Address the student as "you" or "we", never "the reader". Name techniques only when you can also name what they actually do in this poem. Cut any sentence whose deletion would lose nothing.
</voice>`;
  }

  const readingLevel = getReadingLevel(context.level ?? 'HL');
  const modes = getComparativeModes(context.year ?? 2026, context.level ?? 'HL');
  const quoteBlock = buildQuoteAccuracyBlock(context);

  let examAlignmentBlock = "";
  if (context.contentType === "comparative" && context.comparativeExamPattern) {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
${context.comparativeExamPattern}

Your note must:
(1) Address the specific mode directly, not drift into other modes
(2) Compare and contrast across all three texts, not summarise each text separately
(3) Include evidence-based arguments with supporting quotation
(4) Demonstrate the A-then-B-then-C linking structure examiners reward`;
  }

  if (context.contentType === "single_text") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 2, Section I text (60 marks). The single text question asks students to engage personally and critically with the text. Questions typically ask students to discuss a theme, a character, a key moment, or the text's overall impact.

Your note must:
(1) Prepare students for character-focused, theme-focused, and moment-focused questions
(2) Provide quotes that can be deployed flexibly across different question angles
(3) Show students how to structure a 60-mark essay with proper paragraph development
(4) Connect analysis to the specific marking criteria: clarity of argument, use of evidence, personal response`;
  }

  if (context.contentType === "unseen_poetry") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 2, Section III skills guide. The unseen poetry question (50 marks) asks students to respond to a poem they have never seen before. The examiner rewards students who can identify techniques, quote accurately from the given poem, explain effects, and offer genuine personal response.

Your guide must:
(1) Teach a repeatable method that works for any poem
(2) Focus on the techniques that actually appear in exam poems (imagery, tone, structure, sound)
(3) Show students how to write about technique with precision, not vagueness
(4) Emphasise personal response as a genuine component of the mark, not an afterthought`;
  }

  if (context.contentType === "comprehension") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 1, Section I skills guide. Question A (comprehension, 50 marks) tests the student's ability to read, understand, and analyse unseen texts. Question B (functional writing, 50 marks) tests the student's ability to write in a specific format and register.

Your guide must:
(1) Teach students to decode what each question type is actually asking
(2) Show how to use evidence from the passage without over-quoting or under-quoting
(3) For Question B, emphasise format conventions and register as much as content
(4) Connect all advice to the PCLM marking criteria used by examiners`;
  }

  if (context.contentType === "composition") {
    examAlignmentBlock = `

EXAM ALIGNMENT REQUIREMENT:
This is a Paper 1, Section II composition (100 marks, the highest-value question on either paper). Assessed on PCLM: Purpose (P), Coherence (C), Language (L), Mechanics (M). Each criterion is marked on a scale.

Your guide must:
(1) Make PCLM concrete and actionable for this specific composition type
(2) Show students what distinguishes a 70-mark composition from a 90-mark composition
(3) Provide openings and structures that demonstrate clear purpose from the first line
(4) Emphasise that Language marks come from precision and variety, not from big words`;
  }

  return `You are a Leaving Certificate English content generator for an experienced Irish secondary school teacher. Your role is to produce exam-focused, accurate, and concise study content aligned with the Irish Leaving Certificate English syllabus.

${quoteBlock}

ABSOLUTE RULES:
- Begin your response directly with the markdown heading. Do not include any preamble, meta-commentary, or narration about your process. Do not write phrases like "Based on the search results" or "Let me compile" or "Here is the note". Start with the # heading on the first line.
- Write in UK English at all times (colour, analyse, recognise, etc.)
- NEVER use em dashes or en dashes anywhere. Not once. Not ever. Use commas, full stops, semicolons, or colons instead. Students recognise em dashes as AI-generated and it destroys credibility.
- NEVER include [VERIFY], [CHECK], [TODO], [NOTE], or any bracketed internal markers in your output. Every statement must be your final, confident analysis. If you are uncertain about a quote, either verify it from the poem text provided and include it confidently, or leave it out and paraphrase instead. The output must be a polished, finished document ready for student use with zero editing required.
- Never invent plot details, character names, or events.
- Never use these words: delve, nuanced (unless genuinely necessary), landscape (figuratively), multifaceted, tapestry, furthermore, moreover, additionally (in sequence).
- REMINDER: These words are BANNED from your output regardless of what you read in search results or source material: delve, nuanced (unless essential), landscape (figurative), multifaceted, tapestry, furthermore, moreover, additionally (in sequence). Do not absorb vocabulary from literary criticism websites into your output. Write in your own voice as a teacher, not in the voice of academic critics.
- Every literary device you identify must be from the approved list and must be connected to meaning. Do not name a device without explaining its effect.
- All content must be defensible in an SEC exam context.
- Content should read as if written by an experienced teacher, not by AI.
- Vary sentence length. Mix short and long. Do not start consecutive paragraphs with the same word.
- No dramatic or complex vocabulary. Use strong, precise words that students would naturally use.
- The goal is to simplify topics students do not understand and explain them in accessible language. Top-tier analysis does not require impenetrable prose.

APPROVED POETIC/LITERARY DEVICES (only use devices from this list):
Sound devices: alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance
Figurative language: metaphor, simile, personification, hyperbole, oxymoron, symbolism, allegory
Structural devices: enjambment, caesura, stanza structure, volta (turn), refrain, repetition, parallelism
Tone and mood: tone shifts, irony (verbal, situational, dramatic), ambiguity, juxtaposition, contrast
Imagery: visual imagery, auditory imagery, tactile imagery, sensory detail
Other exam-relevant devices: rhetorical questions, direct address, colloquial language, register shifts, dramatic monologue, narrative voice (first/third person)

Do NOT use synecdoche, metonymy, litotes, anaphora (use "repetition" instead), epistrophe, chiasmus, zeugma, synesthesia, or any obscure device that would confuse a typical HL student or that examiners would not expect to see identified.

CRITICAL: ONLY QUOTE THE TEXTS THEMSELVES. Never quote literary critics or secondary sources. If you read analysis or criticism during your search, absorb the ideas but express them in your own words. Your note should contain direct quotes from the texts only. Never include phrases from SparkNotes, analysis sections, academic papers, or any other secondary source as if they are your own analysis or the author's words. If you want to reference a widely held critical view, state it as: "Critics have noted that..." or "This is widely regarded as..." but never quote the critic directly.

FORM AND STRUCTURE ACCURACY:
When describing a text's form and structure, only state what you are confident about. Do not guess stanza counts, line counts, or rhyme schemes if you are unsure.
- If you know the form confidently (e.g., a sonnet, a villanelle), state it.
- If you are unsure, describe the general character rather than inventing specific numbers.

READING LEVEL:
${readingLevel}

CONTEXT:
You are generating content for the ${context.year} Leaving Certificate English examination.
The prescribed material is defined by Circular ${context.circular}.
The comparative modes for ${context.year} Higher Level are: ${modes}.
The student is studying at ${context.level} Level.${examAlignmentBlock}`;
}


// =============================================================================
// COMPARATIVE PROMPT DISPATCHER
//
// The comparative section produces twelve distinct note types organised in three
// families. The dispatcher routes on context.comparativeNoteType. Default
// behaviour is "mode_grid" (the original 5-section comparative note), so any
// caller that does not set the discriminator gets the legacy behaviour.
//
// Single-text family (uses 1 text from comparativeTexts[0]):
//   text_full_breakdown, text_character, text_key_moments, text_mode_profile,
//   text_relationships, text_quote_bank
// Cross-text family (uses 3 texts):
//   mode_grid, comparison_grid_table, comparative_argument, sample_paragraph
// Question-driven family (3 texts + question text + format):
//   question_plan, sample_answer
// =============================================================================

export function buildComparativePrompt(context: PromptContext): string {
  const noteType = context.comparativeNoteType || 'mode_grid';
  const core = (() => {
    switch (noteType) {
      case 'mode_grid':
        return buildComparativeModeGridPrompt(context);
      case 'text_full_breakdown':
        return buildComparativeTextFullPrompt(context);
      case 'text_character':
        return buildComparativeCharacterPrompt(context);
      case 'text_key_moments':
        return buildComparativeKeyMomentsPrompt(context);
      case 'text_mode_profile':
        return buildComparativeModeProfilePrompt(context);
      case 'text_relationships':
        return buildComparativeRelationshipsPrompt(context);
      case 'text_quote_bank':
        return buildComparativeQuoteBankPrompt(context);
      case 'comparison_grid_table':
        return buildComparativeGridTablePrompt(context);
      case 'comparative_argument':
        return buildComparativeArgumentPrompt(context);
      case 'sample_paragraph':
        return buildComparativeSampleParagraphPrompt(context);
      case 'question_plan':
        return buildComparativeQuestionPlanPrompt(context);
      case 'sample_answer':
        return buildComparativeSampleAnswerPrompt(context);
      default:
        return buildComparativeModeGridPrompt(context);
    }
  })();

  const substrate = buildSubstrateBlock(context);
  return substrate ? `${substrate}\n\n${core}` : core;
}

/**
 * Render the verified substrate (Profile + QuoteBank) for any text in
 * comparativeProfiles that has one. Empty string if no profiles are present.
 *
 * The block is prepended to every comparative user prompt. It enforces:
 *   - quote only from the provided quote bank for profiled texts
 *   - do not contradict the verified key_moments / characters / mode profiles
 *   - paraphrase if a needed quote is not in the bank
 *   - for unprofiled texts, fall back to web-search verification with paraphrase
 */
function buildSubstrateBlock(context: PromptContext): string {
  const profiles = context.comparativeProfiles ?? [];
  const texts = context.comparativeTexts ?? [];
  return renderSubstrateBlock(
    texts.map((t) => formatTextEntry(t)),
    profiles
  );
}

/**
 * Single-text variant. Used by buildSingleTextPrompt. The same profile schema
 * backs both questions: a Crucible profile serves Paper 2 Section I (Single
 * Text, 60 marks) and Section II (Comparative, 70 marks) equally.
 */
function buildSingleTextSubstrateBlock(context: PromptContext): string {
  const entry = context.singleTextProfile;
  if (!entry) return "";
  const headerLabel = context.textTitle
    ? `"${context.textTitle}"${context.author ? ` by ${context.author}` : ""}`
    : "(unspecified)";
  return renderSubstrateBlock([headerLabel], [entry]);
}

/**
 * Shared rendering for substrate. Inputs are parallel arrays of text labels
 * and profile entries (null where no profile is available). Returns the empty
 * string if no entries are present.
 */
function renderSubstrateBlock(
  textLabels: string[],
  entries: Array<{ profile: unknown; quotes: unknown } | null>
): string {
  const anyProfile = entries.some((p) => p != null);
  if (!anyProfile) return "";

  const blocks: string[] = entries.map((entry, i) => {
    const tag = `Text ${i + 1}`;
    if (!entry) {
      const titleStr = textLabels[i] ?? "(unspecified)";
      return `### ${tag}: ${titleStr}\nNO VERIFIED SUBSTRATE. For this text, verify quotes via web search; paraphrase if you cannot verify; never fabricate quotations.`;
    }
    const profile = entry.profile as { title?: string; author?: string };
    const profileJson = JSON.stringify(entry.profile, null, 2);
    const quotesJson = JSON.stringify(entry.quotes, null, 2);
    const header = profile.title
      ? `${tag}: "${profile.title}"${profile.author ? ` by ${profile.author}` : ""}`
      : tag;
    return `### ${header}\nVERIFIED SUBSTRATE PROVIDED. Anchor your analysis here.\n\n<profile>\n${profileJson}\n</profile>\n\n<quote_bank>\n${quotesJson}\n</quote_bank>`;
  });

  return `<verified_substrate>
The following is reviewed analytical substrate for one or more of the texts in this task. It has been hand-checked. ANCHOR YOUR ANALYSIS IN THIS SUBSTRATE.

ABSOLUTE RULES WHEN A SUBSTRATE IS PRESENT FOR A TEXT:
1. Quote ONLY from that text's quote_bank below. Every double-quoted phrase you write for that text must match a quote.text entry verbatim, character-for-character, including punctuation and capitalisation.
2. Use the verified plotBeats, keyMoments, characters, relationships, culturalContext, generalVisionAndViewpoint, literaryGenre, and themeOrIssue fields as your primary source. Do not invent characters, plot details, or claims that contradict the substrate.
3. If you need a quote that is not in the quote_bank, do not invent one. Paraphrase the moment in your own words and frame it explicitly as paraphrase ("a moment in which...", "the play has the character...").
4. Do not output quote IDs, key moment IDs, or any other internal identifier in your response. The IDs are for your reasoning only; the student should never see them.
5. Do not introduce material from outside the substrate for this text. The substrate is the source of truth.

For texts with NO VERIFIED SUBSTRATE: use web search to verify any quotation; if you cannot verify, paraphrase and label as paraphrase.

${blocks.join("\n\n---\n\n")}
</verified_substrate>`;
}

// -----------------------------------------------------------------------------
// Shared helpers for comparative prompts
// -----------------------------------------------------------------------------

function getModeAxes(mode: string): string {
  if (mode === 'Cultural Context') {
    return `Cultural Context axes (use only those genuinely present in the text):
1. Social setting and class
2. Gender roles and the freedom of women
3. Religion and institutional authority
4. Family and marriage
5. Authority, power, and conformity vs rebellion against social norms`;
  }
  if (mode === 'General Vision and Viewpoint') {
    return `General Vision and Viewpoint axes:
1. The text's one-line vision (optimistic, pessimistic, qualified, ambiguous)
2. The opening and how it shapes the vision
3. Key moment or climax and how it shapes the vision
4. The closing and how it shapes the vision
5. Characters' responses to crises (resilience, passivity, courage)
6. Compassion vs cruelty, hope vs despair, paradox of human nature`;
  }
  if (mode === 'Literary Genre') {
    return `Literary Genre axes (use the toolkit appropriate to the text type):
For novels: narrative voice, structure, imagery, pacing, dialogue, characterisation.
For drama: soliloquy, stage directions, asides, structure, dialogue, staging.
For film: cinematography, music, editing, mise-en-scene, dialogue, performance.
Always include: opening, key moment / climax, closing.`;
  }
  if (mode === 'Theme or Issue') {
    return `Theme or Issue axes:
1. What the theme or issue is at the centre of the text
2. How the text introduces the theme
3. Pivotal moments where the theme is tested or revealed
4. Contradictory aspects of the theme (paradox, ambiguity)
5. What position the text ultimately takes on the theme
6. How the theme connects to character, conflict, and resolution`;
  }
  if (mode === 'Social Setting') {
    return `Social Setting axes (Ordinary Level):
1. Where and when the text is set
2. The community and its values
3. Family life within the setting
4. Work, money, and social position
5. How setting shapes characters' choices`;
  }
  if (mode === 'Relationships') {
    return `Relationships axes (Ordinary Level):
1. Family relationships
2. Friendships
3. Romantic relationships
4. Conflict between characters
5. How relationships change over the course of the text`;
  }
  if (mode === 'Hero, heroine, villain' || mode === 'Hero/Heroine/Villain') {
    return `Hero, heroine, villain axes (Ordinary Level):
1. Who the hero or heroine is and what they want
2. Who opposes them and why
3. Key choices the hero or heroine makes
4. Key actions of the villain or antagonist
5. How the conflict resolves and what it shows about each role`;
  }
  // Theme (OL)
  if (mode === 'Theme') {
    return `Theme axes (Ordinary Level):
1. What the theme is and how it is introduced
2. Key moments where the theme is shown
3. How different characters relate to the theme
4. How the theme is resolved (or left open)
5. What the text says about this theme overall`;
  }
  return '';
}

function getModeFocusBlock(mode: string): string {
  if (mode === 'Cultural Context') {
    return `MODE FOCUS: Arguments must relate to social setting and class, family, religion, love and marriage, gender roles, or authority and conformity. Only use axes genuinely relevant to the text. Do not force every axis onto every text. Cultural Context is about the world the characters live in and how it determines their freedoms and choices, not about isolated themes.`;
  }
  if (mode === 'General Vision and Viewpoint') {
    return `MODE FOCUS: Focus on the overall worldview each text presents. Is it optimistic, pessimistic, qualified, or ambiguous? Use the opening, the climax or pivotal moment, and the closing as anchors. The SEC routinely tests the climax directly. Address how characters' responses to crises shape the reader's sense of hope or despair. Do not drift into theme analysis.`;
  }
  if (mode === 'Literary Genre') {
    return `MODE FOCUS: Focus on HOW each text tells its story, not just what happens. Use the toolkit appropriate to each text type: novel (narrative voice, structure, imagery, pacing), drama (soliloquy, stage directions, structure, staging), film (cinematography, music, editing, mise-en-scene). Anchor every claim in a specific moment or scene. The SEC rewards candidates who use the right toolkit for the right genre.`;
  }
  if (mode === 'Theme or Issue') {
    return `MODE FOCUS: Identify the shared theme or issue. Show how each text approaches it differently. Use pivotal moments where the theme is tested. Address contradictory aspects of human nature where relevant (a recurring SEC angle). Do not produce a summary of each text. Compare how the three texts illuminate the theme through different lenses.`;
  }
  return '';
}

function formatTextEntryShort(t: ComparativeTextEntry | undefined): string {
  if (!t) return 'a text';
  if (t.director) return `"${t.title}" directed by ${t.director}`;
  return `"${t.title}" by ${t.author}`;
}

function formatTextWithType(t: ComparativeTextEntry | undefined): string {
  if (!t) return 'a text';
  const typeLabel = t.category || 'text';
  if (t.director) return `"${t.title}" directed by ${t.director} (${typeLabel})`;
  return `"${t.title}" by ${t.author} (${typeLabel})`;
}

function getQuestionFormatBlock(format: string | undefined): string {
  if (format === 'Q1a_30') {
    return `FORMAT: Q1(a), 30 marks. Single text answer. Approximately 500-650 words. PCLM split: P=9, C=9, L=9, M=3. The answer must focus on ONE of the three texts only. The other two texts will be addressed in the Q1(b) follow-on. Do not over-introduce the mode; spend your time on the argument and evidence. The SEC marker rewards a clear thesis stated in the first 2 sentences and evidence anchored in 2-3 specific moments.`;
  }
  if (format === 'Q1b_40') {
    return `FORMAT: Q1(b), 40 marks. Comparative answer across two texts. Approximately 700-900 words. PCLM split: P=12, C=12, L=12, M=4. The answer must compare the OTHER two texts (not the one used in Q1(a)). Use sustained comparative writing inside paragraphs, not just at paragraph junctions. Include 3-4 link sentences ("While X... by contrast Y...", "Similarly to X, Y also..."). The SEC marker rewards qualification ("similarities need to be qualified by..."); avoid binary positions where ambiguity is more accurate.`;
  }
  if (format === 'Q2_70') {
    return `FORMAT: Q2, 70 marks, single full essay. Approximately 1300-1600 words (around 5 well-developed pages, NOT 9). PCLM split: P=21, C=21, L=21, M=7. The answer must reference all three texts in a sustained comparative weave. 4-6 substantial body paragraphs, each citing all three texts with explicit comparative link language. Introduction defines the mode in candidate's own words and signals position on the question; brief, question-facing conclusion. The single biggest H1/H2 differentiator is "primacy of Purpose": rhetorical beauty cannot exceed marks for clarity of argument. Going long cannibalises Poetry time, so do not pad.`;
  }
  return '';
}

// -----------------------------------------------------------------------------
// 1. mode_grid (default, 5-section comparative note across 3 texts)
// -----------------------------------------------------------------------------

function buildComparativeModeGridPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const texts = context.comparativeTexts || [];
  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  const modeFocus = getModeFocusBlock(context.comparativeMode || '');

  return `Generate a comparative study note for the following three texts studied through the lens of ${context.comparativeMode}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${context.comparativeMode}

${modeFocus}

STRUCTURE (follow this exactly):

## 1. Mode Overview
2-3 sentences covering:
- What this comparative mode actually means
- What the examiner is looking for when reading an answer in this mode
- The most common mistake students make (e.g. writing about theme when the question is about vision, or summarising each text instead of comparing)

## 2. Key Comparative Arguments
Provide 4-5 arguments. For EACH argument:
- A clear heading stating the comparative point
- 3-5 sentences developing the argument with supporting evidence from ALL THREE texts
- This must be a genuine comparison, not three separate summaries
- One clear similarity across the texts
- One clear qualification or contrast across the texts

## 3. Comparison Anchors
For each argument from Section 2, provide:
- A pre-built transitional phrase for linking the texts in an exam answer
- Ready-to-use sentence starters such as "While [Text A] presents..., [Text B] offers a qualified..."
- Include phrases for both similarities and contrasts

## 4. Key Quotes per Mode
For each of the three texts, provide 3-4 key quotes that are relevant to this mode.
- Tag each quote to which argument from Section 2 it supports
- Use web search to verify quotes. If you cannot verify, paraphrase and label as a paraphrase

### ${texts[0]?.title || "Text 1"}
3-4 quotes here

### ${texts[1]?.title || "Text 2"}
3-4 quotes here

### ${texts[2]?.title || "Text 3"}
3-4 quotes here

## 5. Sample Comparative Paragraph
Write one full paragraph (180-220 words) demonstrating how to weave all three texts together in response to a typical question in this mode.
- Use sustained comparative writing within the paragraph, not just at junctions
- Include short quotes from Section 4
- Show how to transition between texts using the link sentences from Section 3
- Address the specific mode, not general themes${userInstr}`;
}

// -----------------------------------------------------------------------------
// 2. text_full_breakdown (1 text, full breakdown for comparative use)
// -----------------------------------------------------------------------------

function buildComparativeTextFullPrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a full comparative-study breakdown of ${textRef}. This is the canonical reference note for one of the three texts a student studies for the Comparative Study (Paper 2, Section II). It must be deep enough that a student can deploy this single text in any mode question.

Year: ${context.year} | Level: ${context.level}

This note is read alongside two other texts. The student needs to know this text cold so that under exam pressure they can pull a key moment, a character, or a quote into any of the three comparative modes.

STRUCTURE (follow this exactly):

## 1. Plot in 5-7 Beats
For each beat: one sentence on what happens, one sentence on why it matters. Cover opening, inciting incident, midpoint shift, climax, resolution, closing image.

## 2. Central Character
150-200 words. Their role, social position, mindset, internal contradictions, and arc. Include 2-3 verified quotes (web search to confirm) or detailed paraphrase if a quote cannot be verified.

## 3. Supporting Characters
3-5 supporting characters. For each, 60-100 words covering role, key relationships, and one anchor quote or scene reference.

## 4. Relationship Map
List the 3-5 most important relationships in the text. For each, one short paragraph (40-60 words) on what the relationship reveals and how it changes.

## 5. Key Moments
5-8 moments. For each:
- Title and location (chapter, act-scene, or timestamp)
- One paragraph on what happens and why it matters
- Mode tags showing which modes the moment can be used in (CC, GVV, LG, TI), with a one-line note on the angle

## 6. Cultural Context Profile
For each axis, write 2-3 sentences on whether and how the text engages with it. If the axis is irrelevant, say so plainly.
${getModeAxes('Cultural Context')}

## 7. General Vision and Viewpoint Profile
- One-sentence vision statement for the whole text
- Opening: how it shapes the vision (2-3 sentences)
- Key moment or climax: how it shapes the vision (2-3 sentences)
- Closing: how it shapes the vision (2-3 sentences)
- Where the vision is qualified or paradoxical

## 8. Literary Genre Profile
Use the toolkit appropriate to the text type. 4-6 elements, each 2-3 sentences with a specific moment as anchor.

## 9. Theme or Issue Profile
3-5 primary themes the text engages. For each: one sentence on the theme, one on how the text approaches it, one on a pivotal moment that shows it.

## 10. Quote Bank
12-18 verified quotes organised by theme or character. For each quote: speaker, location, one-line note on what it shows, and which modes it serves.

## 11. Common Examiner Pitfalls Specific to This Text
3-5 mistakes students typically make when using this text in comparative answers. Be specific to this text, not generic.

QUOTE RULES:
Use web search to verify quotes. Quote only the text itself, never literary critics or secondary sources. If you cannot verify a quote's exact wording, paraphrase the passage instead and note that it is a paraphrase. A note with accurate paraphrasing is better than an inaccurate direct quote.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 3. text_character (1 text + character name, deep character study)
// -----------------------------------------------------------------------------

function buildComparativeCharacterPrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const character = context.comparativeCharacterName || 'the central character';
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a deep character study of ${character} from ${textRef}, framed for use in the Leaving Certificate Comparative Study.

Year: ${context.year} | Level: ${context.level}

This profile must let a student deploy ${character} flexibly across Cultural Context, General Vision and Viewpoint, Literary Genre, and Theme or Issue questions. A character study for the comparative is not a personality biography. It is a tool for argument.

STRUCTURE (follow this exactly):

## 1. Role in the Text
80-120 words. What ${character} represents structurally. Are they the protagonist, antagonist, foil, witness, victim, agent of change? What function do they serve in the narrative?

## 2. Social Position and Freedoms
80-120 words. Where ${character} sits in the social order of the text's world. What freedoms they have, what freedoms are denied them, and how this is shown. The SEC examined this directly in 2024 ("level of freedom enjoyed by a central character is determined by social position and status").

## 3. Mindset and Inner Life
80-120 words. How the text shows the way ${character} thinks. The 2025 paper examined "mindset of a central character" directly. Include 2-3 anchor quotes or scenes that reveal interiority.

## 4. Internal Contradictions
80-120 words. Where ${character} is in conflict with themselves. The SEC marker rewards qualified readings, not binary ones. Identify at least one paradox in this character that an H1 candidate could exploit.

## 5. Arc
100-150 words. How ${character} changes (or refuses to change) from opening to close. Anchor in 3 specific moments.

## 6. Key Relationships
3-5 relationships ${character} has. For each, 40-60 words on what the relationship reveals.

## 7. Key Quotes
8-12 quotes from or about ${character}. For each: location, one-line gloss, mode-relevance tags (CC, GVV, LG, TI).

## 8. Mode-Specific Deployment
How to use ${character} in each comparative mode. 3-4 sentences per mode showing the angle, the supporting moment, and a usable link sentence.

### Cultural Context
### General Vision and Viewpoint
### Literary Genre
### Theme or Issue

## 9. Comparison Hooks
For each mode, suggest one cross-text comparison angle: "${character} vs a character in another text on..." with the kind of comparison that would unlock a paragraph.

QUOTE RULES:
Use web search to verify quotes. If unverifiable, paraphrase and note the paraphrase. Quote only the text, never criticism.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 4. text_key_moments (1 text, 5-8 key moments tagged to all four modes)
// -----------------------------------------------------------------------------

function buildComparativeKeyMomentsPrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a Key Moments analysis for ${textRef}.

Year: ${context.year} | Level: ${context.level}

The SEC marking schemes 2023, 2024, 2025 all state that key moments exist "to allow candidates to ground their responses in specific moments without feeling that they must range over the entire text". Key moments are the spine of every elite comparative answer. A student must be able to deploy a single key moment under multiple modes.

This note must produce 6-8 key moments, each tagged so that the student can pull the right moment for the right question under exam pressure.

STRUCTURE (follow this exactly):

## How to Use This Note
50-80 words. Explain that the same moment can serve multiple modes, and that pulling a precise moment beats summarising plot. Reference the SEC's "primacy of Purpose" rule briefly.

## The Key Moments

For each moment (6-8 in total), produce a block in this exact shape:

### [Moment Title]
**Location:** chapter, act-scene, or timestamp
**What happens:** 2-3 sentences. Plain, no flourish.
**Why it matters:** 2-3 sentences explaining what the moment shows about character, theme, or vision.

**Mode deployment:**
- **Cultural Context:** which axis this moment serves (class, gender, religion, family, authority) and a one-sentence usage note
- **General Vision and Viewpoint:** how this moment shapes the vision and a one-sentence usage note
- **Literary Genre:** which technique is on display (specific to text type) and a one-sentence usage note
- **Theme or Issue:** which theme this moment carries and a one-sentence usage note

**Anchor quote or scene detail:** one short verified quote or specific scene description.

**Link sentence template:** one ready-to-use comparative link sentence the student can adapt, such as "In ${text?.title ?? 'this text'}, [moment description], a moment that contrasts sharply with [equivalent moment in another text]..."

---

Repeat for each moment.

## Coverage Check
50-80 words at the end. Note which modes are well covered by these moments and which are thinner. The teacher can use this to commission additional moments if needed.

QUOTE RULES:
Use web search to verify quotes. If unverifiable, describe the moment in detailed paraphrase and note that the quote is a paraphrase. Specific moments anchored in scene detail are more important than verbatim quotes.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 5. text_mode_profile (1 text + 1 mode, deep mode-specific profile)
// -----------------------------------------------------------------------------

function buildComparativeModeProfilePrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const mode = context.comparativeMode || 'Cultural Context';
  const axes = getModeAxes(mode);
  const focus = getModeFocusBlock(mode);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a Mode-Specific Profile of ${textRef} through the lens of ${mode}.

Year: ${context.year} | Level: ${context.level} | Mode: ${mode}

This is a one-text-one-mode deep profile. A student preparing for a ${mode} question on this text uses this note to know exactly what evidence, what moments, and what angles they can pull.

${focus}

${axes}

STRUCTURE (follow this exactly):

## 1. Mode Definition for This Text
80-100 words. Explain what ${mode} means and how it specifically applies to this text. Where does this text sit on the mode (e.g. for GVV: optimistic, pessimistic, qualified)? State a one-sentence position the student can defend.

## 2. Axis-by-Axis Profile
For each axis listed above, produce a section:

### [Axis name]
**Applies to this text:** Yes / Partially / No
**Summary:** 60-100 words. How this axis shows up in this text (or why it does not).
**Anchor moments:** 2-3 specific scenes or moments tied to this axis.
**Key quote:** one verified quote with location.
**Argument hook:** one sentence the student could lift directly into an essay.

If an axis does not apply to the text, say so plainly and move on. Do not pad.

## 3. Cross-Text Comparison Hooks
4-6 hooks for comparing this text on this mode against other prescribed texts on this list. For each hook: a one-sentence comparison angle and a usable link phrase.

## 4. Question-Specific Adaptations
Take 2-3 verbatim past SEC questions in this mode (you may use web search or your knowledge of recent papers). For each question: a 2-3 sentence answer-shape outline showing how this text would be deployed.

## 5. Pitfalls
3-5 specific pitfalls when using this text on this mode. The most common mistake students make is treating Cultural Context as Theme; address that explicitly if the mode is Cultural Context.

QUOTE RULES:
Use web search to verify quotes. Paraphrase and note the paraphrase if not verifiable. Quote only the text itself.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 6. text_relationships (1 text, relationship map)
// -----------------------------------------------------------------------------

function buildComparativeRelationshipsPrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a Relationships map for ${textRef}.

Year: ${context.year} | Level: ${context.level}

The SEC examined a "believable relationship" directly in 2024 (Literary Genre Q1). Relationships are also examined regularly under Cultural Context (love and marriage, family) and Theme or Issue (any relationship-driven theme). A student needs the major relationships in each text held cold.

STRUCTURE (follow this exactly):

## 1. Relationship Inventory
A short paragraph naming the 5-8 most important relationships in the text and why each matters. One sentence per relationship.

## 2. Relationship Profiles
For each relationship (5-8 in total):

### [Character A] and [Character B]
**Type:** family / romantic / friendship / antagonistic / professional / mentor-mentee
**Status at the start of the text:** one sentence
**Status at the end of the text:** one sentence
**Trajectory:** 80-120 words. How the relationship changes, what tests it, what reveals it.
**Key moment:** one specific scene anchored with a quote or scene description.
**Mode-relevance tags:** which comparative modes this relationship can serve (CC, GVV, LG, TI), with a one-sentence angle for each that applies.
**Comparison hook:** one suggestion for how this relationship can be compared with one in another prescribed text.

## 3. Relationship Patterns Across the Text
80-120 words. What recurring patterns emerge across the relationships in this text? (e.g. all relationships strained by class, all relationships defined by absence of one party, etc.) This is the kind of broader observation that wins H1 marks.

## 4. Pitfalls
3-5 specific pitfalls when writing about relationships in this text. e.g. "Do not confuse the central romantic relationship with the central conflict; they are not the same in this text."

QUOTE RULES:
Use web search to verify quotes. Paraphrase if not verifiable. Quote only the text.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 7. text_quote_bank (1 text, themed quote bank)
// -----------------------------------------------------------------------------

function buildComparativeQuoteBankPrompt(context: PromptContext): string {
  const text = context.comparativeTexts?.[0];
  const textRef = formatTextWithType(text);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a comprehensive Quote Bank for ${textRef}, organised for use in the Leaving Certificate Comparative Study.

Year: ${context.year} | Level: ${context.level}

This is a working reference. The student does not memorise all of these. They scan for the right quote when they hit a question. Therefore every quote must be tagged tightly so it can be retrieved fast.

STRUCTURE (follow this exactly):

## How This Bank Works
40-60 words. Explain the tagging system: each quote is tagged by speaker (or attribution), theme, character, and mode-relevance. Students should look up by mode, not by reading top to bottom.

## Quotes by Character
For the central character and 3-5 supporting characters, produce 5-8 quotes each. For each quote use this exact format:

> "[exact quote text]"
- Speaker / context: who says it, when, where
- Location: chapter, act-scene, or timestamp
- Theme tags: 2-3 themes
- Mode tags: CC / GVV / LG / TI (mark all that apply)
- One-line gloss: what this quote actually shows

## Quotes by Theme
Group quotes from the bank above (do not duplicate, just cross-reference) under 4-6 thematic headings. For each theme, list which character-quotes belong to it and a one-sentence note on the theme.

## Top 10 Most Versatile Quotes
The 10 quotes that can be deployed in the most modes / questions. List them in priority order. These are the quotes a student should know cold even under panic.

QUOTE RULES:
Use web search to verify quotes. Quote only the text itself, never literary critics or secondary sources. Aim for accuracy over volume. Better to deliver 30 verified quotes than 50 unreliable ones. If a quote cannot be verified, omit it rather than including an unverified one in a quote bank.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 8. comparison_grid_table (3 texts + 1 mode, the visual grid)
// -----------------------------------------------------------------------------

function buildComparativeGridTablePrompt(context: PromptContext): string {
  const texts = context.comparativeTexts || [];
  const mode = context.comparativeMode || 'Cultural Context';
  const axes = getModeAxes(mode);
  const focus = getModeFocusBlock(mode);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  return `Generate a Comparison Grid for the following three texts through the lens of ${mode}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${mode}

This is the working document teachers and elite students actually use to prepare for the comparative. A grid: rows are mode axes, columns are texts, cells contain the evidence and interpretation. PDST workshop materials and Aoife O'Driscoll teaching guides both confirm this is the dominant pedagogical format.

${focus}

${axes}

STRUCTURE (follow this exactly):

## 1. The Grid

Render as a markdown table with one column per text and one row per axis. Cells must be tight: one short interpretive sentence plus one anchor moment or quote, no more.

| Axis | ${texts[0]?.title || 'Text 1'} | ${texts[1]?.title || 'Text 2'} | ${texts[2]?.title || 'Text 3'} |
|------|---|---|---|
| [Axis 1] | ... | ... | ... |
| [Axis 2] | ... | ... | ... |
| ... |

If a cell does not apply to a particular text, write "Not applicable: [one-line reason]" rather than padding. Do not force every axis onto every text.

## 2. Quick Read of the Grid
150-200 words. After the grid, write a short interpretive paragraph naming the 2-3 strongest comparative threads visible in the grid. Where do similarities cluster? Where do qualifications appear? Which axes give the richest cross-text comparison?

## 3. 5-6 Comparative Arguments Drawn from the Grid
For each argument:
- A clear heading
- 2-3 sentences naming which cells of the grid the argument is drawn from
- One anchor moment or quote per text
- A ready-to-use link sentence

## 4. Three Strongest Question Angles
List 3 SEC question angles this grid is well-prepared to answer, with one-line notes on which arguments to lead with for each.

QUOTE RULES:
Use web search to verify key quotes that appear in the cells. Cell entries should be tight: paraphrased reference is acceptable in a grid cell. Verbatim quotes preferred where verifiable. Mark any unverified quote as a paraphrase.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 9. comparative_argument (3 texts + mode + argument focus, single deep argument)
// -----------------------------------------------------------------------------

function buildComparativeArgumentPrompt(context: PromptContext): string {
  const texts = context.comparativeTexts || [];
  const mode = context.comparativeMode || 'Cultural Context';
  const focus = context.comparativeArgumentFocus || 'a key comparative angle in this mode';
  const modeFocus = getModeFocusBlock(mode);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  return `Generate one detailed Comparative Argument across the following three texts on ${mode}, with the specific argument focus: ${focus}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${mode}
Argument focus: ${focus}

${modeFocus}

This note develops a single comparative argument in depth. It is what a student would build into one body paragraph (or, for a 70-mark Q2 essay, two paragraphs) of an exam answer. Total length 600-800 words.

STRUCTURE (follow this exactly):

## 1. The Argument in One Sentence
A single thesis sentence that names the argument focus and signals position across all three texts. 30 words maximum.

## 2. Why This Argument Lands in This Mode
60-80 words. Why this angle is genuinely a ${mode} argument and not a theme argument in disguise. Address the most common drift error.

## 3. Argument Across the Three Texts
Three sub-sections. For each text:

### ${texts[0]?.title || 'Text 1'}
80-120 words. State this text's position on the argument. Anchor in 1-2 specific moments. Include 1-2 short verified quotes. End with a one-sentence summary of what this text contributes to the argument.

### ${texts[1]?.title || 'Text 2'}
Same shape as above.

### ${texts[2]?.title || 'Text 3'}
Same shape as above.

## 4. Comparative Synthesis
120-180 words. The synthesis is not a summary. It is the analytical move that earns H1 marks. Where do the three texts agree? Where do they qualify each other? Use sustained comparative language ("X demonstrates A, while Y qualifies that position by..., and Z further complicates it through..."). Avoid binary comparisons; the SEC marker rewards qualified readings.

## 5. Three Ready-to-Use Link Sentences
Three sentences the student can drop directly into an essay paragraph that develops this argument. Each must move between two or three texts.

## 6. Strongest Past SEC Question for This Argument
Identify (or generate from the SEC pattern) one verbatim or close-paraphrase exam question this argument would answer well, and a one-line note on how to position the answer.

QUOTE RULES:
Use web search to verify quotes. Paraphrase if not verifiable. Quote only the texts.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 10. sample_paragraph (3 texts + mode + angle, A-then-B-then-C model paragraph)
// -----------------------------------------------------------------------------

function buildComparativeSampleParagraphPrompt(context: PromptContext): string {
  const texts = context.comparativeTexts || [];
  const mode = context.comparativeMode || 'Cultural Context';
  const focus = context.comparativeArgumentFocus || `a typical question on ${mode}`;
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  return `Generate one model Comparative Paragraph in the ${mode} mode, on the angle: ${focus}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${mode}
Angle: ${focus}

This is one paragraph as it would appear in a 70-mark Q2 essay. The student copies the structure, not the content. Total paragraph length 200-260 words.

STRUCTURE:

## 1. Question Premise
One sentence stating the question or angle this paragraph answers.

## 2. The Paragraph
A single paragraph of 200-260 words written in continuous prose. Within the paragraph:
- Open with a topic sentence that names the comparative point and signals position
- Move to ${texts[0]?.title || 'Text 1'} with an anchor moment and a short verified quote
- Move to ${texts[1]?.title || 'Text 2'} using a comparative link sentence ("Similarly...", "By contrast...", "Where ${texts[0]?.title} presents..., ${texts[1]?.title} qualifies that...")
- Move to ${texts[2]?.title || 'Text 3'} with another comparative link
- Close with a synthesis sentence that states what the comparison reveals

## 3. Annotation
After the paragraph, produce a 100-150 word annotation explaining:
- The opening topic sentence and how it signals position
- The two comparative link sentences (quote them) and what work they do
- The synthesis sentence and why it earns marks

## 4. PCLM Notes
3-4 short bullets identifying which PCLM bands this paragraph targets and how (Purpose: clear thesis; Coherence: link sentences; Language: precise verbs; Mechanics: clean punctuation).

QUOTE RULES:
Use web search to verify the quotes used in the paragraph. If a quote cannot be verified, paraphrase the line in the paragraph and note the paraphrase in the annotation.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 11. question_plan (3 texts + question + format, structured answer plan)
// -----------------------------------------------------------------------------

function buildComparativeQuestionPlanPrompt(context: PromptContext): string {
  const texts = context.comparativeTexts || [];
  const question = context.comparativeQuestionText || '';
  const format = context.comparativeQuestionFormat || 'Q2_70';
  const formatBlock = getQuestionFormatBlock(format);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  return `Generate a structured Answer Plan for the following SEC Comparative Study question.

QUESTION:
${question}

TEXTS:
${textList}

Year: ${context.year} | Level: ${context.level}

${formatBlock}

This is a plan, not a sample answer. The student uses this plan to write their own answer in the exam. The plan must be specific enough that the student can almost lift the structure directly.

STRUCTURE (follow this exactly):

## 1. Question Decoder
80-120 words. Break down the question.
- What mode is being tested (CC, GVV, LG, TI)?
- What sub-angle is being tested (e.g. for CC: power, gender, religion, family, authority)?
- What question shape is it (compare, to what extent, discuss, agree)?
- What specific structural element if any (climax, opening, key moment, relationship, technique)?
- The trap: what would a weaker student misread the question as?

## 2. Thesis
A single thesis sentence (30 words max) that addresses the specific sub-angle and signals position across all three texts. The "primacy of Purpose" rule means this thesis is the single most important sentence in the entire answer.

## 3. Introduction
80-120 words. The actual sentences (or close paraphrase) that should open the answer. Define the mode in the candidate's own words, signal position, and name all three texts.

## 4. Body Paragraph Plan
Produce 4-6 body paragraphs (4 for Q1a/Q1b, 4-6 for Q2). For each paragraph:

### Paragraph N: [Topic / Argument]
- **Topic sentence:** the actual opening sentence
- **${texts[0]?.title || 'Text 1'}:** which key moment, which quote (verified), one-line interpretation
- **${texts[1]?.title || 'Text 2'}:** which key moment, which quote (verified), one-line interpretation
- **${texts[2]?.title || 'Text 3'}:** which key moment, which quote (verified), one-line interpretation
- **Comparative link sentence:** one specific link sentence to use within this paragraph
- **Closing sentence:** how the paragraph ties back to the question

## 5. Conclusion
60-100 words. The actual closing paragraph. Question-facing. Restates position, gestures to what the comparison has revealed, does not introduce new material.

## 6. Word Count Discipline
Recap the target word count for the format and a one-line warning about pacing (the SEC has flagged comparative going long as the single biggest reason students run out of time for Poetry).

## 7. PCLM Targeting
4 short bullets explaining how this plan, executed cleanly, targets each PCLM band.

QUOTE RULES:
Use web search to verify all quotes specified in the plan. Mark any unverified quote as a paraphrase. Better to specify a paraphrase the student can hit reliably than a quote they will misremember in the exam.${userInstr}`;
}

// -----------------------------------------------------------------------------
// 12. sample_answer (3 texts + question + format, full H1-tier answer)
// -----------------------------------------------------------------------------

function buildComparativeSampleAnswerPrompt(context: PromptContext): string {
  const texts = context.comparativeTexts || [];
  const question = context.comparativeQuestionText || '';
  const format = context.comparativeQuestionFormat || 'Q2_70';
  const formatBlock = getQuestionFormatBlock(format);
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  return `Generate a full Sample Answer at H1 tier (90+ marks band) for the following SEC Comparative Study question.

QUESTION:
${question}

TEXTS:
${textList}

Year: ${context.year} | Level: ${context.level}

${formatBlock}

This must read as if written by a strong student under exam conditions, not by an AI or a teacher. H1 markers from the SEC marking schemes 2023-2025: critical literacy, qualified comparisons (not binary), sustained comparative weave inside paragraphs, precise vocabulary, two or three key moments per text rather than plot summary, defended structural choice. The "primacy of Purpose" cap means rhetorical beauty cannot exceed marks for clarity of argument.

STRUCTURE (follow this exactly):

## Sample Answer

Write the full answer as continuous prose. Use paragraph breaks but do not use headings or bullet points within the answer itself. Hit the target word count for the format.

The answer must:
- Open with a thesis that directly addresses the question's specific sub-angle
- Use sustained comparative writing inside paragraphs ("Similarly...", "By contrast...", "While X presents..., Y qualifies that...", "Where X is...", "Z complicates this further by...")
- Anchor every claim in a specific moment, scene, or short verified quote
- Use 2-3 key moments per text rather than plot summary
- Qualify comparisons (not "X and Y both show..."; instead "X and Y both show A, though Y qualifies the picture by...")
- Close with a brief, question-facing conclusion that does not introduce new material

## Annotation

After the answer, produce a 200-300 word annotation explaining:
- Where the thesis is and how it signals position
- Three specific sentences that demonstrate H1-level comparative weave (quote them)
- Where the answer qualifies its comparison rather than oversimplifying
- One sentence on what stops this from being an H2 answer

## PCLM Self-Assessment
Estimate the band hit on each of P, C, L, M and explain in one sentence each.

QUOTE RULES:
Use web search to verify every quote in the sample answer. If a quote cannot be verified, replace it with a precise paraphrase rather than a fabricated quote. Mark paraphrases in the answer with brief contextual framing ("a moment in which..."). Quote only the texts themselves, never literary critics.${userInstr}`;
}

export function buildWorksheetPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  let textDescription: string;
  if (context.worksheetContentType === "poetry") {
    textDescription = `"${context.poem}" by ${context.poet}`;
  } else if (context.worksheetContentType === "single_text") {
    textDescription = `"${context.textTitle}" by ${context.author}`;
  } else if (context.worksheetContentType === "unseen_poetry") {
    textDescription = `unseen poetry skills (${context.level} level, ${context.year})`;
  } else if (context.worksheetContentType === "comprehension") {
    textDescription = `Paper 1 comprehension skills (${context.level} level, ${context.year})`;
  } else if (context.worksheetContentType === "composition") {
    const typeLabels: Record<string, string> = {
      personal_essay: "Personal Essay", short_story: "Short Story", speech: "Speech",
      discursive: "Discursive Essay", feature_article: "Feature Article", descriptive: "Descriptive Essay",
    };
    const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";
    textDescription = `Paper 1 composition: ${compType} (${context.level} level, ${context.year})`;
  } else {
    const texts = context.comparativeTexts || [];
    const textList = texts.map((t) => formatTextEntry(t)).join(", ");
    textDescription = `Comparative study (${context.comparativeMode}): ${textList}`;
  }

  const activities = context.activityTypes || [
    "pre-lesson",
    "during-lesson",
    "post-lesson",
    "vocabulary",
  ];
  const activityList = activities
    .map((a) => a.replace("-", " "))
    .join(", ");

  let activityInstructions = "";

  if (activities.includes("pre-lesson")) {
    activityInstructions += `

## Pre-Lesson Activities
Generate 2-3 activities to engage students before reading/studying the text:
- Discussion starter questions that connect to students' own experiences
- Prediction exercises based on the title or key themes
- Image or scenario prompts that introduce key ideas
Keep instructions brief. Each activity should take 5-10 minutes.`;
  }

  if (activities.includes("during-lesson")) {
    activityInstructions += `

## During-Lesson Activities
Generate 3-4 activities for use while studying the text:
- Close reading exercise: provide a key passage (use web search to find accurate text) with targeted questions about technique, meaning, and effect
- Device identification task: students find and explain specific techniques
- Quote analysis grid: a table with columns for Quote, Technique, Effect, Theme
Keep questions specific and targeted, not vague.`;
  }

  if (activities.includes("post-lesson")) {
    activityInstructions += `

## Post-Lesson Activities
Generate 3-4 activities for after studying the text:
- Short exam-style question (15-20 marks): mirror the phrasing and cognitive demand of real SEC exam questions. Include the mark allocation.
- Extended exam-style question (50 marks for poetry, 70 marks for comparative): a full question in SEC format with mark allocation.
- Reflection prompt: a question asking students to connect the text to their own experience or to other texts they have studied.
Base exam questions on past SEC paper patterns.`;
  }

  if (activities.includes("vocabulary")) {
    activityInstructions += `

## Vocabulary Exercises
Generate exercises covering 8-12 key words or phrases from the text:
- Word, definition, usage in context (from the text), and an exam-appropriate synonym
- Format as a table or structured list
- Select words that are genuinely useful for PCLM marks in Paper 1 and literary analysis in Paper 2
- Include both everyday words used in specific literary ways and genuine literary terms relevant to the text`;
  }

  // For skills-based content types, override with specific exercise structures
  let skillsOverride = "";
  if (context.worksheetContentType === "unseen_poetry") {
    skillsOverride = `

UNSEEN POETRY WORKSHEET STRUCTURE (use this instead of the activity types above):

## Technique Identification Exercises
5 exercises. For each, provide a line or short passage from a public domain poem and ask the student to:
1. Name the technique used
2. Quote the specific words that demonstrate the technique
3. Explain the effect the technique creates

## Quote Analysis Exercises
3 exercises. For each, provide a quote from a public domain poem and ask the student to write a paragraph (5-7 sentences) analysing the quote, identifying techniques, and explaining their effect.

## Full Unseen Poem Response
Provide a short public domain poem (8-16 lines) the student has not studied. Include:
- The poem text
- An exam-style question (50 marks)
- Space for the student's response
- A brief marking guide for the teacher`;
  }

  if (context.worksheetContentType === "comprehension") {
    skillsOverride = `

COMPREHENSION WORKSHEET STRUCTURE (use this instead of the activity types above):

## Question A Practice
Provide a short non-fiction passage (200-300 words, invented but realistic) and generate:
1. A "main ideas" question (10 marks)
2. A "language analysis" question (15 marks)
3. A "personal response" question (15 marks)
Include mark allocations and brief marking guidance for the teacher.

## Question B Practice
Based on the passage above, generate:
1. A functional writing task (speech, article, letter, blog post, or report) (50 marks)
2. Include the specific format, audience, and word count expectations
3. Include a brief marking guide referencing PCLM criteria`;
  }

  if (context.worksheetContentType === "composition") {
    skillsOverride = `

COMPOSITION WORKSHEET STRUCTURE (use this instead of the activity types above):

## Planning Exercise
Provide a composition title and ask the student to:
1. Write a 5-point plan (beginning, 3 middle points, ending)
2. Draft their opening paragraph (100 words)
3. List 5 strong vocabulary words they intend to use

## Opening Paragraph Practice
Provide 3 different composition titles. For each, the student writes an opening paragraph (80-100 words) using a different opening strategy (anecdote, question, vivid description).

## Peer Review Checklist
A structured checklist the student uses to review a classmate's composition:
- Does the opening grab attention?
- Is there a clear sense of purpose?
- Does each paragraph flow to the next?
- Are sentences varied in length?
- Are there any cliches or vague language?
- Is the ending effective?
- 3 things that work well / 2 things to improve`;
  }

  return `Generate a classroom worksheet for ${textDescription}.

Activity types requested: ${activityList}

OUTPUT FORMAT:
- Use clean markdown with clear section headings
- Number all questions
- Include "[Space for answer]" where students would write
- Include mark allocations in brackets for exam-style questions, e.g. (15 marks)
- Use horizontal rules (---) between major sections
- Keep instructions brief and clear
- All activities must be exam-aligned and practically useful in a classroom
${skillsOverride || activityInstructions}${userInstr}`;
}

export function buildSlidesPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  let textDescription: string;
  let slideStructure: string;

  if (context.slidesContentType === "poetry") {
    textDescription = `a poetry lesson on "${context.poem}" by ${context.poet}`;
    slideStructure = `Suggested slide sequence (8-15 slides):
1. Title slide (poem name, poet name)
2. Poet context (2-3 brief facts about the poet)
3. Poem text displayed (the full poem or key stanzas)
4. Stanza-by-stanza analysis slides (one slide per stanza or pair of stanzas)
5. Key themes slide
6. Exam connection slide (which question types this poem suits)`;
  } else if (context.slidesContentType === "comparative") {
    const texts = context.comparativeTexts || [];
    const textList = texts.map((t) => formatTextEntry(t)).join(", ");
    textDescription = `a comparative lesson on ${textList} through the lens of ${context.comparativeMode}`;
    slideStructure = `Suggested slide sequence (12-20 slides):
1. Title slide (mode name, three text titles)
2. Mode overview (what this mode means, what examiners look for)
3-5. One slide per text: key points relevant to this mode
6-9. Comparison slides: key arguments linking all three texts
10. Sample paragraph walkthrough
11. Exam tips for this mode`;
  } else if (context.slidesContentType === "single_text") {
    textDescription = `a single text lesson on "${context.textTitle}" by ${context.author}`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide (text name, author, exam year)
2-4. Character profiles (one per slide: key traits, role, and 1-2 key quotes)
5-7. Key themes (one per slide: how theme manifests, supporting evidence)
8. Essay structure guide (how to structure a 60-mark answer)
9. Key quotes summary (organised by theme)
10. Exam tips (what examiners reward, common mistakes)`;
  } else if (context.slidesContentType === "unseen_poetry") {
    textDescription = `an unseen poetry skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide
2-3. The 4-step approach to unseen poetry (first read, second read, plan, write)
4-5. Sound devices with examples (alliteration, assonance, onomatopoeia, rhyme, sibilance)
6-7. Imagery and figurative language with examples (metaphor, simile, personification, symbolism)
8. Structural devices with examples (enjambment, caesura, repetition)
9. Response structure template (opening, body paragraphs, closing)
10. Common mistakes and exam tips`;
  } else if (context.slidesContentType === "comprehension") {
    textDescription = `a Paper 1 comprehension skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide
2. Overview: Question A vs Question B (marks, time, approach)
3-5. Question A types: what each question type asks and how to approach it
6. Language analysis toolkit: key techniques to identify in prose
7-8. Question B formats: letter, speech, article, report, review (format and tone)
9. Sample response walkthrough
10. PCLM marking criteria and exam tips`;
  } else if (context.slidesContentType === "composition") {
    const typeLabels: Record<string, string> = {
      personal_essay: "Personal Essay", short_story: "Short Story", speech: "Speech",
      discursive: "Discursive Essay", feature_article: "Feature Article", descriptive: "Descriptive Essay",
    };
    const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";
    textDescription = `a ${compType} writing skills lesson`;
    slideStructure = `Suggested slide sequence (10 slides):
1. Title slide (${compType})
2. Format overview: what examiners expect from a ${compType}
3-4. Structure template: opening strategies, middle development, closing
5. PCLM breakdown: what each criterion means for a ${compType}
6-7. Opening examples: 2-3 strong openings with explanation
8. Language tips: vocabulary, sentence variety, common errors
9. Common mistakes to avoid
10. Summary and exam tips`;
  } else {
    textDescription = `a general English lesson on "${context.textTitle || "the selected topic"}"`;
    slideStructure = `Suggested slide sequence (8-15 slides):
1. Title slide
2-3. Context/background slides
4-8. Content slides covering key points
9. Summary/takeaway slide`;
  }

  return `Generate PowerPoint slide content for ${textDescription}.

Return ONLY valid JSON. No markdown fences. No explanation before or after the JSON. The response must start with { and end with }.

JSON structure:
{
  "title": "Slide deck title",
  "subtitle": "Subtitle text",
  "slides": [
    {
      "layout": "title" | "content" | "two_column" | "quote" | "summary",
      "title": "Slide title",
      "content": ["Bullet point 1", "Bullet point 2"],
      "left_column": ["Left side points"],
      "right_column": ["Right side points"],
      "quote": "A direct quote from the text",
      "attribution": "Attribution for the quote",
      "speaker_notes": "Detailed notes the teacher should say for this slide"
    }
  ]
}

Rules for slide content:
- Maximum 5 bullet points per content slide, each under 15 words
- The teacher provides detail verbally. Slides are visual anchors, not scripts.
- Speaker notes must contain the detailed content for each slide (2-4 sentences minimum)
- Use "title" layout for the first and last slides
- Use "quote" layout for key quotes from the text
- Use "content" layout for most slides
- Use "summary" layout for conclusion/exam connection slides

${slideStructure}${userInstr}`;
}

export function buildSingleTextPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const textTypeLabel =
    context.textType === "shakespeare"
      ? "Shakespeare play"
      : context.textType === "play"
        ? "play"
        : "novel";

  const substrate = buildSingleTextSubstrateBlock(context);
  const substratePrefix = substrate ? `${substrate}\n\n` : "";

  return `${substratePrefix}Generate a comprehensive single text study note for "${context.textTitle}" by ${context.author} (${textTypeLabel}).

This is a Paper 2, Section I text worth 60 marks at ${context.level} level for the ${context.year} examination.

IMPORTANT: Use web_search to find and verify key quotes from this text before writing. Search for key passages, character quotes, and pivotal scenes. Only quote words you have verified. If you cannot verify a quote, paraphrase instead and flag with [VERIFY].

STRUCTURE (follow this exactly):

## 1. Text Overview
100-150 words. Cover:
- What the text is about in plain language
- Setting and time period
- Central conflict or driving force of the narrative
- No hedging or spoiler avoidance. Students need the full picture.

## 2. Character Analysis
For each major character (3-5 characters depending on the text), write 150-200 words covering:
- Their role in the text
- Key character traits with supporting quotes
- Character arc: how they change from beginning to end
- Examiner focus: what questions tend to ask about this character
- 3-4 key quotes with act/scene/page references where applicable

Format each character as a ### subheading.

## 3. Themes
For each major theme (4-6 themes), write 150-200 words covering:
- How the theme manifests in the text with specific examples
- Key quotes that support this theme
- How this theme connects to exam question patterns
- A one-sentence "exam sentence" the student could use directly in an essay

Format each theme as a ### subheading.

## 4. Key Scenes and Moments
For each pivotal moment (5-8 scenes), write 100-150 words covering:
- What happens in the scene
- Why it matters to the text as a whole
- Key quotes from the scene
- Which themes it connects to

Format each scene as a ### subheading.

## 5. Essay Structure Guide
200-300 words on how to structure a 60-mark single text essay:
- How to open (not "In this essay I will...")
- How to build paragraphs: point, quote, explain, link to question
- How to close effectively
- Common mistakes to avoid
- What the examiner specifically rewards in single text answers

## 6. Quote Bank
15-20 essential quotes organised by theme.
For each quote:
- The quote itself (verified via web search)
- Which theme it supports
- A one-line note on what the quote proves or demonstrates

Format as a table or structured list grouped by theme.

## 7. Sample Paragraph
200-250 words. One model paragraph answering a typical exam question on this text.
- Demonstrate proper structure: point, quote, explain, personal response
- Show how to integrate quotes naturally
- Show how to link back to the exam question${userInstr}`;
}

export function buildUnseenPoetryPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  return `Generate a comprehensive unseen poetry skills guide for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 2, Section III. Students must analyse a poem they have never seen before. This is skills-based, not content-based. Worth 50 marks.

STRUCTURE (follow this exactly):

## 1. Approach Guide
200-300 words. A step-by-step method for tackling an unseen poem under exam conditions:
- First read: what is happening? Who is speaking? What is the mood?
- Second read: mark techniques, note imagery, identify tone shifts
- Planning: link observations to the specific question asked
- Writing: how to structure the response
- Time management: how long to spend reading vs writing

## 2. Core Poetic Techniques Reference
Cover 15-20 techniques that students MUST be able to identify and discuss. For each technique, write 50-80 words covering:
- A plain English definition
- A brief example (use well-known poems, not prescribed ones, to avoid confusion)
- A template sentence showing how to write about it in an exam: "The poet's use of [technique] in '[quote]' creates a sense of..."

Group the techniques under these headings:

### Sound Devices
Alliteration, assonance, onomatopoeia, rhyme (full, half, internal), rhythm, sibilance

### Figurative Language
Metaphor, simile, personification, hyperbole, symbolism

### Structural Devices
Enjambment, caesura, stanza structure, repetition, refrain

### Tone and Mood
Tone shifts, irony, contrast, juxtaposition

### Imagery
Visual imagery, auditory imagery, tactile imagery, sensory detail

## 3. Response Structure Template
150-200 words. How to structure an unseen poetry answer:
- Opening: name the poem's subject and your overall impression (2-3 sentences)
- Body paragraphs: technique + quote + effect + personal response (3-4 paragraphs)
- Closing: overall impact of the poem (2-3 sentences)
- Include a model opening sentence and a model closing sentence

## 4. Common Question Patterns
100-150 words. The types of questions that appear and what they actually ask for:
- "Discuss the poet's use of imagery" = find and analyse specific images
- "Comment on the mood/atmosphere" = identify emotional tone and explain how it is created
- "Do you find this poem appealing/interesting?" = personal response with evidence from the text
- "How does the poet convey [theme]?" = identify techniques used to communicate the theme
- "Comment on the effectiveness of the title" = connect the title to the poem's content and meaning

## 5. Practice Exercise
A worked example using a public domain poem (choose a short, accessible poem by W.B. Yeats, John Donne, or another poet whose work is out of copyright). Show:
- The poem text
- A sample exam question
- A model response (200-250 words) applying the method from Section 1
- Brief annotations explaining why each paragraph works

## 6. PCLM Connection
100-150 words. How the PCLM marking criteria apply to unseen poetry responses:
- Purpose: demonstrate understanding of the poem and engagement with the question
- Coherence: logical flow from point to point, each paragraph building on the last
- Language: appropriate literary vocabulary, varied sentence structure
- Mechanics: spelling, grammar, punctuation
- What vocabulary and phrasing scores highly in poetry responses${userInstr}`;
}

export function buildComprehensionPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const includeQA =
    context.focusArea === "question_a" || context.focusArea === "both";
  const includeQB =
    context.focusArea === "question_b" || context.focusArea === "both";

  let sections = "";

  if (includeQA) {
    sections += `
## 1. Question A Strategy Guide
200-300 words. How to approach comprehension questions:
- Read the text first, read the questions second, read the text again with the questions in mind
- Identify what the question is actually asking: summarise, analyse, compare, evaluate, or respond personally
- How to use quotes from the passage: short, embedded in your sentences, directly relevant
- How to structure responses: point, evidence from the passage, explanation
- Time management: how long per question based on mark allocation
- The difference between "identify" questions (shorter answers) and "discuss" questions (longer answers)

## 2. Question Types Reference
For each of the following question types, write 100-150 words explaining what the question asks, how to approach it, and a brief example of a strong response structure:

### "What are the main ideas in this text?"
Summarise in your own words. Do not copy full sentences from the passage.

### "Comment on the writer's use of language"
Identify specific language techniques (rhetorical questions, lists of three, emotive language, imagery, register) and explain their effect on the reader.

### "Compare the two texts"
Find similarities and differences. Use linking phrases: "Both texts...", "However, Text B differs in that...", "While Text A emphasises..."

### "Do you agree with the writer's view?"
Personal response with evidence. State your position, support it with evidence from both the text and your own knowledge.

### "Identify the writer's purpose and audience"
Analyse tone, register, content choices, and publication context.

### "How effective is the opening/closing?"
Analyse structural choices: hooks, conclusions, circular structure, call to action.

### "What impression do you form of [person/place/event]?"
Character or subject analysis with evidence from the passage.

### "Explain the impact of specific words/phrases"
Close language analysis: connotation, imagery, sound, register.

## 3. Language Analysis Toolkit
200-250 words. The techniques students need to identify in prose passages:
- Rhetorical questions, lists of three, direct address
- Emotive language, formal vs informal register
- Statistics, anecdote, expert testimony (in persuasive texts)
- Imagery and metaphor in non-fiction prose
- Sentence structure variation: short sentences for impact, longer sentences for flow
- Paragraph structure and topic sentences
- Bias and perspective: how to identify when a writer is presenting one side

Include 2-3 template sentences for writing about language: "The writer's use of [technique] in the phrase '[quote]' serves to..."`;
  }

  if (includeQB) {
    sections += `

## ${includeQA ? "4" : "1"}. Question B Types and Frameworks
For each functional writing type, write 150-200 words covering format requirements, tone expectations, typical length, opening strategy, and a structural template:

### Formal Letter
Format: addresses, date, "Dear...", "Yours sincerely/faithfully". Tone: professional, measured. Structure: state purpose, develop points, close with action.

### Informal Letter / Email
Format: relaxed greeting, conversational close. Tone: warm but clear. Structure: context, main points, personal sign-off.

### Blog Post / Feature Article
Format: catchy title, subheadings optional, engaging opening. Tone: engaging, opinionated, personal. Structure: hook, body paragraphs with examples, conclusion.

### Speech / Talk
Format: "Ladies and gentlemen..." or direct address to audience. Tone: persuasive, personal, varied pace. Structure: attention-grabbing opening, 3-4 key points, memorable close.

### Report
Format: title, introduction, findings, recommendations. Tone: formal, objective. Structure: state purpose, present evidence, draw conclusions.

### Review (book, film, event)
Format: title of item reviewed, star rating optional. Tone: evaluative, balanced. Structure: summary, strengths, weaknesses, recommendation.

### Diary / Journal Entry
Format: date, first person, reflective. Tone: personal, honest. Structure: describe event/situation, reflect on feelings, consider meaning.

## ${includeQA ? "5" : "2"}. Sample Question A Response
200-250 words. A model answer to a typical comprehension question. Show:
- How to open without restating the question
- How to embed short quotes from the passage
- How to explain the significance of evidence
- How to maintain focus on the specific question asked

## ${includeQA ? "6" : "3"}. Sample Question B Response
250-300 words. A model functional writing piece (choose the most common type: speech or feature article). Show:
- Correct format for the chosen type
- Appropriate tone and register
- Clear structure with logical flow
- Strong opening and closing`;
  }

  return `Generate a comprehensive Paper 1 comprehension skills guide for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 1, Section I. Students read unseen texts and answer Question A (comprehension/analysis, 50 marks) and Question B (functional writing based on the text, 50 marks).

Focus area: ${context.focusArea === "both" ? "Both Question A and Question B" : context.focusArea === "question_a" ? "Question A (Comprehension)" : "Question B (Functional Writing)"}
${sections}${userInstr}`;
}

export function buildCompositionPrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const typeLabels: Record<string, string> = {
    personal_essay: "Personal Essay",
    short_story: "Short Story",
    speech: "Speech",
    discursive: "Discursive Essay",
    feature_article: "Feature Article",
    descriptive: "Descriptive Essay",
  };

  const compType = typeLabels[context.compositionType || "personal_essay"] || "Personal Essay";

  const typeSpecificGuidance: Record<string, string> = {
    personal_essay: `A personal essay is reflective, drawing on the student's own experiences, observations, and feelings. The examiner expects a genuine voice, not a formal academic essay. The best personal essays move between the specific (a moment, a memory, a detail) and the general (a broader insight about life, people, or the world). The tone should feel honest and thoughtful. Humour is welcome if natural. The essay should feel like it was written by a real person with something to say.`,
    short_story: `A short story must have a clear narrative arc: a beginning that hooks, a middle that develops tension or conflict, and an ending that resolves or resonates. Characters should feel real, not cardboard. Dialogue should sound natural. The setting should be established quickly through specific sensory detail, not lengthy description. The examiner rewards controlled pacing, a clear climax, and an ending that leaves an impression. Avoid cliches: "it was all a dream", "and then I woke up", "the end".`,
    speech: `A speech must be written for a specific audience and occasion. It should open with direct address and an attention-grabbing statement. The tone should be persuasive and engaging, mixing personal anecdote with broader argument. Use rhetorical techniques naturally: repetition, rhetorical questions, lists of three, direct address. The speech should build to a strong conclusion with a call to action or memorable final statement. It must sound like something that would be spoken aloud, not read silently.`,
    discursive: `A discursive essay presents a balanced exploration of an issue, considering multiple perspectives before reaching a reasoned conclusion. The structure is critical: introduce the topic, present arguments for and against (or multiple viewpoints), and conclude with a considered personal position. Each paragraph should have a clear topic sentence and supporting evidence. The tone should be thoughtful and measured, not aggressive or one-sided. The examiner rewards nuance and the ability to engage with opposing viewpoints fairly.`,
    feature_article: `A feature article is written for publication in a newspaper or magazine. It needs a catchy headline and an engaging opening that hooks the reader. The tone is more personal and engaging than a news report but more structured than a personal essay. It can include anecdote, interview-style quotes (invented is fine), statistics, and expert opinion. Subheadings can be used to break up the text. The closing should circle back to the opening or leave the reader with something to think about.`,
    descriptive: `A descriptive essay creates a vivid picture of a place, person, event, or experience through detailed sensory writing. The examiner rewards specific, concrete detail over vague generalities. Use all five senses where appropriate. The description should have a controlling mood or atmosphere. Structure through spatial organisation (moving through a place), chronological organisation (moving through time), or emotional organisation (moving through feelings). Avoid listing adjectives. Instead, use precise nouns and strong verbs to carry the description.`,
  };

  const guidance = typeSpecificGuidance[context.compositionType || "personal_essay"] || typeSpecificGuidance.personal_essay;

  return `Generate a comprehensive composition writing guide for the ${compType} for ${context.level} level students preparing for the ${context.year} Leaving Certificate English examination.

This covers Paper 1, Section II. The composition is worth 100 marks, the single highest-value question on either paper. It is assessed on PCLM: Purpose, Coherence, Language, Mechanics.

COMPOSITION TYPE: ${compType}

TYPE-SPECIFIC CONTEXT:
${guidance}

STRUCTURE (follow this exactly):

## 1. Format and Expectations
150-200 words. What the examiner expects from a ${compType}:
- Typical length for a strong answer
- Structural conventions specific to this type
- Tone and voice expectations
- What "Purpose" means specifically for a ${compType}
- What "Coherence" means specifically for a ${compType}

## 2. Structure Template
200-250 words. A detailed structural framework:
- How to open: provide 2-3 specific opening strategies with brief examples
- How to develop the middle: paragraph structure, transitions, pacing
- How to close: circular structure, resonant ending, or call to action
- Approximate number of paragraphs and rough length for each
- How to plan the composition in 5 minutes before writing

## 3. Language Marks Guide
150-200 words. How to maximise the Language mark in a ${compType}:
- 5-10 strong words or phrases to aim for (not pretentious, but precise and effective)
- Sentence variety techniques: how to mix short and long, simple and complex
- What "sophisticated language" actually looks like at this level, with 2-3 examples
- Common language errors that cost marks (repetitive vocabulary, vague adjectives, cliched phrases)

## 4. PCLM Breakdown
200-250 words. How each PCLM criterion applies to the ${compType} specifically:

### Purpose
What does a clear sense of purpose look like in a ${compType}? How does the student demonstrate they know what they are doing and why?

### Coherence
What makes a ${compType} flow? How do paragraphs connect? What structural devices create unity?

### Language
What register and vocabulary is expected? What distinguishes a B-grade ${compType} from an A-grade one in terms of language?

### Mechanics
Spelling, grammar, punctuation focus areas for this type. Common mechanical errors students make in ${compType} writing.

## 5. Strong Opening Examples
Provide 3 different ways to open a ${compType}. For each opening:
- The opening itself (50-80 words)
- A brief explanation (1-2 sentences) of why this opening works

## 6. Sample ${compType}
400-500 words. A complete model ${compType} demonstrating all the principles above.
- This should be the kind of composition that would score 85-90 out of 100
- It should demonstrate varied sentence structure, strong vocabulary, clear purpose, and effective structure
- It should read as if written by a talented student, not by a teacher or AI
- Choose a topic that is accessible and relatable for a 17-18 year old

## 7. Common Mistakes
100-150 words. The 4-5 most common errors students make when writing a ${compType}:
- What the mistake is
- Why it costs marks
- How to avoid it${userInstr}`;
}

export function buildOutlineSystemPrompt(): string {
  return `You are an experienced Leaving Certificate English teacher in Ireland writing a structured essay outline for a Higher or Ordinary Level student.

ABSOLUTE RULES:
- Output valid JSON only. No preamble, no markdown, no explanation outside the JSON. Start your response with { and end with }.
- The JSON must have exactly these keys: thesis_line, body_moves, closing_move, examiner_note.
- body_moves must be an array of exactly 3 objects, each with keys: move, quote, gloss.
- Every quote must be copied verbatim from the list of quotes provided in the user message. Do not invent quotes. Do not paraphrase. If you cannot find a suitable verbatim quote for a body move, pick the closest one from the provided list.
- thesis_line is one sentence, maximum 30 words, that directly answers the exam question asked.
- Each body_moves[].move is a short label for the argument of that paragraph, maximum 12 words.
- Each body_moves[].gloss is 1-2 sentences explaining why this quote serves the move and how a student should use it in the paragraph. Speak directly to the student.
- closing_move is one sentence describing what the final paragraph should do to close the argument.
- examiner_note is an optional short tip (1-2 sentences) about what an SEC examiner looks for in a strong answer to this specific question. Use the JSON literal null (not the string "null") if you have nothing specific to say.

STYLE:
- Use UK English spelling (colour, organised, analyse).
- Never use em dashes. Use commas, full stops, colons, semicolons.
- Be direct and specific. Do not use filler phrases like "this powerful statement" or "the poet masterfully".
- Write like a teacher talking to a student, not a textbook.

You must respect the exact wording of the exam question. If the question is about loneliness, your thesis must address loneliness. Do not substitute your own theme.`;
}
