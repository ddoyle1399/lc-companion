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
- understatement (litotes): deliberately downplays ("tell-tale skin and teeth" understates mass murder).
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


export function buildComparativePrompt(context: PromptContext): string {
  const userInstr = context.userInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM THE TEACHER:\n${context.userInstructions}`
    : "";

  const texts = context.comparativeTexts || [];
  const textList = texts
    .map((t, i) => `Text ${i + 1}: ${formatTextEntry(t)}`)
    .join("\n");

  let modeSpecificInstruction = "";
  if (context.comparativeMode === "Cultural Context") {
    modeSpecificInstruction = `
FOR CULTURAL CONTEXT SPECIFICALLY: Arguments must relate to one or more of: social setting and class, family, religion, love and marriage, gender roles. Only use topics genuinely relevant to each text. Do not force all five topics onto texts where they do not apply.`;
  } else if (
    context.comparativeMode === "General Vision and Viewpoint"
  ) {
    modeSpecificInstruction = `
FOR GENERAL VISION AND VIEWPOINT SPECIFICALLY: Focus on the overall worldview of each text. Is it optimistic, pessimistic, or somewhere between? Consider how key events, characters, and the ending shape the reader's sense of hope or despair. Address both the characters' vision and the text's overall stance.`;
  } else if (context.comparativeMode === "Literary Genre") {
    modeSpecificInstruction = `
FOR LITERARY GENRE SPECIFICALLY: Focus on HOW each text tells its story, not just what happens. Discuss narrative techniques, structure, use of dialogue, pacing, visual techniques (for film), staging (for drama), and how these choices shape the reader/viewer's experience.`;
  } else if (context.comparativeMode === "Theme or Issue") {
    modeSpecificInstruction = `
FOR THEME OR ISSUE SPECIFICALLY: Focus on how each text explores a shared theme or issue. Identify what the theme is, how each text approaches it differently, and what insights emerge from comparing the three treatments.`;
  }

  return `Generate a comparative study note for the following three texts studied through the lens of ${context.comparativeMode}.

${textList}

Year: ${context.year} | Level: ${context.level} | Mode: ${context.comparativeMode}
${modeSpecificInstruction}

STRUCTURE (follow this exactly):

## 1. Mode Overview
2-3 sentences covering:
- What this comparative mode actually means
- What the examiner is looking for when reading an answer in this mode
- The most common mistake students make (e.g., writing about theme when the question is about vision, or summarising each text instead of comparing)

## 2. Key Comparative Arguments
Provide 4-5 arguments. For EACH argument:
- A clear heading stating the comparative point
- 3-5 sentences developing the argument with supporting evidence from ALL THREE texts
- This must be a genuine comparison, not three separate summaries
- One clear similarity across the texts
- One clear contrast across the texts

## 3. Comparison Anchors
For each argument from Section 2, provide:
- A pre-built transitional phrase for linking the texts in an exam answer
- These should be ready-to-use sentence starters like: "While [Text A] presents..., [Text B] offers a contrasting..."
- Include phrases for both similarities and contrasts

## 4. Key Quotes per Mode
For each of the three texts, provide 3-4 key quotes that are relevant to this mode.
- Tag each quote to which argument from Section 2 it supports
- Use web search to verify quotes. If you cannot verify, paraphrase and flag with [VERIFY]

### ${texts[0]?.title || "Text 1"}
[3-4 quotes]

### ${texts[1]?.title || "Text 2"}
[3-4 quotes]

### ${texts[2]?.title || "Text 3"}
[3-4 quotes]

## 5. Sample Comparative Paragraph
Write one full paragraph demonstrating how to weave all three texts together in response to a typical question in this mode.
- Use the A-then-B-then-C linking structure that examiners reward
- Include quotes from Section 4
- Show how to transition between texts smoothly
- Address the specific mode, not general themes${userInstr}`;
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

  return `Generate a comprehensive single text study note for "${context.textTitle}" by ${context.author} (${textTypeLabel}).

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
