import type { PromptContext } from "@/lib/claude/prompts";
import type { SaveNoteInput } from "./types";

function levelLabel(level: "HL" | "OL" | undefined): "higher" | "ordinary" {
  return level === "HL" ? "higher" : "ordinary";
}

function yearLevel(context: PromptContext): string {
  return `${context.level} ${context.year}`;
}

export function mapPromptContextToNoteInput(
  context: PromptContext,
  bodyHtml: string,
  bodyText: string,
  generationModel: string,
  quotes?: string[] | null,
  themes?: string[] | null
): SaveNoteInput {
  const { contentType } = context;

  let subjectKey: string;
  let subKey: string | null = null;
  let title: string;

  switch (contentType) {
    case "poetry": {
      if (!context.poet) {
        throw new Error(
          "mapPromptContextToNoteInput: missing required field poet for contentType poetry"
        );
      }
      subjectKey = context.poet;
      subKey = context.poem ?? null;
      title = subKey
        ? `${subKey} by ${context.poet} (${yearLevel(context)})`
        : `${context.poet} (${yearLevel(context)})`;
      break;
    }

    case "single_text": {
      if (!context.textTitle) {
        throw new Error(
          "mapPromptContextToNoteInput: missing required field textTitle for contentType single_text"
        );
      }
      subjectKey = context.textTitle;
      title = `${context.textTitle} (${yearLevel(context)})`;
      break;
    }

    case "comparative": {
      if (!context.comparativeMode) {
        throw new Error(
          "mapPromptContextToNoteInput: missing required field comparativeMode for contentType comparative"
        );
      }
      subjectKey = context.comparativeMode;
      title = `${context.comparativeMode} (${yearLevel(context)})`;
      break;
    }

    case "unseen_poetry": {
      subjectKey = "unseen_poetry";
      title = `Unseen Poetry (${yearLevel(context)})`;
      break;
    }

    case "comprehension": {
      subjectKey = "comprehension";
      title = `Comprehension (${yearLevel(context)})`;
      break;
    }

    case "composition": {
      subjectKey = "composition";
      title = `Composition (${yearLevel(context)})`;
      break;
    }

    case "worksheet": {
      const primary =
        context.poet
          ? context.poem
            ? `${context.poem} by ${context.poet}`
            : context.poet
          : context.textTitle ?? context.comparativeMode ?? null;
      subjectKey = primary ?? "worksheet";
      title = primary
        ? `${primary} Worksheet (${yearLevel(context)})`
        : `Worksheet (${yearLevel(context)})`;
      break;
    }

    case "slides": {
      const primary =
        context.poet
          ? context.poem
            ? `${context.poem} by ${context.poet}`
            : context.poet
          : context.textTitle ?? context.comparativeMode ?? null;
      subjectKey = primary ?? "slides";
      title = primary
        ? `${primary} Slides (${yearLevel(context)})`
        : `Slides (${yearLevel(context)})`;
      break;
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(
        `mapPromptContextToNoteInput: unknown contentType ${contentType as any}`
      );
    }
  }

  // Strip large fields before storing to keep metadata jsonb lean.
  // poemText and textbookAnalysis can be reconstructed from source of truth.
  const {
    poemText: _poemText,
    textbookAnalysis: _textbookAnalysis,
    ...slimContext
  } = context;

  return {
    content_type: contentType,
    subject_key: subjectKey,
    sub_key: subKey,
    level: levelLabel(context.level),
    exam_year: context.year ?? 0,
    title,
    body_html: bodyHtml,
    body_text: bodyText,
    quotes: quotes ?? null,
    themes: themes ?? null,
    metadata: { promptContext: slimContext },
    generation_model: generationModel,
  };
}
