import { marked } from "marked";

/**
 * Converts a markdown string (as produced by /api/generate or /api/generate/sync)
 * to HTML.
 *
 * Currently returns plain converted HTML. The H1 Club content template wrapper
 * will be added here once the template is provided.
 *
 * Usage:
 *   const html = await markdownToHtml(markdownContent);
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const html = await marked.parse(markdown, {
    gfm: true,   // GitHub Flavoured Markdown (tables, strikethrough, etc.)
    breaks: false,
  });

  // TODO: wrap `html` in the H1 Club content page template once provided.
  // Example of what this will look like:
  //
  // return `
  //   <article class="h1-content">
  //     ${html}
  //   </article>
  // `;

  return html;
}
