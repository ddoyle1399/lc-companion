export interface SampleAnswerFull {
  id: string;
  answer_text: string;
  word_count: number;
  grade_tier: string;
  pclm_target: { P: number; C: number; L: number; M: number } | null;
  selected_poems: string[] | null;
  generation_model: string | null;
  generated_at: string;
  approved: boolean;
  reviewer_notes: string | null;
  question: {
    question_text: string;
    exam_year: number | null;
    subject_key: string;
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Student-facing exports: no app branding, no model attribution, no internal
// PCLM language, no generation timestamp. Just the grade label, the exam
// context, the question, the answer, and optionally the poems discussed.

export function toPlainText(row: SampleAnswerFull): string {
  const { question, grade_tier, selected_poems, answer_text } = row;
  const year = question.exam_year ?? "Unknown year";
  const poems =
    selected_poems && selected_poems.length > 0
      ? selected_poems.join(", ")
      : null;
  const paragraphs = answer_text.split(/\n\n+/).join("\n\n");

  const lines: (string | null)[] = [
    `${grade_tier} Sample Answer`,
    `Leaving Certificate English · Higher Level Paper 2`,
    `${year} · ${question.subject_key}`,
    "",
    "Question",
    "",
    question.question_text,
    "",
    "Answer",
    "",
    paragraphs,
    poems ? "" : null,
    poems ? `Poems discussed: ${poems}` : null,
  ];
  return lines.filter((x): x is string => x !== null).join("\n");
}

export function toHtml(row: SampleAnswerFull): string {
  const { question, grade_tier, selected_poems, answer_text } = row;
  const year = question.exam_year ?? "Unknown year";
  const poems =
    selected_poems && selected_poems.length > 0
      ? selected_poems.join(", ")
      : null;
  const paragraphsHtml = answer_text
    .split(/\n\n+/)
    .map((p) => `  <p>${escapeHtml(p.trim())}</p>`)
    .join("\n");

  return `<article>
  <header style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
    <h1 style="margin:0 0 4px 0;font-size:22px">${escapeHtml(grade_tier)} Sample Answer</h1>
    <p style="margin:0;color:#475569;font-size:13px">
      Leaving Certificate English · Higher Level Paper 2<br>
      ${escapeHtml(String(year))} · ${escapeHtml(question.subject_key)}
    </p>
  </header>
  <section style="margin-bottom:24px;padding:16px;background:#f8fafc;border-left:4px solid #0f766e">
    <h2 style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#0f766e">Question</h2>
    <p style="margin:0;font-size:15px;color:#0f172a">${escapeHtml(question.question_text)}</p>
  </section>
  <section>
    <h2 style="margin:0 0 12px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#0f766e">Answer</h2>
${paragraphsHtml}
  </section>${
    poems
      ? `\n  <footer style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0">
    <p style="margin:0;color:#64748b;font-size:12px"><em>Poems discussed: ${escapeHtml(poems)}</em></p>
  </footer>`
      : ""
  }
</article>`;
}
