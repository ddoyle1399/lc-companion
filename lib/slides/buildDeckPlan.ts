/**
 * lib/slides/buildDeckPlan.ts
 *
 * Take a parsed note structure and produce a slide deck plan: an ordered
 * list of slides with layout, title, body content, and full speaker notes.
 *
 * Step 1 (deterministic): walk the parsed note in order and produce one
 * slide per stanza, theme, and named top-level section.
 *
 * Step 2 (LLM, parallel): for each slide, condense the section's prose
 * into 3-5 slide-friendly bullets via Sonnet 4.6. The full prose stays in
 * speaker_notes verbatim. Slides are designed for classroom display where
 * the teacher narrates the speaker notes.
 *
 * The output of this module is the JSON we render to .pptx and store in
 * `slide_decks.deck_plan`.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ParsedNote } from "./parseNoteStructure";

export type Slide =
  | {
      layout: "title";
      title: string;          // "The Tollund Man"
      subtitle: string;       // "Seamus Heaney · Wintering Out · 1972"
      speaker_notes: string;
    }
  | {
      layout: "content";      // bullets on cream
      title: string;
      bullets: string[];
      speaker_notes: string;
    }
  | {
      layout: "two_column";   // quote on left, bullets on right
      title: string;
      quote: string;
      bullets: string[];
      speaker_notes: string;
    }
  | {
      layout: "quote";        // big italic quote (used for theme illustrations)
      title: string;
      quote: string;
      attribution: string;
      speaker_notes: string;
    }
  | {
      layout: "summary";      // navy background, closing slide
      title: string;
      bullets: string[];
      speaker_notes: string;
    };

export type DeckPlan = {
  title: string;
  subtitle: string;
  slides: Slide[];
};

const CONDENSE_MODEL = "claude-sonnet-4-6";

const CONDENSE_SYSTEM_PROMPT = `You condense LC English teaching notes into classroom-display slide bullets. The teacher will be presenting the slide while talking through the detail; bullets are headlines, not full prose. Rules:

- 3 to 5 bullets per slide. No more.
- Each bullet is a complete thought, no fragments. Maximum 14 words per bullet.
- Use UK English. No em dashes anywhere. Use commas, full stops, colons.
- No filler ("This shows that...", "It is important to note...", "The poet uses..."). Lead with the substance.
- Examiner-aware where the source supports it ("a Q on memory would lean on this").
- Never invent material. If the source prose does not say it, do not put it on the slide.
- Do not paraphrase or weaken a point: keep the precision of the source.
- Skip the title. The slide already has a title.

Return ONLY by calling the report_bullets tool. Do not narrate.`;

const TOOL = {
  name: "report_bullets",
  description: "Return 3 to 5 condensed bullets for a slide.",
  input_schema: {
    type: "object",
    properties: {
      bullets: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string", minLength: 3, maxLength: 120 },
      },
    },
    required: ["bullets"],
  },
} as const;

async function condense(
  client: Anthropic,
  slideTitle: string,
  prose: string,
): Promise<string[]> {
  if (!prose.trim()) return [];
  const response = await client.messages.create({
    model: CONDENSE_MODEL,
    max_tokens: 600,
    system: CONDENSE_SYSTEM_PROMPT,
    tools: [TOOL as any],
    tool_choice: { type: "tool", name: "report_bullets" } as any,
    messages: [
      {
        role: "user",
        content: `Slide title: ${slideTitle}\n\nSource prose:\n${prose.slice(0, 4000)}`,
      },
    ],
  });
  const toolUse = response.content.find((b: any) => b.type === "tool_use") as
    | { type: "tool_use"; name: string; input: { bullets?: string[] } }
    | undefined;
  if (!toolUse?.input?.bullets) return [];
  return toolUse.input.bullets.filter((b) => typeof b === "string" && b.trim().length > 0);
}

function pad(s?: string): string {
  return (s ?? "").trim();
}

function titleSubtitle(note: ParsedNote): { title: string; subtitle: string } {
  const subtitleParts = [note.poet];
  if (note.collection) subtitleParts.push(note.collection);
  if (note.composition_date) subtitleParts.push(note.composition_date);
  return { title: note.poem, subtitle: subtitleParts.join(" · ") };
}

/**
 * Walk the parsed note and produce a list of slide stubs (everything but
 * the LLM-condensed bullets). Returns the slides in deck order plus the
 * prose-to-condense work list for stage 2.
 */
function buildSkeleton(note: ParsedNote): {
  slides: Slide[];
  bulletWork: Array<{ slideIdx: number; prose: string; title: string }>;
} {
  const slides: Slide[] = [];
  const bulletWork: Array<{ slideIdx: number; prose: string; title: string }> = [];

  const ts = titleSubtitle(note);

  // 1. Title slide
  slides.push({
    layout: "title",
    title: ts.title,
    subtitle: ts.subtitle,
    speaker_notes: pad(note.overview) || `Today we are working through "${note.poem}" by ${note.poet}.`,
  });

  // 2. Overview
  if (pad(note.overview)) {
    slides.push({
      layout: "content",
      title: "Overview",
      bullets: [],
      speaker_notes: pad(note.overview),
    });
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: pad(note.overview),
      title: "Overview",
    });
  }

  // 3. Form and Structure
  if (pad(note.form_and_structure)) {
    slides.push({
      layout: "content",
      title: "Form and Structure",
      bullets: [],
      speaker_notes: pad(note.form_and_structure),
    });
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: pad(note.form_and_structure),
      title: "Form and Structure",
    });
  }

  // 4. Stanza-by-Stanza, one slide per stanza
  for (const st of note.stanzas) {
    const proseClean = pad(st.prose);
    if (!proseClean) continue;
    if (st.quote) {
      slides.push({
        layout: "two_column",
        title: st.label,
        quote: st.quote,
        bullets: [],
        speaker_notes: proseClean,
      });
    } else {
      slides.push({
        layout: "content",
        title: st.label,
        bullets: [],
        speaker_notes: proseClean,
      });
    }
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: proseClean,
      title: st.label,
    });
  }

  // 5. Themes, one slide per theme
  for (const th of note.themes) {
    const proseClean = pad(th.prose);
    if (!proseClean) continue;
    slides.push({
      layout: "content",
      title: th.label,
      bullets: [],
      speaker_notes: proseClean,
    });
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: proseClean,
      title: th.label,
    });
  }

  // 6. Tone
  if (pad(note.tone)) {
    slides.push({
      layout: "content",
      title: "Tone",
      bullets: [],
      speaker_notes: pad(note.tone),
    });
    bulletWork.push({ slideIdx: slides.length - 1, prose: pad(note.tone), title: "Tone" });
  }

  // 7. Exam Use (closing slide on navy)
  if (pad(note.exam_use)) {
    slides.push({
      layout: "summary",
      title: "Use it in the exam",
      bullets: [],
      speaker_notes: pad(note.exam_use),
    });
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: pad(note.exam_use),
      title: "Use it in the exam",
    });
  }

  // 8. Pairings
  if (pad(note.pairings)) {
    slides.push({
      layout: "content",
      title: "Pairings",
      bullets: [],
      speaker_notes: pad(note.pairings),
    });
    bulletWork.push({
      slideIdx: slides.length - 1,
      prose: pad(note.pairings),
      title: "Pairings",
    });
  }

  return { slides, bulletWork };
}

async function withConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (cursor < items.length) {
          const i = cursor++;
          results[i] = await fn(items[i]);
        }
      })(),
    );
  }
  await Promise.all(workers);
  return results;
}

export async function buildDeckPlan(
  note: ParsedNote,
  opts: { client: Anthropic; concurrency?: number } = { client: undefined as any },
): Promise<DeckPlan> {
  const { slides, bulletWork } = buildSkeleton(note);
  const ts = titleSubtitle(note);

  if (bulletWork.length === 0) {
    return { title: ts.title, subtitle: ts.subtitle, slides };
  }

  const client = opts.client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const concurrency = opts.concurrency ?? 5;

  const allBullets = await withConcurrency(
    bulletWork,
    async (work) => {
      try {
        return await condense(client, work.title, work.prose);
      } catch {
        return [];
      }
    },
    concurrency,
  );

  for (let i = 0; i < bulletWork.length; i++) {
    const slide = slides[bulletWork[i].slideIdx];
    if (slide.layout === "content" || slide.layout === "two_column" || slide.layout === "summary") {
      slide.bullets = allBullets[i];
    }
  }

  return { title: ts.title, subtitle: ts.subtitle, slides };
}
