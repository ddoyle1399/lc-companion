"use client";

import { useState } from "react";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";

import comp2026 from "@/data/circulars/2026-comparative.json";
import comp2027 from "@/data/circulars/2027-comparative.json";
import comp2028 from "@/data/circulars/2028-comparative.json";

type Level = "HL" | "OL";

interface TextOption {
  title: string;
  author?: string;
  director?: string;
  category: "Novel" | "Drama" | "Film";
}

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
  2028: "0024/2026",
};

const compData: Record<number, typeof comp2026> = {
  2026: comp2026,
  2027: comp2027,
  2028: comp2028 as unknown as typeof comp2026,
};

function getModes(year: number, level: Level): string[] {
  const data = compData[year];
  if (!data) return [];
  return level === "HL"
    ? data.comparative_modes_HL
    : data.comparative_modes_OL;
}

function getTextOptions(year: number): TextOption[] {
  const data = compData[year];
  if (!data) return [];
  const options: TextOption[] = [];

  for (const t of data.novels_memoirs) {
    options.push({ title: t.title, author: t.author, category: "Novel" });
  }
  for (const t of data.drama) {
    options.push({ title: t.title, author: t.author, category: "Drama" });
  }
  for (const t of data.film) {
    const f = t as { title: string; director?: string; author?: string };
    options.push({
      title: f.title,
      director: f.director,
      author: f.author,
      category: "Film",
    });
  }

  return options;
}

function formatOption(t: TextOption): string {
  if (t.director) {
    return `${t.title} dir. ${t.director} (${t.category})`;
  }
  return `${t.title} by ${t.author} (${t.category})`;
}

export default function ComparativePage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [mode, setMode] = useState("");
  const [text1Key, setText1Key] = useState("");
  const [text2Key, setText2Key] = useState("");
  const [text3Key, setText3Key] = useState("");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);

  const { output, generating, error, searchStatus, generate, stop } =
    useStreamGenerate();

  const modes = getModes(year, level);
  const textOptions = getTextOptions(year);

  // Group texts by category for optgroup
  const novels = textOptions.filter((t) => t.category === "Novel");
  const drama = textOptions.filter((t) => t.category === "Drama");
  const films = textOptions.filter((t) => t.category === "Film");

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setMode("");
    setText1Key("");
    setText2Key("");
    setText3Key("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setMode("");
  }

  function findTextByKey(key: string): TextOption | undefined {
    return textOptions.find((t) => `${t.title}::${t.author || t.director}` === key);
  }

  const selectedTexts = [
    findTextByKey(text1Key),
    findTextByKey(text2Key),
    findTextByKey(text3Key),
  ].filter(Boolean) as TextOption[];

  const filmCount = selectedTexts.filter((t) => t.category === "Film").length;
  const filmWarning = filmCount > 1;
  const canGenerate =
    mode && selectedTexts.length === 3 && !filmWarning && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;

    const comparativeTexts = selectedTexts.map((t) => ({
      title: t.title,
      author: t.author,
      director: t.director,
      category: t.category,
    }));

    await generate({
      year,
      circular: circularNumbers[year],
      level,
      contentType: "comparative",
      comparativeMode: mode,
      comparativeTexts,
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
    const filename = `Comparative - ${mode}.md`.replace(/[/\\?%*:|"<>]/g, "-");
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    const filename = `Comparative - ${mode}`.replace(/[/\\?%*:|"<>]/g, "-");
    await exportToWord(output, filename);
  }

  function renderTextSelect(
    value: string,
    onChange: (val: string) => void,
    label: string
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
        >
          <option value="">Select a text</option>
          <optgroup label="Novels / Memoirs">
            {novels.map((t) => {
              const key = `${t.title}::${t.author || t.director}`;
              return (
                <option key={key} value={key}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Drama">
            {drama.map((t) => {
              const key = `${t.title}::${t.author || t.director}`;
              return (
                <option key={key} value={key}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Film">
            {films.map((t) => {
              const key = `${t.title}::${t.author || t.director}`;
              return (
                <option key={key} value={key}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
        </select>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 no-print">
          <h1 className="text-2xl font-semibold text-navy">
            Comparative Note Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate comparative study notes across prescribed texts.
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
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
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

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comparative Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="">Select a mode</option>
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Text selectors */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {renderTextSelect(text1Key, setText1Key, "Text 1")}
            {renderTextSelect(text2Key, setText2Key, "Text 2")}
            {renderTextSelect(text3Key, setText3Key, "Text 3")}
          </div>

          {filmWarning && (
            <p className="text-sm text-red-600 mt-2">
              Maximum of 1 film allowed in the comparative study.
            </p>
          )}

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
              placeholder='e.g., "Focus on the role of family in all three texts", "Include more quotes from the film"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
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
                <h2 className="font-medium text-navy text-sm">{mode}</h2>
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
                    onClick={() => exportToPDF()}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-4 prose max-w-none text-sm leading-relaxed whitespace-pre-wrap">
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
