import type { OutlineInput } from "./generateOutline";

export function buildOutlineUserMessage(input: OutlineInput): string {
  const headerParts: string[] = [];
  if (input.questionYear) headerParts.push(`Year ${input.questionYear}`);
  if (input.questionPaper) headerParts.push(`Paper ${input.questionPaper}`);
  headerParts.push(input.questionLevel === "higher" ? "Higher Level" : "Ordinary Level");
  if (input.questionSection) headerParts.push(input.questionSection);
  const questionHeader = headerParts.join(", ");

  const quotesBlock = input.noteQuotes.length > 0
    ? input.noteQuotes.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "(No quotes extracted from note)";

  const themesBlock = input.noteThemes.length > 0
    ? input.noteThemes.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "(No themes extracted from note)";

  return `You are writing a structured essay outline for this SEC exam question on ${input.poet}${input.poem ? ` (focus poem: ${input.poem})` : ""}.

EXAM QUESTION (${questionHeader}):
"${input.questionText}"

AVAILABLE VERBATIM QUOTES (you must pick from this list only):
${quotesBlock}

THEMES ALREADY IDENTIFIED IN THE NOTE:
${themesBlock}

NOTE CONTEXT (for reference only — do not quote from it, use only the AVAILABLE VERBATIM QUOTES list above):
${input.noteBody.slice(0, 4000)}

Produce the outline as JSON.`;
}
