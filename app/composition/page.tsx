"use client";

import { useState, useRef } from "react";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";
import {
  GENRES,
  GUIDE_TYPES,
  type CompositionGenre,
  type CompositionGuideType,
} from "@/lib/composition/genres";

type Level = "HL" | "OL";

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
  2028: "0024/2026",
};

export default function CompositionPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [genre, setGenre] = useState<CompositionGenre>("personal_essay");
  const [guideType, setGuideType] = useState<CompositionGuideType>("overview");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const { output, generating, error, generate, stop } = useStreamGenerate();

  const genreMeta = GENRES.find((g) => g.key === genre)!;
  const guideMeta = GUIDE_TYPES.find((g) => g.key === guideType)!;
  const titleRequired = guideMeta.needsTitle;
  const canGenerate =
    !!genre && !!guideType && (!titleRequired || title.trim().length > 0) && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    await generate({
      year,
      circular: circularNumbers[year],
      level,
      contentType: "composition",
      compositionGenre: genre,
      compositionGuideType: guideType,
      compositionTitle: titleRequired ? title.trim() : undefined,
      userInstructions: instructions || undefined,
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function fileName(): string {
    const base = `${genreMeta.shortLabel} - ${guideMeta.shortLabel}`;
    const t = title.trim();
    return t ? `${base} - ${t}` : base;
  }

  function handleDownloadMarkdown() {
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    await exportToWord(output, fileName());
  }

  function handleDownloadPDF() {
    exportToPDF();
  }

  return (
    <main className="px-10 lg:px-14 py-10 lg:py-14 max-w-[1400px]">

      {/* Header */}
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
          Paper 1 · Section II · Composition (100 marks)
        </p>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
          Composition guides
        </h1>
        <p className="text-[14px] text-slate-500 mt-1.5 max-w-2xl">
          Pick a composition genre, then pick the kind of guide you want. Use these to teach
          students how each genre works, what makes one strong, and how to plan a real title.
        </p>
      </header>

      {/* Step 1: Genre */}
      <section className="mb-8">
        <SectionLabel step="1">Pick a genre</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {GENRES.map((g) => {
            const selected = g.key === genre;
            return (
              <button
                key={g.key}
                onClick={() => setGenre(g.key)}
                className={`text-left rounded-xl p-4 transition-all ${
                  selected
                    ? "bg-teal/10 ring-2 ring-teal"
                    : "bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className={`text-[13.5px] font-semibold tracking-tight ${selected ? "text-teal" : "text-slate-900"}`}>
                  {g.label}
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-snug">{g.oneLiner}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Guide type */}
      <section className="mb-8">
        <SectionLabel step="2">Pick a guide type</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUIDE_TYPES.map((gt) => {
            const selected = gt.key === guideType;
            return (
              <button
                key={gt.key}
                onClick={() => setGuideType(gt.key)}
                className={`text-left rounded-xl p-4 transition-all ${
                  selected
                    ? "bg-teal/10 ring-2 ring-teal"
                    : "bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className={`text-[13.5px] font-semibold tracking-tight ${selected ? "text-teal" : "text-slate-900"}`}>
                  {gt.label}
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-snug">{gt.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Title (if guide type needs one) + level/year + instructions */}
      <section className="mb-8 bg-white rounded-2xl ring-1 ring-slate-200 p-6">
        {titleRequired && (
          <div className="mb-5">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
              Title to plan for
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. "${suggestedTitle(genre)}"`}
              className="w-full px-4 py-2.5 text-[14px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
            <p className="text-[12px] text-slate-500 mt-1.5">
              Give the exact title you want planned. The guide will walk through reading the title, the 5-minute plan, and a paragraph-by-paragraph structure.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-[14px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="w-full px-3 py-2.5 text-[14px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            >
              <option value="HL">Higher Level</option>
              <option value="OL">Ordinary Level</option>
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-[12px] text-slate-500 leading-snug">
              <span className="font-semibold text-slate-700">{genreMeta.label}</span> · {guideMeta.label}
              <br />
              <span className="text-slate-400">{genreMeta.targetLength}</span>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
            Additional instructions <span className="font-normal text-slate-400 normal-case">(optional)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder='e.g. "Pitched for a mixed-ability class", "Focus on the closing paragraph"'
            className="w-full px-4 py-2.5 text-[14px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="px-5 py-2.5 bg-teal text-white text-[14px] font-medium rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {generating ? "Generating..." : `Generate ${guideMeta.shortLabel}`}
          </button>
          {generating && (
            <button
              onClick={stop}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-[14px] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Stop
            </button>
          )}
          {!canGenerate && titleRequired && !title.trim() && (
            <p className="text-[12px] text-slate-500">Enter a title above to enable.</p>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Output */}
      {(output || generating) && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 mb-10">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                {genreMeta.label} · {guideMeta.label}
              </h2>
              {title && <p className="text-[12px] text-slate-500 mt-0.5">Title: {title}</p>}
            </div>
            {output && !generating && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-[12px] px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button onClick={handleDownloadMarkdown} className="text-[12px] px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">.md</button>
                <button onClick={handleDownloadWord} className="text-[12px] px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">.docx</button>
                <button onClick={handleDownloadPDF} className="text-[12px] px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">PDF</button>
              </div>
            )}
          </div>
          <div ref={outputRef} className="px-6 py-5 prose max-w-none text-[14px] leading-relaxed whitespace-pre-wrap">
            {output || <span className="text-slate-400">Generating...</span>}
          </div>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal text-white text-[11px] font-bold">
        {step}
      </span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
        {children}
      </h2>
    </div>
  );
}

/** Suggest a realistic LC-style title placeholder for the chosen genre. */
function suggestedTitle(genre: CompositionGenre): string {
  switch (genre) {
    case "personal_essay":
      return "Write a personal essay about a place that has shaped you.";
    case "short_story":
      return "Write a short story in which a stranger arrives at the door.";
    case "speech":
      return "Write the text of a speech to your school's graduating class.";
    case "discursive_essay":
      return "Discuss the role social media plays in modern friendship.";
    case "feature_article":
      return "Write a feature article on the future of small-town Ireland.";
    case "descriptive_essay":
      return "Describe a market early in the morning.";
    case "diary_entry":
      return "Write three diary entries from a soldier's first week at war.";
    case "letter":
      return "Write an open letter to a public figure you disagree with.";
    case "talk_podcast":
      return "Write the script of a podcast episode on the music that defined your generation.";
    case "memoir":
      return "Write a piece of memoir about the year you were ten.";
  }
}
