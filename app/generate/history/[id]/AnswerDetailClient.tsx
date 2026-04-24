"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SampleAnswerFull } from "@/lib/export/sampleAnswer";
import { toPlainText, toHtml } from "@/lib/export/sampleAnswer";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pclmLine(pclm: { P: number; C: number; L: number; M: number } | null): string {
  if (!pclm) return "N/A";
  return `P ${pclm.P} · C ${pclm.C} · L ${pclm.L} · M ${pclm.M}`;
}

export default function AnswerDetailClient({ answer }: { answer: SampleAnswerFull }) {
  const router = useRouter();
  const [copyPlainLabel, setCopyPlainLabel] = useState("Copy plain text");
  const [copyHtmlLabel, setCopyHtmlLabel] = useState("Copy HTML");
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(answer.approved);

  async function handleCopyPlain() {
    const text = toPlainText(answer);
    await navigator.clipboard.writeText(text);
    setCopyPlainLabel("Copied!");
    setTimeout(() => setCopyPlainLabel("Copy plain text"), 2000);
  }

  async function handleCopyHtml() {
    const htmlStr = toHtml(answer);
    const plainStr = toPlainText(answer);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlStr], { type: "text/html" }),
          "text/plain": new Blob([plainStr], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(plainStr);
    }
    setCopyHtmlLabel("Copied!");
    setTimeout(() => setCopyHtmlLabel("Copy HTML"), 2000);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this sample answer? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/generate/sample-answer?id=${answer.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/generate/history");
    } else {
      alert("Delete failed. Please try again.");
      setDeleting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    const res = await fetch("/api/generate/sample-answer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: answer.id }),
    });
    if (res.ok) {
      setApproved(true);
    } else {
      alert("Approve failed.");
    }
    setApproving(false);
  }

  const poems = answer.selected_poems?.join(", ") ?? "N/A";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/generate/history" className="text-sm text-teal-700 hover:underline">
          ← Back to history
        </Link>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
        {/* Question */}
        <div className="px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Question</h2>
          <p className="text-sm font-semibold text-navy mb-1">
            {answer.question.exam_year ?? "Unknown year"}, Higher Level Paper 2
          </p>
          <p className="text-sm text-gray-800">{answer.question.question_text}</p>
        </div>

        {/* Metadata */}
        <div className="px-5 py-4 space-y-1 text-sm text-gray-700">
          <p><span className="font-medium">Poet:</span> {answer.question.subject_key}</p>
          <p><span className="font-medium">Grade tier:</span> {answer.grade_tier}</p>
          <p>
            <span className="font-medium">Generated:</span>{" "}
            {formatDate(answer.generated_at)} · {answer.generation_model ?? "Claude"} · {answer.word_count} w
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            {approved ? (
              <span className="text-green-700 font-medium">Approved</span>
            ) : (
              <span className="text-gray-500">Pending review</span>
            )}
          </p>
          <p><span className="font-medium">PCLM target:</span> {pclmLine(answer.pclm_target)}</p>
          <p><span className="font-medium">Selected poems:</span> {poems}</p>
        </div>

        {/* Answer */}
        <div className="px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Answer</h2>
          <div className="text-sm text-gray-800 space-y-4 whitespace-pre-wrap leading-relaxed">
            {answer.answer_text.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex flex-wrap gap-3">
          <button
            onClick={handleCopyPlain}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {copyPlainLabel}
          </button>
          <button
            onClick={handleCopyHtml}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {copyHtmlLabel}
          </button>
          {!approved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {approving ? "Approving…" : "Approve"}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors ml-auto"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
