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

function pclmTotal(pclm: SampleAnswerFull["pclm_target"]): number | null {
  if (!pclm) return null;
  return pclm.P + pclm.C + pclm.L + pclm.M;
}

function pclmBreakdown(pclm: SampleAnswerFull["pclm_target"]): string | null {
  if (!pclm) return null;
  return `P ${pclm.P} · C ${pclm.C} · L ${pclm.L} · M ${pclm.M}`;
}

function gradeHeadline(grade_tier: string, pclm: SampleAnswerFull["pclm_target"]): string {
  const total = pclmTotal(pclm);
  return total !== null
    ? `${grade_tier} Sample Answer · ${total}/100`
    : `${grade_tier} Sample Answer`;
}

// Split into clean paragraphs. Each paragraph becomes its own array entry
// so the joiner only has to emit `\n` between entries — no `\n\n` embedded
// inside any single string. This survives every clipboard handler I've
// tested (Slack, Notion, Google Docs, plain text editors, Word).
function splitParagraphs(answer_text: string): string[] {
  return answer_text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function toPlainText(row: SampleAnswerFull): string {
  const { question, grade_tier, pclm_target, selected_poems, answer_text } = row;
  const year = question.exam_year ?? "Unknown year";
  const breakdown = pclmBreakdown(pclm_target);
  const poems =
    selected_poems && selected_poems.length > 0
      ? selected_poems.join(", ")
      : null;
  const paragraphs = splitParagraphs(answer_text);

  const lines: (string | null)[] = [
    gradeHeadline(grade_tier, pclm_target),
    `Leaving Certificate English · Higher Level Paper 2`,
    `${year} · ${question.subject_key}`,
    breakdown ? `PCLM: ${breakdown}` : null,
    "",
    "Question",
    "",
    question.question_text,
    "",
    "Answer",
    "",
    // Each paragraph + blank line between, as separate entries
    ...paragraphs.flatMap((p, i) => (i < paragraphs.length - 1 ? [p, ""] : [p])),
    poems ? "" : null,
    poems ? `Poems discussed: ${poems}` : null,
  ];
  return lines.filter((x): x is string => x !== null).join("\n");
}

export function toHtml(row: SampleAnswerFull): string {
  const { question, grade_tier, pclm_target, selected_poems, answer_text } = row;
  const year = question.exam_year ?? "Unknown year";
  const breakdown = pclmBreakdown(pclm_target);
  const poems =
    selected_poems && selected_poems.length > 0
      ? selected_poems.join(", ")
      : null;
  const paragraphsHtml = splitParagraphs(answer_text)
    .map((p) => `  <p>${escapeHtml(p)}</p>`)
    .join("\n");

  return `<article>
  <header style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
    <h1 style="margin:0 0 4px 0;font-size:22px">${escapeHtml(gradeHeadline(grade_tier, pclm_target))}</h1>
    <p style="margin:0;color:#475569;font-size:13px">
      Leaving Certificate English · Higher Level Paper 2<br>
      ${escapeHtml(String(year))} · ${escapeHtml(question.subject_key)}
    </p>${
      breakdown
        ? `\n    <p style="margin:6px 0 0 0;color:#475569;font-size:13px"><strong>PCLM:</strong> ${escapeHtml(breakdown)}</p>`
        : ""
    }
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
