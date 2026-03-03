import PptxGenJS from "pptxgenjs";

export interface SlideData {
  layout: "title" | "content" | "two_column" | "quote" | "summary";
  title: string;
  content?: string[];
  left_column?: string[];
  right_column?: string[];
  quote?: string;
  attribution?: string;
  speaker_notes: string;
}

export interface DeckData {
  title: string;
  subtitle: string;
  slides: SlideData[];
}

const NAVY = "1B2A4A";
const CREAM = "FAF8F5";
const TEAL = "2A9D8F";

/**
 * Build a PowerPoint file from structured slide data and trigger download.
 */
export async function exportToSlides(
  deck: DeckData,
  filename: string
): Promise<void> {
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE"; // 16:9
  pptx.author = "LC English Hub";
  pptx.title = deck.title;

  for (const slideData of deck.slides) {
    const slide = pptx.addSlide();

    switch (slideData.layout) {
      case "title": {
        slide.background = { color: NAVY };
        slide.addText(slideData.title, {
          x: 0.8,
          y: 1.8,
          w: 11.5,
          h: 1.5,
          fontSize: 32,
          color: CREAM,
          fontFace: "Calibri",
          bold: true,
        });
        const subtitle =
          slideData.content?.[0] || slideData.attribution || deck.subtitle;
        if (subtitle) {
          slide.addText(subtitle, {
            x: 0.8,
            y: 3.4,
            w: 11.5,
            h: 0.8,
            fontSize: 18,
            color: TEAL,
            fontFace: "Calibri",
          });
        }
        break;
      }

      case "content": {
        slide.background = { color: CREAM };
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 12,
          h: 0.8,
          fontSize: 24,
          color: NAVY,
          fontFace: "Calibri",
          bold: true,
        });
        if (slideData.content && slideData.content.length > 0) {
          const bullets = slideData.content.map((text) => ({
            text,
            options: {
              fontSize: 16,
              color: NAVY,
              fontFace: "Calibri",
              bullet: { color: TEAL },
            } as PptxGenJS.TextPropsOptions,
          }));
          slide.addText(bullets, {
            x: 0.8,
            y: 1.3,
            w: 11.4,
            h: 4.5,
            valign: "top",
          });
        }
        break;
      }

      case "two_column": {
        slide.background = { color: CREAM };
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 12,
          h: 0.8,
          fontSize: 24,
          color: NAVY,
          fontFace: "Calibri",
          bold: true,
        });
        // Left column
        if (slideData.left_column && slideData.left_column.length > 0) {
          const leftBullets = slideData.left_column.map((text) => ({
            text,
            options: {
              fontSize: 14,
              color: NAVY,
              fontFace: "Calibri",
              bullet: { color: TEAL },
            } as PptxGenJS.TextPropsOptions,
          }));
          slide.addText(leftBullets, {
            x: 0.5,
            y: 1.3,
            w: 5.8,
            h: 4.5,
            valign: "top",
          });
        }
        // Right column
        if (slideData.right_column && slideData.right_column.length > 0) {
          const rightBullets = slideData.right_column.map((text) => ({
            text,
            options: {
              fontSize: 14,
              color: NAVY,
              fontFace: "Calibri",
              bullet: { color: TEAL },
            } as PptxGenJS.TextPropsOptions,
          }));
          slide.addText(rightBullets, {
            x: 6.7,
            y: 1.3,
            w: 5.8,
            h: 4.5,
            valign: "top",
          });
        }
        break;
      }

      case "quote": {
        slide.background = { color: CREAM };
        // Teal accent bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5,
          y: 1.5,
          w: 0.08,
          h: 3,
          fill: { color: TEAL },
        });
        if (slideData.quote) {
          slide.addText(`"${slideData.quote}"`, {
            x: 1,
            y: 1.5,
            w: 11,
            h: 2.5,
            fontSize: 22,
            color: NAVY,
            fontFace: "Calibri",
            italic: true,
            valign: "middle",
          });
        }
        if (slideData.attribution) {
          slide.addText(slideData.attribution, {
            x: 1,
            y: 4.2,
            w: 11,
            h: 0.6,
            fontSize: 14,
            color: "666666",
            fontFace: "Calibri",
          });
        }
        // Also show title at top
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 12,
          h: 0.8,
          fontSize: 24,
          color: NAVY,
          fontFace: "Calibri",
          bold: true,
        });
        break;
      }

      case "summary": {
        slide.background = { color: NAVY };
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 12,
          h: 0.8,
          fontSize: 24,
          color: CREAM,
          fontFace: "Calibri",
          bold: true,
        });
        if (slideData.content && slideData.content.length > 0) {
          const bullets = slideData.content.map((text) => ({
            text,
            options: {
              fontSize: 16,
              color: CREAM,
              fontFace: "Calibri",
              bullet: { color: TEAL },
            } as PptxGenJS.TextPropsOptions,
          }));
          slide.addText(bullets, {
            x: 0.8,
            y: 1.3,
            w: 11.4,
            h: 4.5,
            valign: "top",
          });
        }
        break;
      }
    }

    // Add speaker notes
    if (slideData.speaker_notes) {
      slide.addNotes(slideData.speaker_notes);
    }
  }

  await pptx.writeFile({ fileName: filename.replace(/\.pptx$/, "") });
}
