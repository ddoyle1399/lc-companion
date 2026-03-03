import examData from "./poetry-questions.json";

export interface PastQuestion {
  year: number;
  statement: string;
  style_focus: string;
  theme_focus: string;
}

export interface PoetExamData {
  past_questions: PastQuestion[];
  useful_themes: string[];
  predicted_style_elements: string[];
  status: "frequently_examined" | "examined" | "not_yet_examined";
}

export interface ComparativeModePattern {
  typical_angles: string[];
  past_questions: { year: number; statement: string }[];
}

export interface ExamFormat {
  paper: string;
  section: string;
  marks: number;
  question_structure: string;
  typical_choice: string;
  recommended_poems: string;
  examiner_expectations: string[];
}

export function getExamFormat(): ExamFormat {
  return examData.exam_format as ExamFormat;
}

export function getPoetExamData(poet: string): PoetExamData | undefined {
  const poets = examData.poets as Record<string, PoetExamData>;
  return poets[poet];
}

export function getAllExaminedPoets(): string[] {
  return Object.keys(examData.poets);
}

export function getPoetPastQuestions(poet: string): PastQuestion[] {
  const data = getPoetExamData(poet);
  return data?.past_questions || [];
}

export function getPoetUsefulThemes(poet: string): string[] {
  const data = getPoetExamData(poet);
  return data?.useful_themes || [];
}

export function getPoetStyleElements(poet: string): string[] {
  const data = getPoetExamData(poet);
  return data?.predicted_style_elements || [];
}

export function getComparativePattern(mode: string): ComparativeModePattern | undefined {
  const patterns = examData.comparative_patterns as Record<string, ComparativeModePattern>;
  return patterns[mode];
}

export function getAllComparativeModes(): string[] {
  return Object.keys(examData.comparative_patterns);
}

/**
 * Build a summary string of a poet's exam history and angles,
 * suitable for injection into a system prompt.
 */
export function buildPoetExamSummary(poet: string): string {
  const data = getPoetExamData(poet);
  if (!data) return "";

  const parts: string[] = [];

  if (data.past_questions.length > 0) {
    parts.push("Past SEC exam questions for this poet:");
    for (const q of data.past_questions) {
      parts.push(`- ${q.year}: "${q.statement}" (style: ${q.style_focus} / theme: ${q.theme_focus})`);
    }
  } else {
    parts.push(`This poet has not yet appeared on the LC English exam. Predicted exam angles based on their work:`);
  }

  parts.push(`\nUseful themes for exam answers: ${data.useful_themes.join(", ")}`);
  parts.push(`Style elements examiners look for: ${data.predicted_style_elements.join(", ")}`);

  return parts.join("\n");
}

/**
 * Build a summary string of a comparative mode's exam history and angles,
 * suitable for injection into a system prompt.
 */
export function buildComparativeExamSummary(mode: string): string {
  const pattern = getComparativePattern(mode);
  if (!pattern) return "";

  const parts: string[] = [];
  parts.push(`Comparative mode: ${mode}`);
  parts.push(`Typical exam angles for this mode:`);
  for (const angle of pattern.typical_angles) {
    parts.push(`- ${angle}`);
  }
  if (pattern.past_questions.length > 0) {
    parts.push(`\nPast SEC exam questions in this mode:`);
    for (const q of pattern.past_questions) {
      parts.push(`- ${q.year}: "${q.statement}"`);
    }
  }
  return parts.join("\n");
}
