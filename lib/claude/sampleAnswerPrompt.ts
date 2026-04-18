import type { OutlineBodyMove } from "./generateOutline";

export type SampleAnswerPromptInput = {
  tier: "H1" | "H4";
  questionText: string;
  questionYear: number;
  poet: string;
  poem: string;
  outline: {
    thesis_line: string;
    body_moves: OutlineBodyMove[];
    closing_move: string;
    examiner_note: string | null;
  };
  quoteBank: string[];
  indicativeMaterial: string[];
  examinerExpectation: string;
  targetWordCount: number;
};

const SHARED_RULES = `You are writing a Leaving Certificate English Higher Level essay in response to a Paper 2 Poetry question.

ABSOLUTE RULES:
- Every quote you use must be copied verbatim from the QUOTE BANK provided. Do not invent quotes. Do not paraphrase and present as a quote. If you need a quote to support a point and the bank does not have one, adjust the point — do not invent a quote.
- Output the essay text only. No preamble, no heading, no markdown code fences, no meta-commentary.
- Use UK English spelling (colour, organised, analyse, centre).
- Never use em dashes. Use commas, full stops, colons, semicolons.
- Write in the first person where natural. Do not default to "the reader".
- Follow the structural skeleton in the OUTLINE but write in full continuous prose. Do not output the outline labels.
- Target the word count given. Plus or minus 10 percent is acceptable.`;

const H1_RULES = `
YOU ARE WRITING AN H1-LEVEL ANSWER.

Behaviours required:
- Sophisticated thesis that answers the exact question asked, not a generic thesis about the poet.
- Quote integration woven into argument, never dropped in. Lead into every quote with a clause that earns it.
- Varied sentence length. Short punchy observations mixed with longer analytical sentences.
- Examiner-aware structure. Each body paragraph opens with a topic sentence that explicitly links back to the question.
- Nuanced personal response. Take a clear position. Defend it. Acknowledge counter-readings where appropriate.
- Energy and voice. Sound like a student who has spent a year inside these poems, not a textbook.
- Zero filler. Every sentence should carry weight.
- Use paragraph transitions sparingly and only when they move the argument, not to pad.

Anti-patterns — do NOT produce:
- "This powerful line underscores..."
- "The poet masterfully..."
- "Furthermore,", "Moreover,", "In conclusion,"
- Restating a quote in different words instead of extending the argument.
- Generic adjectives ("profound", "striking", "powerful") without specifics.`;

const H4_RULES = `
YOU ARE WRITING AN H4-LEVEL ANSWER.

Behaviours required:
- Clear thesis that addresses the question but treated at surface level.
- Quotes present and correctly chosen but dropped in rather than integrated. It is acceptable, and realistic, for this answer to introduce quotes with phrases like "For example, Kavanagh writes,".
- More uniform sentence length than an H1 answer.
- Structure present but transitions are mechanical ("Another theme is...", "The poet also...").
- Some genuine observation but retells the poem rather than argues with it.
- Correct UK spelling and grammar. The M score is still high at H4. Mechanics is not where H4 loses marks.
- Occasional repetition of ideas across paragraphs is realistic for this tier.

Anti-patterns — do NOT produce:
- Wrong quotes, misquoted lines, invented quotes.
- Analysis that is actively wrong. H4 students are not wrong, they are shallow.
- Perfect thesis and sophisticated argument. That is H1 work, not H4.`;

export function buildSampleAnswerSystemPrompt(tier: "H1" | "H4"): string {
  return SHARED_RULES + (tier === "H1" ? H1_RULES : H4_RULES);
}

export function buildSampleAnswerUserMessage(
  input: SampleAnswerPromptInput,
): string {
  const quotesBlock = input.quoteBank
    .map((q, i) => `${i + 1}. "${q}"`)
    .join("\n");

  const indicativeBlock = input.indicativeMaterial
    .map((b, i) => `${i + 1}. ${b}`)
    .join("\n");

  const outlineLines = [
    `Thesis: ${input.outline.thesis_line}`,
    ...input.outline.body_moves.map(
      (m, i) =>
        `Body ${i + 1}: ${m.move}\n  Quote: "${m.quote}"\n  Gloss: ${m.gloss}`,
    ),
    `Closing: ${input.outline.closing_move}`,
    input.outline.examiner_note
      ? `Examiner note: ${input.outline.examiner_note}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `EXAM QUESTION (${input.questionYear}, Higher Level, Paper 2):
"${input.questionText}"

POET: ${input.poet}
FOCUS POEM: ${input.poem}

TARGET WORD COUNT: ${input.targetWordCount} words.

SEC EXAMINER EXPECTATION FOR THIS QUESTION:
${input.examinerExpectation}

SEC INDICATIVE MATERIAL (non-exhaustive seed list of acceptable angles):
${indicativeBlock}

QUOTE BANK (the ONLY permitted source of quotations):
${quotesBlock}

STRUCTURAL OUTLINE TO FOLLOW (write in full prose, do not output the labels):
${outlineLines}

Write the essay now.`;
}
