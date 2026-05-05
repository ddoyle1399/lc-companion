/**
 * lib/slides/renderDeckToPptx.ts
 *
 * Render a DeckPlan to a .pptx Buffer for server-side upload to Supabase
 * Storage. Mirrors the client-side renderer in lib/export/slides.ts but
 * returns a Buffer instead of triggering a browser download.
 *
 * Brand: navy (1B2A4A) for title and summary slides, cream (FAF8F5) for
 * content slides, teal (2A9D8F) for bullets and accents. Matches the
 * existing client renderer.
 *
 * Layout sizes assume LAYOUT_WIDE (13.33" x 7.5").
 */

import PptxGenJS from "pptxgenjs";
import type { DeckPlan, Slide } from "./buildDeckPlan";

const NAVY = "1B2A4A";
const CREAM = "FAF8F5";
const TEAL = "2A9D8F";
const SLATE = "475569";

export async function renderDeckToPptx(deck: DeckPlan): Promise<{
  buffer: Buffer;
  slideCount: number;
  byteLength: number;
}> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "LC English Hub";
  pptx.company = "LC English Hub";
  pptx.title = deck.title;
  pptx.subject = `Classroom-display deck for ${deck.title}`;

  for (const slideData of deck.slides) {
    const slide = pptx.addSlide();
    renderSlide(pptx, slide, slideData);
    if (slideData.speaker_notes && slideData.speaker_notes.trim().length > 0) {
      slide.addNotes(slideData.speaker_notes);
    }
  }

  // pptxgenjs returns a Promise<string|Buffer|Blob|ArrayBuffer> per outputType.
  // "nodebuffer" returns a Buffer when running on Node.
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer: out, slideCount: deck.slides.length, byteLength: out.length };
}

function renderSlide(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  s: Slide,
): void {
  switch (s.layout) {
    case "title":
      return renderTitleSlide(pptx, slide, s);
    case "content":
      return renderContentSlide(slide, s);
    case "two_column":
      return renderTwoColumnSlide(pptx, slide, s);
    case "quote":
      return renderQuoteSlide(pptx, slide, s);
    case "summary":
      return renderSummarySlide(slide, s);
  }
}

function renderTitleSlide(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  s: Extract<Slide, { layout: "title" }>,
): void {
  slide.background = { color: NAVY };

  // Teal accent bar on the left.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 2.6, w: 0.12, h: 2.0, fill: { color: TEAL }, line: { type: "none" },
  });

  slide.addText(s.title, {
    x: 0.95, y: 2.4, w: 11.5, h: 1.6,
    fontSize: 44, color: CREAM, fontFace: "Georgia", bold: true,
    valign: "middle",
  });

  slide.addText(s.subtitle, {
    x: 0.95, y: 4.1, w: 11.5, h: 0.8,
    fontSize: 18, color: TEAL, fontFace: "Calibri",
  });

  // Footer: small brand line.
  slide.addText("LC English Hub · Classroom Deck", {
    x: 0.5, y: 6.9, w: 12, h: 0.4,
    fontSize: 10, color: TEAL, fontFace: "Calibri", align: "left",
  });
}

function renderContentSlide(
  slide: PptxGenJS.Slide,
  s: Extract<Slide, { layout: "content" }>,
): void {
  slide.background = { color: CREAM };
  drawHeader(slide, s.title);

  if (s.bullets.length > 0) {
    const items = s.bullets.map((text) => ({
      text,
      options: {
        fontSize: 20,
        color: NAVY,
        fontFace: "Calibri",
        bullet: { code: "25CF", indent: 18 },
        paraSpaceAfter: 8,
      } as PptxGenJS.TextPropsOptions,
    }));
    slide.addText(items, {
      x: 0.8, y: 1.35, w: 11.7, h: 5.4, valign: "top",
    });
  } else {
    slide.addText("(See speaker notes)", {
      x: 0.8, y: 1.35, w: 11.7, h: 5.4,
      fontSize: 14, color: SLATE, fontFace: "Calibri", italic: true,
    });
  }

  drawFooter(slide);
}

function renderTwoColumnSlide(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  s: Extract<Slide, { layout: "two_column" }>,
): void {
  slide.background = { color: CREAM };
  drawHeader(slide, s.title);

  // Left: quote on cream, italic, with teal vertical accent bar.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 1.5, w: 0.08, h: 4.5, fill: { color: TEAL }, line: { type: "none" },
  });
  slide.addText(`“${s.quote}”`, {
    x: 0.95, y: 1.5, w: 5.4, h: 4.5,
    fontSize: 22, color: NAVY, fontFace: "Georgia", italic: true,
    valign: "middle",
  });

  // Right: bullets.
  if (s.bullets.length > 0) {
    const items = s.bullets.map((text) => ({
      text,
      options: {
        fontSize: 18,
        color: NAVY,
        fontFace: "Calibri",
        bullet: { code: "25CF", indent: 18 },
        paraSpaceAfter: 8,
      } as PptxGenJS.TextPropsOptions,
    }));
    slide.addText(items, {
      x: 6.7, y: 1.5, w: 5.9, h: 4.5, valign: "top",
    });
  }

  drawFooter(slide);
}

function renderQuoteSlide(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  s: Extract<Slide, { layout: "quote" }>,
): void {
  slide.background = { color: CREAM };
  drawHeader(slide, s.title);

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 1.7, w: 0.08, h: 3.5, fill: { color: TEAL }, line: { type: "none" },
  });
  slide.addText(`“${s.quote}”`, {
    x: 0.95, y: 1.7, w: 11.5, h: 3.0,
    fontSize: 28, color: NAVY, fontFace: "Georgia", italic: true,
    valign: "middle",
  });
  if (s.attribution) {
    slide.addText(s.attribution, {
      x: 0.95, y: 4.9, w: 11.5, h: 0.6,
      fontSize: 16, color: SLATE, fontFace: "Calibri",
    });
  }

  drawFooter(slide);
}

function renderSummarySlide(
  slide: PptxGenJS.Slide,
  s: Extract<Slide, { layout: "summary" }>,
): void {
  slide.background = { color: NAVY };

  slide.addText(s.title, {
    x: 0.5, y: 0.4, w: 12.4, h: 0.9,
    fontSize: 28, color: CREAM, fontFace: "Georgia", bold: true,
  });

  if (s.bullets.length > 0) {
    const items = s.bullets.map((text) => ({
      text,
      options: {
        fontSize: 20,
        color: CREAM,
        fontFace: "Calibri",
        bullet: { code: "25CF", indent: 18 },
        paraSpaceAfter: 8,
      } as PptxGenJS.TextPropsOptions,
    }));
    slide.addText(items, {
      x: 0.8, y: 1.6, w: 11.7, h: 5.0, valign: "top",
    });
  }

  slide.addText("LC English Hub · Classroom Deck", {
    x: 0.5, y: 6.9, w: 12, h: 0.4,
    fontSize: 10, color: TEAL, fontFace: "Calibri", align: "left",
  });
}

function drawHeader(slide: PptxGenJS.Slide, title: string): void {
  slide.addText(title, {
    x: 0.5, y: 0.4, w: 12.4, h: 0.7,
    fontSize: 26, color: NAVY, fontFace: "Georgia", bold: true,
  });
}

function drawFooter(slide: PptxGenJS.Slide): void {
  slide.addText("LC English Hub", {
    x: 0.5, y: 6.95, w: 6, h: 0.35,
    fontSize: 9, color: SLATE, fontFace: "Calibri",
  });
}
