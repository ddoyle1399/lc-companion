"use client";

import { useState, useRef } from "react";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";

type Level = "HL" | "OL";
type FocusArea = "question_a" | "question_b" | "both";

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
};

export default function ComprehensionPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [focusArea, setFocusArea] = useState<FocusArea>("both");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const { output, generating, error, searchStatus, generate, stop } =
    useStreamGenerate();

  const focusLabels: Record<FocusArea, string> = {
    question_a: "Question A (Comprehension)",
    question_b: "Question B (Functional Writing)",
    both: "Both Question A and B",
  };

  async function handleGenerate() {
    await generate({
      year,
      circular: circularNumbers[year],
      level,
      contentType: "comprehension",
      focusArea,
      userInstructions: instructions || undefined,
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  }

  function handleDownloadMarkdown() {
    const filename = `Comprehension Guide - ${focusLabels[focusArea]} - ${level} ${year}.md`;
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    const filename = `Comprehension Guide - ${focusLabels[focusArea]} - ${level} ${year}`;
    await exportToWord(output, filename);
  }

  function handleDownloadPDF() {
    exportToPDF();
  }

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 no-print">
          <h1 className="text-2xl font-semibold text-navy">
            Comprehension Guide Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate skills guides for Paper 1 comprehension (Question A) and functional writing (Question B).
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circular Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Circular {circularNumbers[year]}
              </p>
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="HL">Higher Level</option>
                <option value="OL">Ordinary Level</option>
              </select>
            </div>

            {/* Focus Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Focus Area
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value as FocusArea)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="both">Both Question A and B</option>
                <option value="question_a">Question A (Comprehension)</option>
                <option value="question_b">Question B (Functional Writing)</option>
              </select>
            </div>
          </div>

          {/* Additional instructions */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Instructions{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
              placeholder='e.g., "Focus on language analysis questions", "Include more sample responses"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Guide"}
            </button>
            {generating && (
              <button
                onClick={stop}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm no-print">
            {error}
          </div>
        )}

        {/* Output */}
        {(output || generating) && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 no-print">
              <div>
                <h2 className="font-medium text-navy text-sm">
                  {focusLabels[focusArea]} &ndash; {level} {year}
                </h2>
                {generating && (
                  <p className="text-xs text-teal mt-0.5">
                    {searchStatus || "Generating..."}
                  </p>
                )}
              </div>
              {output && !generating && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    .md
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    .docx
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>

            <div
              ref={outputRef}
              className="px-5 py-4 prose max-w-none text-sm leading-relaxed whitespace-pre-wrap"
            >
              {output || (
                <span className="text-gray-400">Waiting for response...</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
