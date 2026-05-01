import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Footer,
  PageNumber,
  NumberFormat,
} from "docx";

// A4 dimensions: 21cm x 29.7cm. docx uses twips (1 cm = 567 twips).
const A4_WIDTH = 11906; // 21cm in twips
const A4_HEIGHT = 16838; // 29.7cm in twips
const MARGIN = 1417; // 2.5cm in twips

const NAVY = "1B2A4A";
const BODY_COLOUR = "333333";

/**
 * Parse inline markdown formatting (**bold**, *italic*) into TextRun objects.
 */
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Match **bold** and *italic* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold text
      runs.push(
        new TextRun({
          text: match[2],
          bold: true,
          font: "Calibri",
          size: 22, // 11pt
          color: BODY_COLOUR,
        })
      );
    } else if (match[3]) {
      // Italic text
      runs.push(
        new TextRun({
          text: match[3],
          italics: true,
          font: "Calibri",
          size: 22,
          color: BODY_COLOUR,
        })
      );
    } else if (match[4]) {
      // Plain text
      runs.push(
        new TextRun({
          text: match[4],
          font: "Calibri",
          size: 22,
          color: BODY_COLOUR,
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text,
        font: "Calibri",
        size: 22,
        color: BODY_COLOUR,
      })
    );
  }

  return runs;
}

/**
 * Promote bold-only lines to real markdown headings.
 *
 * The generation models occasionally regress and emit a heading as a fully
 * bolded paragraph (e.g. `**Othello's nobility and public self**`) instead
 * of the requested `## Heading` syntax. Result: the .docx has no real
 * outline pane in Word. This pre-processor catches that pattern and
 * promotes the line to a heading before paragraph conversion.
 *
 * Rules:
 *  - A line whose entire content is `**...**` (or `__..__`) is a candidate.
 *  - If no `#` heading has appeared yet AND the line is the document's
 *    first non-empty line, promote to H1 (it's the title).
 *  - Otherwise promote to H2 (the model's intended hierarchy).
 *  - Bold lines longer than 120 chars are NOT promoted — those are
 *    legitimate emphatic prose paragraphs, not headings.
 */
function promoteBoldLinesToHeadings(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let seenHeading = false;
  let seenContent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const boldMatch = trimmed.match(/^(\*\*|__)(.+?)\1$/);
    if (boldMatch && boldMatch[2].length <= 120) {
      const headingText = boldMatch[2].trim();
      if (!seenHeading && !seenContent) {
        out.push(`# ${headingText}`);
        seenHeading = true;
      } else {
        out.push(`## ${headingText}`);
        seenHeading = true;
      }
      seenContent = true;
      continue;
    }
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      seenHeading = true;
      seenContent = true;
    } else if (trimmed.length > 0) {
      seenContent = true;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Convert a markdown string to an array of docx Paragraphs.
 */
function markdownToParagraphs(markdown: string): Paragraph[] {
  // Run the bold-as-heading repair before any other parsing so subsequent
  // logic sees real `##` markers instead of bold lines.
  markdown = promoteBoldLinesToHeadings(markdown);
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Suppress horizontal rule lines (---, ***, ___). The shared output
    // rules ban these but the model occasionally still emits them. Dropping
    // them here keeps the exported document professional regardless.
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      i++;
      continue;
    }

    // H2 heading
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 180 },
          children: [
            new TextRun({
              text: line.slice(3).trim(),
              bold: true,
              font: "Calibri",
              size: 28, // 14pt
              color: NAVY,
            }),
          ],
        })
      );
      i++;
      continue;
    }

    // H3 heading
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 280, after: 120 },
          children: [
            new TextRun({
              text: line.slice(4).trim(),
              bold: true,
              font: "Calibri",
              size: 24, // 12pt
              color: NAVY,
            }),
          ],
        })
      );
      i++;
      continue;
    }

    // H1 heading (rare but handle it)
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: line.slice(2).trim(),
              bold: true,
              font: "Calibri",
              size: 32, // 16pt
              color: NAVY,
            }),
          ],
        })
      );
      i++;
      continue;
    }

    // Bullet point
    if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: parseInline(line.slice(2).trim()),
        })
      );
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^\d+\.\s+(.+)/);
    if (numberedMatch) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 60 },
          children: parseInline(numberedMatch[1].trim()),
        })
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
          children: [
            new TextRun({
              text: line.slice(2).trim(),
              italics: true,
              font: "Calibri",
              size: 22,
              color: "4B5563",
            }),
          ],
        })
      );
      i++;
      continue;
    }

    // Regular paragraph
    paragraphs.push(
      new Paragraph({
        spacing: { after: 180 },
        children: parseInline(line.trim()),
      })
    );
    i++;
  }

  return paragraphs;
}

/**
 * Export markdown content as a formatted .docx file.
 */
export async function exportToWord(
  markdown: string,
  filename: string
): Promise<void> {
  const paragraphs = markdownToParagraphs(markdown);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: A4_WIDTH,
              height: A4_HEIGHT,
            },
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "LC English Hub",
                    font: "Calibri",
                    size: 18, // 9pt
                    color: "888888",
                  }),
                  new TextRun({
                    text: "  |  Page ",
                    font: "Calibri",
                    size: 18,
                    color: "888888",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Calibri",
                    size: 18,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
