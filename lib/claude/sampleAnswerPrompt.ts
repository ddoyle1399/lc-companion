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
YOU ARE WRITING AN H4 ANSWER. This is a 30/50 script. H4 means shallow-but-correct, not wrong. You must deliberately produce weaknesses that mark the script as H4 rather than H1.

MANDATORY BEHAVIOURS (each must appear at least once in the final answer):

1. Retell before analyse. In at least TWO body paragraphs, spend two or more sentences describing what happens in the poem before offering any interpretation.

2. Quote-drop with flat restatement. At least THREE of your quotes must be followed by a sentence that restates the quote in slightly different words rather than analysing it. Use this pattern: "Kavanagh writes 'X'. This shows that [restatement of X in different words]."

3. Engage unevenly with the statement. The question has two halves. Discuss ONE half in detail across two or three paragraphs. Mention the other half in only one paragraph, briefly.

4. Weak paragraph openings. At least TWO body paragraphs must begin with one of these exact phrases: "Also", "Another point is", "Furthermore Kavanagh", "Another theme is", "The poet also". Do not use topic sentences that develop a line of argument.

5. No thesis development. State a thematic claim in the introduction. Move through separate observations. Do NOT return to the thesis in the conclusion or tie observations back to it.

6. Flat conclusion. One to two sentences. Either restate the introduction or end on a generic statement about the poet's skill.

7. Evaluative vocabulary. Use at least TWO of: "beautiful", "powerful", "interesting", "really shows", "clearly".

VOCABULARY YOU MUST NOT USE:
- enigmatic, liminal, diagnoses, interrogates, constructs, oxymoron, paradox (as an analysed technique)
- "bridges the ordinary and extraordinary" or similar synthesising phrases
- Any claim that the poem "must solve", "works through", or "enacts" anything
- Mid-sentence quote integration (embedding a quote fragment inside a larger analytical sentence)

HARD NO:
- Invented, wrong, or misquoted lines
- Analysis that is factually wrong. H4 is shallow, not incorrect.
- Developed thesis sustained across paragraphs
- Sophisticated topic sentences that signal argumentative structure

Mechanics stay clean. The M score is still high at H4. UK spelling, correct grammar. The weaknesses appear in P (shallow engagement) and C (weak organisation), not M.`;

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
