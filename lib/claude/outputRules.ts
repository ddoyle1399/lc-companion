/**
 * outputRules.ts
 *
 * Single source of truth for all hard output rules that apply to every
 * Claude generation in this project. Import the relevant constants here
 * rather than writing your own version in each prompt file.
 *
 * When a rule changes, change it HERE. Nowhere else.
 *
 * Usage:
 *   import { ABSOLUTE_OUTPUT_RULES } from "@/lib/claude/outputRules";
 *   // Then inject into your system prompt or user prompt.
 */

// ---------------------------------------------------------------------------
// Individual rule strings (exported for cases where you need granular control)
// ---------------------------------------------------------------------------

export const EM_DASH_RULE =
  `NEVER use em dashes (—) or en dashes (–). Not once. Not ever. ` +
  `Use commas, full stops, semicolons, or colons instead. ` +
  `NEVER use a spaced hyphen ( - ) between phrases as an em-dash substitute ` +
  `("word - word" as a parenthetical break is banned). ` +
  `Compound adjectives like "peat-brown" or "well-known" are fine (no spaces around the hyphen). ` +
  `Students recognise em dashes and spaced-hyphen substitutes as AI-generated output immediately. ` +
  `This destroys credibility. Zero exceptions.`;

export const UK_ENGLISH_RULE =
  `UK English spelling at all times. ` +
  `Use: colour, analyse, recognise, honour, centre, organise, defence, favour, programme, practise (verb). ` +
  `Never: color, analyze, recognize, honor, center, organize, defense, favor, program, practice (verb).`;

export const BANNED_WORDS_RULE =
  `BANNED WORDS (rewrite any sentence containing these): ` +
  `delve / delves / delved / delving, ` +
  `multifaceted, ` +
  `tapestry / tapestries, ` +
  `nuanced (unless genuinely necessary and precise), ` +
  `landscape (in any figurative sense: "the landscape of memory" is banned; a literal landscape is fine), ` +
  `furthermore / moreover / additionally used in sequence or as formulaic connectors, ` +
  `masterfully, ` +
  `"powerfully underscores", ` +
  `"it is important to note", ` +
  `"comprehensive", ` +
  `"revolutionise", ` +
  `"unlock your potential".`;

export const ANTI_AI_TELLS_RULE =
  `BANNED PHRASES (if your draft contains any of these, rewrite the sentence): ` +
  `"this line captures", ` +
  `"the poet employs", ` +
  `"masterfully intertwines", ` +
  `"reinforcing the idea that", ` +
  `"this imagery evokes", ` +
  `"creates a vivid picture", ` +
  `"establishes the poem's central metaphor", ` +
  `"powerful statement underscores", ` +
  `"explores the theme of" (use the theme directly instead), ` +
  `"In conclusion,", ` +
  `"Furthermore,", ` +
  `"Moreover,", ` +
  `"In summary,", ` +
  `"It is worth noting that", ` +
  `"bridges the ordinary and extraordinary".`;

export const HUMANIZING_RULE =
  `HUMANIZING (mandatory): ` +
  `Vary sentence length naturally. Mix short punchy sentences with longer analytical ones. ` +
  `Do not start consecutive paragraphs with the same word. ` +
  `Do not use formulaic paragraph transitions. ` +
  `Refer to the student as "you" or "we", never "the reader". ` +
  `State interpretations confidently where they are defensible. Do not over-hedge. ` +
  `Sound like an experienced teacher talking to a student one-to-one, not a textbook entry.`;

export const DOCUMENT_DESIGN_RULE =
  `DOCUMENT DESIGN (this is what makes the difference between a teacher resource and AI sludge): ` +
  `(a) NEVER emit a horizontal rule line. No "---", no "***", no "___", no Unicode box-drawing. ` +
  `If you feel the urge to insert a divider between sections, use a heading instead. ` +
  `(b) NEVER use bold paragraphs as headings. The title is "# Title". A section is "## Section". A sub-section is "### Sub-section". ` +
  `Bold (**word**) is only for inline emphasis on key terms. ` +
  `(c) NEVER use field-label format like "**Speaker:** Iago **Act/Scene:** 3.3" or "**Theme:** Jealousy". ` +
  `Attribution belongs in a single short prose line beneath the quote, e.g. "Iago, Act 3 Scene 3." Nothing bolded. No labels. ` +
  `(d) NEVER add cross-quote chatter. Lines like "Pair this with the quote below", "Use alongside Section 2", ` +
  `"This complements the previous quote", "Bring this in when discussing X" are banned. The student decides what to pair. ` +
  `Each quote stands on its own and earns its place by what IT does. ` +
  `(e) Commentary per quote in a quote bank: 2 sentences MAXIMUM. One sentence on what the quote shows. ` +
  `One sentence on the question type or argument it slots into. No more. If you cannot make the case in 2 sentences, the quote is not strong enough. ` +
  `(f) Sub-themes in a quote bank get an "## H2 heading" with a clear name. Do not number them ("1. The Nature of...") ` +
  `unless numbering is itself meaningful. The H2 heading is the structure; numbering on top of it is noise.`;

// ---------------------------------------------------------------------------
// Combined block — inject this into every prompt that generates prose output
// ---------------------------------------------------------------------------

export const ABSOLUTE_OUTPUT_RULES = `OUTPUT RULES — enforced by automated post-generation checks. Every violation is a hard block. Read these carefully before writing a single word.

1. ${EM_DASH_RULE}

2. ${UK_ENGLISH_RULE}

3. ${BANNED_WORDS_RULE}

4. ${ANTI_AI_TELLS_RULE}

5. ${HUMANIZING_RULE}

6. ${DOCUMENT_DESIGN_RULE}`;
