"use client";

import { useState, useEffect, useCallback } from "react";
import { getPoetsHL } from "@/data/circulars";

type GradeTier = "H1" | "H2" | "H3";

interface Question {
  id: string;
  exam_year: number;
  question_text: string;
}

interface PoemOption {
  title: string;
  verified: boolean;
}

interface PclmScore {
  P: number;
  C: number;
  L: number;
  M: number;
}

interface ValidatorFailure {
  quote: string;
  reason: string;
}

interface SampleAnswerRow {
  id: string;
  answer_text: string;
  word_count: number;
  pclm_target: PclmScore;
  validator_result: {
    passed: boolean;
    flagged_strings: string[];
    matched_quotes: string[];
    coverage_pct: number;
  };
  quotes_used: string[];
  selected_poems: string[];
  generation_model: string;
  approved: boolean;
  reviewer_notes: string | null;
}

type GenerateResult =
  | { status: "success"; sampleAnswer: SampleAnswerRow }
  | { status: "validation_failed"; failures: ValidatorFailure[]; rawAnswer: string }
  | { status: "error"; message: string };

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

interface Props {
  poets: string[];
  availableYears: number[];
  defaultYear: number;
}

export default function GenerateForm({ poets, availableYears, defaultYear }: Props) {
  const [examCycleYear, setExamCycleYear] = useState<number>(defaultYear);
  const [poet, setPoet] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [gradeTier, setGradeTier] = useState<GradeTier>("H1");
  const [poems, setPoems] = useState<PoemOption[]>([]);
  const [selectedPoems, setSelectedPoems] = useState<Set<string>>(new Set());
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [poemsLoading, setPoemsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // Poets available for the selected exam cycle year
  const prescribedPoets = getPoetsHL(examCycleYear);
  const filteredPoets = poets.filter((p) => prescribedPoets.includes(p));

  const loadQuestions = useCallback(async (selectedPoet: string) => {
    if (!selectedPoet) {
      setQuestions([]);
      setQuestionId("");
      setQuestionsError("");
      return;
    }
    setQuestionsLoading(true);
    setQuestionsError("");
    setQuestions([]);
    setQuestionId("");
    setResult(null);

    const res = await fetch(
      `/api/generate/questions?poetKey=${encodeURIComponent(selectedPoet)}`,
    );
    const json = await res.json();
    setQuestionsLoading(false);

    if (!res.ok) {
      setQuestionsError("Failed to load past questions.");
      return;
    }

    if (!json.questions || json.questions.length === 0) {
      setQuestionsError("No seeded past questions for this poet yet. Seed a PCLM row first.");
      return;
    }

    setQuestions(json.questions);
    setQuestionId(json.questions[0].id);
  }, []);

  const loadPoems = useCallback(async (selectedPoet: string, year: number) => {
    if (!selectedPoet) {
      setPoems([]);
      setSelectedPoems(new Set());
      return;
    }
    setPoemsLoading(true);
    setPoems([]);
    setSelectedPoems(new Set());

    const res = await fetch(
      `/api/generate/poems?poetKey=${encodeURIComponent(selectedPoet)}&year=${year}`,
    );
    const json = await res.json();
    setPoemsLoading(false);

    if (res.ok && Array.isArray(json.poems)) {
      setPoems(json.poems);
    }
  }, []);

  useEffect(() => {
    loadQuestions(poet);
  }, [poet, loadQuestions]);

  useEffect(() => {
    loadPoems(poet, examCycleYear);
  }, [poet, examCycleYear, loadPoems]);

  function handleYearChange(year: number) {
    setExamCycleYear(year);
    setPoet("");
    setResult(null);
  }

  function handlePoetChange(newPoet: string) {
    setPoet(newPoet);
    setResult(null);
  }

  function togglePoem(title: string, verified: boolean) {
    if (!verified) return;
    setSelectedPoems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else if (next.size < 6) {
        next.add(title);
      }
      return next;
    });
  }

  const selectedCount = selectedPoems.size;

  function selectionStatus(): { label: string; colour: string } {
    if (selectedCount === 0) return { label: "Select at least 3 poems", colour: "text-gray-400" };
    if (selectedCount < 3) return { label: `Select at least 3 poems (${selectedCount} selected)`, colour: "text-red-500" };
    if (selectedCount === 6) return { label: "6 poems is a lot for 1400 words — consider 4 or 5", colour: "text-amber-500" };
    return { label: `${selectedCount} of 3–6 selected`, colour: "text-green-600" };
  }

  async function handleGenerate() {
    if (!poet || !questionId || !gradeTier || selectedCount < 3 || selectedCount > 6) return;
    setGenerating(true);
    setResult(null);
    setApproved(false);
    setReviewerNotes("");

    try {
      const res = await fetch("/api/generate/sample-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          gradeTier,
          poetKey: poet,
          examCycleYear,
          selectedPoems: Array.from(selectedPoems),
        }),
      });
      const json = await res.json();

      if (res.status === 422 && json.status === "validation_failed") {
        setResult({ status: "validation_failed", failures: json.failures, rawAnswer: json.rawAnswer });
      } else if (!res.ok) {
        const msg =
          json.error === "unverified_poems_selected"
            ? `Some selected poems have no verified bank: ${(json.missing ?? []).join(", ")}`
            : json.error === "no_verified_notes" || json.error === "quote_bank_too_thin"
              ? "Quote bank not yet verified for this poet. Upload an anthology scan first."
              : json.error === "pclm_not_seeded"
                ? "No PCLM target seeded for this question. Seed the marking scheme first."
                : json.error === "generation_failed"
                  ? "Generation service temporarily unavailable. Try again in a few seconds."
                  : json.error || "Unknown error";
        setResult({ status: "error", message: msg });
      } else {
        setResult({ status: "success", sampleAnswer: json.sampleAnswer });
      }
    } catch {
      setResult({ status: "error", message: "Network error. Check your connection and try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (result?.status !== "success") return;
    setApproving(true);

    const res = await fetch("/api/generate/sample-answer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: result.sampleAnswer.id, reviewerNotes }),
    });

    setApproving(false);
    if (res.ok) setApproved(true);
  }

  const { label: selLabel, colour: selColour } = selectionStatus();
  const canGenerate = !!poet && !!questionId && !!gradeTier && selectedCount >= 3 && selectedCount <= 6 && !generating;

  return (
    <div className="space-y-6">
      {/* Form card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="space-y-4">

          {/* Exam cycle year */}
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Exam cycle</label>
            <div className="flex gap-3">
              {availableYears.map((y) => (
                <label key={y} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="examCycleYear"
                    value={y}
                    checked={examCycleYear === y}
                    onChange={() => handleYearChange(y)}
                    className="accent-teal"
                  />
                  <span className="text-sm text-navy">{y}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Poet */}
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Poet</label>
            <select
              value={poet}
              onChange={(e) => handlePoetChange(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-navy focus:outline-none focus:border-teal"
            >
              <option value="">Select a poet…</option>
              {filteredPoets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {poet && !filteredPoets.includes(poet) && (
              <p className="text-xs text-amber-600 mt-1">
                This poet is not prescribed for {examCycleYear}. Switch year or choose another poet.
              </p>
            )}
          </div>

          {/* Past question */}
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Past question</label>
            {questionsLoading ? (
              <p className="text-sm text-gray-400">Loading questions…</p>
            ) : questionsError ? (
              <p className="text-sm text-amber-600">{questionsError}</p>
            ) : questions.length > 0 ? (
              <select
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-navy focus:outline-none focus:border-teal"
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.exam_year} — {truncate(q.question_text, 80)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-400">
                {poet ? "No questions available." : "Select a poet first."}
              </p>
            )}
          </div>

          {/* Poem checklist */}
          {poet && (
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Poems to include <span className="text-gray-400 font-normal">(tick 3–6)</span>
              </label>
              {poemsLoading ? (
                <p className="text-sm text-gray-400">Loading poems…</p>
              ) : poems.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {poems.map((poem) => {
                    const checked = selectedPoems.has(poem.title);
                    const atMax = selectedCount >= 6 && !checked;
                    const disabled = !poem.verified || atMax;
                    return (
                      <label
                        key={poem.title}
                        className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${
                          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePoem(poem.title, poem.verified)}
                          className="accent-teal flex-shrink-0"
                        />
                        <span className={checked ? "text-navy font-medium" : "text-gray-700"}>
                          {poem.title}
                          {!poem.verified && (
                            <span className="ml-1 text-gray-400 font-normal"> — bank not verified</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {poems.length > 0 && (
                <p className={`text-xs mt-2 ${selColour}`}>{selLabel}</p>
              )}
            </div>
          )}

          {/* Grade tier */}
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Grade tier</label>
            <div className="flex gap-3">
              {(["H1", "H2", "H3"] as GradeTier[]).map((t) => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gradeTier"
                    value={t}
                    checked={gradeTier === t}
                    onChange={() => setGradeTier(t)}
                    className="accent-teal"
                  />
                  <span className="text-sm text-navy">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="pt-1">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                canGenerate
                  ? "bg-teal text-white hover:bg-teal/90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {generating ? "Generating…" : "Generate"}
            </button>
            {generating && (
              <p className="text-xs text-gray-400 mt-2">
                This takes 15–60 seconds. Claude is writing the answer…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {result?.status === "error" && (
        <div className="bg-white border border-red-200 rounded-lg p-5">
          <p className="text-sm text-red-600">{result.message}</p>
        </div>
      )}

      {/* Validator failed */}
      {result?.status === "validation_failed" && (
        <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">✗</span>
            <h2 className="font-medium text-navy">Validator failed</h2>
          </div>
          <p className="text-sm text-gray-600">
            The generated answer contains {result.failures.length} quote(s) not found in the verified bank.
          </p>
          <ul className="space-y-1">
            {result.failures.map((f, i) => (
              <li key={i} className="text-sm text-red-600">
                &ldquo;{f.quote}&rdquo; — {f.reason}
              </li>
            ))}
          </ul>
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">Show raw answer</summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed">{result.rawAnswer}</pre>
          </details>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded text-sm font-medium bg-teal text-white hover:bg-teal/90 transition-colors"
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      )}

      {/* Success: results panel */}
      {result?.status === "success" && (
        <div className="space-y-4">

          {/* Poems used summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
              Poems used
            </h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-400 w-28 flex-shrink-0">In scope:</span>
                <span className="text-navy">
                  {(result.sampleAnswer.selected_poems ?? []).join(", ") || "—"}
                </span>
              </div>
              {(() => {
                const inScope = new Set(result.sampleAnswer.selected_poems ?? []);
                const quoted = result.sampleAnswer.quotes_used;
                // Derive which poems were actually quoted by checking which selected poems
                // appear in the matched quotes (quotes_used already validated against bank)
                const poemsQuoted = (result.sampleAnswer.selected_poems ?? []).filter((poem) =>
                  quoted.some((q) => q.length > 0)
                );
                // We can't derive exact poem attribution from quotes_used alone without sub_key
                // So just show all that were in scope and note the quote count
                const notQuoted = (result.sampleAnswer.selected_poems ?? []).filter(
                  (poem) => !poemsQuoted.includes(poem)
                );
                return (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-28 flex-shrink-0">Quotes used:</span>
                    <span className="text-navy">{quoted.length} quote{quoted.length !== 1 ? "s" : ""}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* PCLM scores */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
              PCLM scores
            </h2>
            <table className="text-sm w-auto border-collapse">
              <thead>
                <tr>
                  {["P", "C", "L", "M"].map((k) => (
                    <th key={k} className="text-center font-medium text-navy px-4 py-1 border border-gray-100">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(["P", "C", "L", "M"] as const).map((k) => (
                    <td key={k} className="text-center text-teal font-semibold px-4 py-1 border border-gray-100">
                      {result.sampleAnswer.pclm_target[k]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">
              Target for {gradeTier} tier · Model: {result.sampleAnswer.generation_model}
            </p>
          </div>

          {/* Answer text */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Answer</h2>
              <span className="text-xs text-gray-400">{result.sampleAnswer.word_count} words</span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              <p className="text-sm text-navy leading-relaxed whitespace-pre-wrap">
                {result.sampleAnswer.answer_text}
              </p>
            </div>
          </div>

          {/* Validator result */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
              Validator
            </h2>
            <div className="flex items-center gap-2 mb-3">
              {result.sampleAnswer.validator_result.passed ? (
                <>
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm font-medium text-green-700">Pass</span>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-lg">✗</span>
                  <span className="text-sm font-medium text-red-700">Fail</span>
                </>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {result.sampleAnswer.validator_result.coverage_pct}% bank coverage
              </span>
            </div>
            {result.sampleAnswer.quotes_used.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Quotes used ({result.sampleAnswer.quotes_used.length})</p>
                <ul className="space-y-1">
                  {result.sampleAnswer.quotes_used.map((q, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>&ldquo;{q}&rdquo;</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Approve */}
          {!approved ? (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                Approve for publication
              </h2>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Reviewer notes (optional)"
                rows={3}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-navy focus:outline-none focus:border-teal resize-none"
              />
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 rounded text-sm font-medium bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50"
              >
                {approving ? "Approving…" : "Approve for publication"}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-lg">✓</span>
                <span className="text-sm font-medium text-green-700">Approved for publication</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
