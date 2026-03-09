"use client";

import { useState, useRef } from "react";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";

import singleTexts2026 from "@/data/circulars/2026-single-texts.json";
import singleTexts2027 from "@/data/circulars/2027-single-texts.json";

type Level = "HL" | "OL";

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
};

interface SingleTextEntry {
  author: string;
  title: string;
  level: string;
}

const singleTextData: Record<number, SingleTextEntry[]> = {
  2026: singleTexts2026.single_texts,
  2027: singleTexts2027.single_texts,
};

function getTextsForLevel(year: number, level: Level): SingleTextEntry[] {
  const texts = singleTextData[year] || [];
  return texts.filter(
    (t) => t.level === "H/O" || (level === "HL" && t.level === "H") || (level === "OL" && (t.level === "O" || t.level === "H/O"))
  );
}

function inferTextType(title: string, author: string): "shakespeare" | "novel" | "play" {
  if (author === "William Shakespeare") return "shakespeare";
  const playAuthors = [
    "Lorraine Hansberry", "John B. Keane", "Arthur Miller",
    "Marina Carr", "Euripides", "Phillip McMahon", "Laura Wade",
  ];
  if (playAuthors.includes(author)) return "play";
  return "novel";
}

export default function SingleTextPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [selectedText, setSelectedText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const { output, generating, error, searchStatus, generate, stop } =
    useStreamGenerate();

  const availableTexts = getTextsForLevel(year, level);
  const selected = availableTexts.find((t) => t.title === selectedText);

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setSelectedText("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setSelectedText("");
  }

  async function handleGenerate() {
    if (!selected) return;
    await generate({
      year,
      circular: circularNumbers[year],
      level,
      contentType: "single_text",
      author: selected.author,
      textTitle: selected.title,
      textType: inferTextType(selected.title, selected.author),
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
    const filename = `${selected?.author || "note"} - ${selected?.title || "single-text"}.md`.replace(/[/\\?%*:|"<>]/g, "-");
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    const filename = `${selected?.author || "note"} - ${selected?.title || "single-text"}`.replace(/[/\\?%*:|"<>]/g, "-");
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
            Single Text Note Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate exam-aligned study notes for prescribed novels, plays, and Shakespeare texts.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circular Year
              </label>
              <select
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
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
                onChange={(e) => handleLevelChange(e.target.value as Level)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="HL">Higher Level</option>
                <option value="OL">Ordinary Level</option>
              </select>
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text
              </label>
              <select
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="">Select a text</option>
                {availableTexts.map((t) => (
                  <option key={t.title} value={t.title}>
                    {t.title} ({t.author})
                  </option>
                ))}
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
              placeholder='e.g., "Focus on the theme of power", "Include more character analysis for Lady Macbeth"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!selected || generating}
              className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Note"}
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
                  {selected?.title} &ndash; {selected?.author}
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
