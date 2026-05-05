/**
 * lib/slides/parseNoteStructure.ts
 *
 * Deterministic markdown parser. Splits a generated poetry note into the
 * sections the slide planner expects. No LLM call. No content rewriting.
 *
 * Input: the markdown body_text of a `notes` row plus the row's `quotes`
 * and `metadata` blocks.
 *
 * Output: a structured tree the slide builder can map onto slides:
 *   - title block (poet, poem, collection, composition_date)
 *   - overview prose
 *   - form_and_structure prose
 *   - per-stanza analysis blocks (1-N)
 *   - per-theme blocks (1-N)
 *   - tone block
 *   - exam_use block
 *   - pairings block
 *
 * Section detection is heading-based. We accept several common variants
 * the prompts produce ("Stanza by Stanza", "Stanza-by-Stanza Analysis",
 * "Themes", "Key Themes", etc).
 */

import { marked, type Token, type Tokens } from "marked";

export type StanzaBlock = {
  index: number; // 1-based stanza number
  label: string; // e.g. "Stanza 4" or "Stanza 4 (lines 13-16)"
  prose: string; // markdown of this stanza's analysis block
  quote?: string; // matched quote from notes.quotes for this stanza, if found
};

export type ThemeBlock = {
  label: string; // e.g. "Spiritual Renewal Through Simplicity"
  prose: string; // markdown of this theme's discussion
};

export type ParsedNote = {
  poet: string;
  poem: string;
  collection?: string;
  composition_date?: string;
  overview?: string;
  form_and_structure?: string;
  stanzas: StanzaBlock[];
  themes: ThemeBlock[];
  tone?: string;
  exam_use?: string;
  pairings?: string;
  /** Anything we found under headings we did not recognise. Useful for debugging. */
  unrecognised: Array<{ heading: string; level: number; text: string }>;
};

const SECTION_MATCHERS: Array<{
  key: keyof Pick<
    ParsedNote,
    | "overview"
    | "form_and_structure"
    | "tone"
    | "exam_use"
    | "pairings"
  >;
  patterns: RegExp[];
}> = [
  { key: "overview",          patterns: [/^overview$/i, /^introduction$/i, /^poem overview$/i] },
  { key: "form_and_structure",patterns: [/^form( and structure| & structure)?$/i, /^structure$/i] },
  { key: "tone",              patterns: [/^tone$/i, /^tone( and mood| & mood)$/i, /^mood$/i] },
  { key: "exam_use",          patterns: [/^exam use$/i, /^exam-ready takeaways$/i, /^for the exam$/i, /^exam application$/i] },
  { key: "pairings",          patterns: [/^pairings$/i, /^connections$/i, /^link to other poems.*$/i] },
];

const STANZA_HEADING = /^(stanza|section|part)\s*[-: ]*\s*(\d+)/i;
const STANZA_GROUP_HEADING = /^(stanza[\s-]*by[\s-]*stanza|stanza analysis|line[\s-]*by[\s-]*line)/i;
const THEMES_GROUP_HEADING = /^(key themes|themes|main themes|central themes)$/i;

/**
 * Convert a Marked Token tree into a markdown string. Token re-serialisation
 * is approximate but good enough for prose. We never re-emit headings (those
 * are consumed by the splitter).
 */
function tokensToMarkdown(tokens: Token[] | undefined): string {
  if (!tokens || tokens.length === 0) return "";
  return tokens
    .map((t) => {
      if ("raw" in t && typeof (t as { raw?: unknown }).raw === "string") {
        return (t as { raw: string }).raw;
      }
      return "";
    })
    .join("")
    .trim();
}

/**
 * Find the most likely quote in `quotes[]` for a given stanza index.
 * The quote schema may be v1 (string) or v2 (object with stanza_index).
 */
function findQuoteForStanza(stanzaIndex: number, quotes: unknown): string | undefined {
  if (!Array.isArray(quotes)) return undefined;
  for (const q of quotes) {
    if (typeof q === "string") continue;
    if (q && typeof q === "object") {
      const obj = q as Record<string, unknown>;
      if (obj.stanza_index === stanzaIndex) {
        const text = (obj.text ?? obj.quote_text ?? obj.line) as string | undefined;
        if (typeof text === "string") return text;
      }
    }
  }
  return undefined;
}

export function parseNoteStructure(input: {
  poet: string;
  poem: string;
  bodyMarkdown: string;
  quotes?: unknown;
  metadata?: Record<string, unknown> | null;
}): ParsedNote {
  const md = input.bodyMarkdown ?? "";
  const tokens = marked.lexer(md) as Token[];

  const result: ParsedNote = {
    poet: input.poet,
    poem: input.poem,
    collection: ((input.metadata?.historical_context as Record<string, unknown> | undefined)?.collection as string) || undefined,
    composition_date: ((input.metadata?.historical_context as Record<string, unknown> | undefined)?.composition_date as string) || undefined,
    stanzas: [],
    themes: [],
    unrecognised: [],
  };

  // Group tokens by heading. Each heading owns the tokens that follow it
  // until the next heading at the same or higher level.
  type Block = { heading: string; level: number; tokens: Token[] };
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const tok of tokens) {
    if (tok.type === "heading") {
      const h = tok as Tokens.Heading;
      current = { heading: h.text.trim(), level: h.depth, tokens: [] };
      blocks.push(current);
    } else if (current) {
      current.tokens.push(tok);
    }
  }

  // Pass 1: top-level (depth 1 or 2) sections.
  let inStanzaGroup = false;
  let inThemesGroup = false;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const heading = b.heading.replace(/[:.]+$/, "").trim();
    const proseInside = tokensToMarkdown(b.tokens);

    // Stanza-group transition. The heading is something like "Stanza-by-Stanza Analysis".
    if (b.level <= 2 && STANZA_GROUP_HEADING.test(heading)) {
      inStanzaGroup = true;
      inThemesGroup = false;
      continue;
    }

    // Themes-group transition.
    if (b.level <= 2 && THEMES_GROUP_HEADING.test(heading)) {
      inStanzaGroup = false;
      inThemesGroup = true;
      continue;
    }

    // Per-stanza heading inside the stanza group.
    if (inStanzaGroup) {
      const m = STANZA_HEADING.exec(heading);
      if (m) {
        const idx = parseInt(m[2], 10);
        if (Number.isFinite(idx) && idx > 0) {
          result.stanzas.push({
            index: idx,
            label: heading,
            prose: proseInside,
            quote: findQuoteForStanza(idx, input.quotes),
          });
          continue;
        }
      }
      // A non-stanza H3/H4 inside the stanza group: skip silently (likely a
      // rogue subsection). It will not become its own slide.
      if (b.level >= 3) continue;
    }

    // Per-theme heading inside the themes group. Themes are typically H3
    // under "Key Themes" H2. Accept H2 themes too if a theme group lacks
    // its own H2 wrapper.
    if (inThemesGroup) {
      if (b.level >= 3 || !SECTION_MATCHERS.some((s) => s.patterns.some((p) => p.test(heading)))) {
        result.themes.push({ label: heading, prose: proseInside });
        continue;
      }
    }

    // Top-level recognised section (overview, form, tone, exam, pairings).
    const matched = SECTION_MATCHERS.find((s) => s.patterns.some((p) => p.test(heading)));
    if (matched) {
      result[matched.key] = proseInside;
      // Leaving any active group when we hit a known top-level section.
      inStanzaGroup = false;
      inThemesGroup = false;
      continue;
    }

    // Title heading at the very top of the doc, e.g. `# "The Tollund Man" by Seamus Heaney`.
    // Skip silently.
    if (b.level === 1) continue;

    // Anything else: log to unrecognised so we can debug.
    result.unrecognised.push({ heading, level: b.level, text: proseInside.slice(0, 200) });
  }

  // Sort stanzas by index just in case the heading order was odd.
  result.stanzas.sort((a, b) => a.index - b.index);

  return result;
}
