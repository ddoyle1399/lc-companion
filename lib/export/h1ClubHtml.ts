/**
 * Wraps a generated note's Markdown body in the H1 Club's uniform HTML
 * structure, ready for pasting into the H1 Club CMS.
 *
 * Wrapper spec (locked to the H1 Club brand):
 *   - Outer: <article class="lc-resource">
 *   - Header: brand line, big title, level label
 *   - Body: H2/H3/H4 with brand inline styles, styled blockquotes, lists
 *   - Analysis labels (Meaning:, Tone:, Key Quote:, etc.) wrapped in
 *     <span class="label" style="font-weight: 700;">.
 *
 * Defensive scrubbing:
 *   - em dashes (—), en dashes (–), and double hyphens (--) are replaced
 *     with ", " so nothing AI-tell-y leaks through to the H1 Club.
 *
 * Usage from a React handler:
 *   const html = wrapForH1Club({
 *     markdown: note.body_markdown,
 *     title: note.display_subject,
 *     level: "higher",
 *   });
 *   await navigator.clipboard.writeText(html);
 */

import { marked } from "marked";

export interface WrapInput {
  markdown: string;
  title: string;
  /** Level label in the header. Defaults to "higher". */
  level?: "higher" | "ordinary";
}

// Configure marked once. GFM on for tables/strikethrough; breaks off so
// single newlines stay inline (we use blank lines for paragraph breaks).
marked.use({ gfm: true, breaks: false });

// Locked H1 Club inline styles, copied verbatim from the spec.
const STYLE_H2 =
  "text-align: center; font-weight: 700; font-size: 1.75rem; margin: 2.5rem 0 1.5rem; padding-bottom: 0.5rem; border-bottom: 3px solid #2CB1BC;";
const STYLE_H3 =
  "text-align: center; font-weight: 700; font-size: 1.4rem; margin: 2rem 0 1rem; padding: 0.75rem; background: #e8f7f8; border-left: 4px solid #2CB1BC;";
const STYLE_H4 =
  "font-weight: 700; font-size: 1.1rem; margin: 1.25rem 0 0.5rem; color: #0F2A43;";
const STYLE_BLOCKQUOTE =
  "font-style: italic; margin: 0.75rem 0; padding: 0.75rem 1rem; border-left: 4px solid #2CB1BC; background: #f5fafa;";
const STYLE_UL =
  "list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0;";
const STYLE_OL =
  "list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0;";
const STYLE_LI = "margin-bottom: 0.5rem;";

// Analysis labels per H1 Club spec. Match at the start of a paragraph and
// wrap the leading "Label: " in a span.label for brand-consistent styling.
const ANALYSIS_LABELS = [
  "Meaning",
  "Language and Imagery",
  "Tone",
  "Imagery",
  "Structure",
  "Key Quote",
  "Effect",
  "Technique",
  "Exam Use",
  "Impact",
  "Function",
];

const TEMPLATE = `<article class="lc-resource">
<header style="text-align: center; margin-bottom: 2rem;">
  <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.875rem; color: #666;">The H1 Club · LC English Hub</p>
  <h1 style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0;">{{TITLE}}</h1>
  <p style="font-size: 1rem; color: #666;">{{LEVEL_LABEL}}</p>
</header>

{{BODY_HTML}}

</article>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip the leading H1 from the markdown body if present, since the H1 Club
 * wrapper already provides the title. Avoids a double title.
 */
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.*\n+/, "");
}

/**
 * Replace em dashes, en dashes, and double hyphens with ", " so the output
 * never carries the dash tells. Single hyphens (compound words) are kept.
 */
function scrubDashes(s: string): string {
  return s.replace(/—|–/g, ", ").replace(/--/g, ", ");
}

/**
 * Apply inline brand styles to the marked output. Operates on the rendered
 * HTML string so we can swap styles without overriding the marked renderer
 * API (which moves between major versions).
 */
function applyBrandStyles(html: string): string {
  return html
    .replace(/<h2(\s[^>]*)?>/g, `<h2 style="${STYLE_H2}">`)
    .replace(/<h3(\s[^>]*)?>/g, `<h3 style="${STYLE_H3}">`)
    .replace(
      /<h4(\s[^>]*)?>/g,
      `<h4 class="line-heading" style="${STYLE_H4}">`,
    )
    .replace(
      /<blockquote(\s[^>]*)?>/g,
      `<blockquote style="${STYLE_BLOCKQUOTE}">`,
    )
    .replace(/<ul(\s[^>]*)?>/g, `<ul style="${STYLE_UL}">`)
    .replace(/<ol(\s[^>]*)?>/g, `<ol style="${STYLE_OL}">`)
    .replace(/<li(\s[^>]*)?>/g, `<li style="${STYLE_LI}">`);
}

/**
 * Detect "Label:" patterns at the start of a paragraph and wrap the label
 * in <span class="label">. Matches case-sensitive.
 */
function wrapAnalysisLabels(html: string): string {
  const escaped = ANALYSIS_LABELS.map((l) =>
    l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const re = new RegExp(`(<p[^>]*>)(${escaped}):\\s*`, "g");
  return html.replace(
    re,
    `$1<span class="label" style="font-weight: 700;">$2:</span> `,
  );
}

export function wrapForH1Club(input: WrapInput): string {
  const level = input.level ?? "higher";
  const levelLabel =
    level === "ordinary"
      ? "Ordinary Level English Resource"
      : "Higher Level English Resource";

  const cleanedMd = scrubDashes(stripLeadingH1(input.markdown));
  let bodyHtml = marked.parse(cleanedMd, { async: false }) as string;
  bodyHtml = scrubDashes(bodyHtml); // belt-and-braces: catch any reintroduced
  bodyHtml = applyBrandStyles(bodyHtml);
  bodyHtml = wrapAnalysisLabels(bodyHtml);

  return TEMPLATE.replace("{{TITLE}}", escapeHtml(input.title)).replace(
    "{{LEVEL_LABEL}}",
    levelLabel,
  ).replace("{{BODY_HTML}}", bodyHtml);
}
