"use client";

import { useEffect, useState } from "react";
import type { OutlineBodyMove } from "@/lib/claude/generateOutline";

interface PastQuestion {
  question_text: string;
  exam_year: number | null;
  level: string;
  section: string | null;
}

interface QuestionOutline {
  id: string;
  thesis_line: string;
  body_moves: OutlineBodyMove[];
  closing_move: string;
  examiner_note: string | null;
  approved: boolean;
  generation_model: string | null;
  past_questions: PastQuestion | PastQuestion[];
}

interface Props {
  noteId: string;
}

export function QuestionOutlines({ noteId }: Props) {
  const [outlines, setOutlines] = useState<QuestionOutline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOutlines() {
      try {
        const res = await fetch(`/api/outlines?noteId=${noteId}`);
        if (!res.ok) throw new Error("Failed to fetch outlines");
        const data: QuestionOutline[] = await res.json();
        setOutlines(data);
      } catch {
        // silent fail — outline section simply won't render
      } finally {
        setLoading(false);
      }
    }
    fetchOutlines();
  }, [noteId]);

  if (loading) {
    return (
      <p className="text-xs text-gray-400">Loading past exam outlines...</p>
    );
  }

  if (outlines.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 text-sm text-gray-500">
        This poet has not appeared on the SEC paper in recent years.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      {outlines.map((outline, index) => {
        const q = Array.isArray(outline.past_questions)
          ? outline.past_questions[0]
          : outline.past_questions;
        const levelLabel = q.level === "higher" ? "HL" : "OL";
        const headerParts = [
          q.exam_year ? String(q.exam_year) : null,
          levelLabel,
          q.section ?? null,
        ].filter(Boolean);

        return (
          <div key={outline.id}>
            {index > 0 && <div className="border-t border-gray-200 mt-6 pt-6" />}

            {/* Question header */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Past Exam Question &middot; {headerParts.join(" · ")}
            </p>
            <p className="text-sm font-semibold text-navy mb-4">
              {q.question_text}
            </p>

            {/* Thesis */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4 mb-1">
              Thesis
            </p>
            <p className="text-sm">{outline.thesis_line}</p>

            {/* Body moves */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4 mb-2">
              Body Moves
            </p>
            <ol className="space-y-3">
              {outline.body_moves.map((move, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-navy">
                    {i + 1}. {move.move}
                  </span>
                  <blockquote className="border-l-2 border-teal pl-3 italic text-gray-600 my-1 text-sm">
                    &ldquo;{move.quote}&rdquo;
                  </blockquote>
                  <p className="text-gray-700">{move.gloss}</p>
                </li>
              ))}
            </ol>

            {/* Closing move */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-4 mb-1">
              Closing Move
            </p>
            <p className="text-sm">{outline.closing_move}</p>

            {/* Examiner note */}
            {outline.examiner_note && (
              <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800 mt-3">
                <span className="font-semibold">Examiner note: </span>
                {outline.examiner_note}
              </div>
            )}

            {/* Approved status */}
            {!outline.approved && (
              <span className="inline-flex items-center bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full mt-4">
                approved: false
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
