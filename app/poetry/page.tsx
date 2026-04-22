"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";

// Import circular data statically for client-side use
import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";
import { QuestionOutlines } from "@/components/QuestionOutlines";

type Level = "HL" | "OL";

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
};

const hlData: Record<number, { poets: Record<string, string[]> }> = {
  2026: poetryHL2026,
  2027: poetryHL2027,
};

const olData: Record<number, { poems: { poet: string; title: string }[] }> = {
  2026: poetryOL2026,
  2027: poetryOL2027,
};

function getPoets(year: number, level: Level): string[] {
  if (level === "HL") {
    const data = hlData[year];
    return data ? Object.keys(data.poets).sort() : [];
  }
  const data = olData[year];
  return data ? [...new Set(data.poems.map((p) => p.poet))].sort() : [];
}

function getPoems(year: number, level: Level, poet: string): string[] {
  if (level === "HL") {
    const data = hlData[year];
    return data ? (data.poets[poet] || []) : [];
  }
  const data = olData[year];
  return data
    ? data.poems.filter((p) => p.poet === poet).map((p) => p.title)
    : [];
}

export default function PoetryPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [poet, setPoet] = useState("");
  const [poem, setPoem] = useState("");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    output,
    generating,
    textStreamComplete,
    stageLabel,
    error,
    generate,
    stop,
    noteId,
    outlinesStatus,
    outlinesSaveStatus,
  } = useStreamGenerate();

  const poets = getPoets(year, level);
  const poems = poet ? getPoems(year, level, poet) : [];

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setPoet("");
    setPoem("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setPoet("");
    setPoem("");
  }

  function handlePoetChange(newPoet: string) {
    setPoet(newPoet);
    setPoem("");
  }

  async function handleGenerate() {
    if (!poet || !poem) return;
    await generate({
      year,
      circular: circularNumbers[year],
      level,
      contentType: "poetry",
      poet,
      poem,
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
    const filename = `${poet} - ${poem}.md`.replace(/[/\\?%*:|"<>]/g, "-");
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    const filename = `${poet} - ${poem}`.replace(/[/\\?%*:|"<>]/g, "-");
    await exportToWord(output, filename);
  }

  function handleDownloadPDF() {
    exportToPDF();
  }

  function handleGenerateVideo() {
    // Store the note in sessionStorage so the video page can read it
    sessionStorage.setItem("lc-video-note", output);
    const params = new URLSearchParams({
      year: String(year),
      level,
      poet,
      poem,
    });
    router.push(`/video?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 no-print">
          <h1 className="text-2xl font-semibold text-navy">
            Poetry Note Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate exam-aligned poetry analysis notes for prescribed poems.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Poet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poet
              </label>
              <select
                value={poet}
                onChange={(e) => handlePoetChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="">Select a poet</option>
                {poets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Poem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poem
              </label>
              <select
                value={poem}
                onChange={(e) => setPoem(e.target.value)}
                disabled={!poet}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">
                  {poet ? "Select a poem" : "Select a poet first"}
                </option>
                {poems.map((p) => (
                  <option key={p} value={p}>
                    {p}
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
              placeholder='e.g., "Focus on imagery and memory", "This is for a mixed-ability class", "OL level explanation"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!poet || !poem || generating}
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
            {/* Output header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 no-print">
              <div>
                <h2 className="font-medium text-navy text-sm">
                  {poet} &ndash; {poem}
                </h2>
                {generating && stageLabel && (
                  <p className="text-xs text-teal mt-0.5">{stageLabel}</p>
                )}
              </div>
              {output && textStreamComplete && (
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
                  <button
                    onClick={handleGenerateVideo}
                    disabled={generating}
                    className="text-sm px-3 py-1.5 border border-teal text-teal rounded-md hover:bg-teal/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Video
                  </button>
                </div>
              )}
            </div>

            {/* Output content */}
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

        {/* Outline loading: note saved but outlines not yet confirmed */}
        {noteId && !outlinesSaveStatus && (
          <p className="text-xs text-teal mt-3">
            Matching past exam questions...
          </p>
        )}

        {/* Empty case: no past questions for this subject */}
        {noteId && outlinesSaveStatus && outlinesStatus?.note === "no_past_questions" && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg px-5 py-4 text-sm text-gray-500">
            This poet has not appeared on the SEC paper in recent years.
          </div>
        )}

        {/* Outlines ready */}
        {noteId && outlinesSaveStatus?.ok && outlinesStatus?.note !== "no_past_questions" && (
          <div className="mt-6">
            <QuestionOutlines noteId={noteId} />
          </div>
        )}
      </main>
    </div>
  );
}
