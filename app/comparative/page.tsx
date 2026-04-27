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
type Depth = "quick" | "standard" | "deep";

type NoteType =
  | "mode_grid"
  | "text_full_breakdown"
  | "text_character"
  | "text_key_moments"
  | "text_mode_profile"
  | "text_relationships"
  | "text_quote_bank"
  | "comparison_grid_table"
  | "comparative_argument"
  | "sample_paragraph"
  | "question_plan"
  | "sample_answer";

type QuestionFormat = "Q1a_30" | "Q1b_40" | "Q2_70";

interface NoteTypeMeta {
  id: NoteType;
  family: "single" | "cross" | "question";
  label: string;
  blurb: string;
  needsTexts: 1 | 3;
  needsMode: boolean;
  needsCharacterName: boolean;
  needsArgumentFocus: boolean;
  needsQuestion: boolean;
}

const NOTE_TYPES: NoteTypeMeta[] = [
  // Single-text family
  {
    id: "text_full_breakdown",
    family: "single",
    label: "Full text breakdown",
    blurb:
      "One text. Plot, characters, themes, key moments, all four mode profiles, quote bank. The canonical reference per text.",
    needsTexts: 1,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "text_key_moments",
    family: "single",
    label: "Key moments",
    blurb:
      "One text. 6-8 key moments, each tagged to all four modes. The spine of every elite comparative answer.",
    needsTexts: 1,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "text_character",
    family: "single",
    label: "Character study",
    blurb:
      "One text + one character. Role, social position, mindset, freedoms, contradictions, arc, mode-relevance tags.",
    needsTexts: 1,
    needsMode: false,
    needsCharacterName: true,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "text_relationships",
    family: "single",
    label: "Relationship map",
    blurb:
      "One text. 5-8 relationships profiled with mode-relevance tags and comparison hooks.",
    needsTexts: 1,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "text_mode_profile",
    family: "single",
    label: "Single-text mode profile",
    blurb:
      "One text + one mode. Deep axis-by-axis profile (e.g. Cultural Context in Hamnet across all 5 axes).",
    needsTexts: 1,
    needsMode: true,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "text_quote_bank",
    family: "single",
    label: "Quote bank",
    blurb:
      "One text. 30-40 verified quotes organised by character and theme, with mode tags.",
    needsTexts: 1,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  // Cross-text family
  {
    id: "mode_grid",
    family: "cross",
    label: "5-section comparative note",
    blurb:
      "3 texts + mode. Mode overview, 4-5 comparative arguments, comparison anchors, key quotes, sample paragraph.",
    needsTexts: 3,
    needsMode: true,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "comparison_grid_table",
    family: "cross",
    label: "Comparison grid (table)",
    blurb:
      "3 texts + mode. Visual grid of texts vs mode axes. The working document teachers actually use.",
    needsTexts: 3,
    needsMode: true,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: false,
  },
  {
    id: "comparative_argument",
    family: "cross",
    label: "Single comparative argument",
    blurb:
      "3 texts + mode + your angle. One argument developed in depth across all three texts.",
    needsTexts: 3,
    needsMode: true,
    needsCharacterName: false,
    needsArgumentFocus: true,
    needsQuestion: false,
  },
  {
    id: "sample_paragraph",
    family: "cross",
    label: "Sample paragraph",
    blurb:
      "3 texts + mode + your angle. One model paragraph with sustained comparative weave, plus annotation.",
    needsTexts: 3,
    needsMode: true,
    needsCharacterName: false,
    needsArgumentFocus: true,
    needsQuestion: false,
  },
  // Question-driven family
  {
    id: "question_plan",
    family: "question",
    label: "Exam answer plan",
    blurb:
      "Paste an SEC question + 3 texts + format (30/40/70). Get a structured plan: thesis, body paragraphs, link sentences, conclusion, word target.",
    needsTexts: 3,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: true,
  },
  {
    id: "sample_answer",
    family: "question",
    label: "H1 sample answer",
    blurb:
      "Paste an SEC question + 3 texts + format. Full sample answer at H1 tier (90+ band) with annotation and PCLM self-assessment.",
    needsTexts: 3,
    needsMode: false,
    needsCharacterName: false,
    needsArgumentFocus: false,
    needsQuestion: true,
  },
];

const FAMILY_LABELS: Record<NoteTypeMeta["family"], string> = {
  single: "Per single text",
  cross: "Across three texts",
  question: "Driven by an exam question",
};

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
  return level === "HL" ? data.comparative_modes_HL : data.comparative_modes_OL;
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
  if (t.director) return `${t.title} dir. ${t.director} (${t.category})`;
  return `${t.title} by ${t.author} (${t.category})`;
}

function textKey(t: TextOption): string {
  return `${t.title}::${t.author || t.director}`;
}

export default function ComparativePage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [noteType, setNoteType] = useState<NoteType>("mode_grid");
  const [mode, setMode] = useState("");
  const [text1Key, setText1Key] = useState("");
  const [text2Key, setText2Key] = useState("");
  const [text3Key, setText3Key] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [argumentFocus, setArgumentFocus] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionFormat, setQuestionFormat] = useState<QuestionFormat>("Q2_70");
  const [depth, setDepth] = useState<Depth>("standard");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);

  const { output, generating, error, searchStatus, generate, stop } =
    useStreamGenerate();

  const meta = NOTE_TYPES.find((n) => n.id === noteType)!;
  const modes = getModes(year, level);
  const textOptions = getTextOptions(year);
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

  function handleNoteTypeChange(newType: NoteType) {
    setNoteType(newType);
    // Reset transient fields that may not apply to the new type.
    setCharacterName("");
    setArgumentFocus("");
    setQuestionText("");
  }

  function findTextByKey(key: string): TextOption | undefined {
    return textOptions.find((t) => textKey(t) === key);
  }

  const text1 = findTextByKey(text1Key);
  const text2 = findTextByKey(text2Key);
  const text3 = findTextByKey(text3Key);

  const selectedTexts =
    meta.needsTexts === 1
      ? [text1].filter(Boolean)
      : [text1, text2, text3].filter(Boolean);

  const filmCount = (selectedTexts as TextOption[]).filter(
    (t) => t.category === "Film"
  ).length;
  const filmWarning = meta.needsTexts === 3 && filmCount > 1;

  const allTextsPicked =
    meta.needsTexts === 1 ? !!text1 : !!text1 && !!text2 && !!text3;
  const modeOk = !meta.needsMode || !!mode;
  const characterOk = !meta.needsCharacterName || !!characterName.trim();
  const argumentOk = !meta.needsArgumentFocus || !!argumentFocus.trim();
  const questionOk = !meta.needsQuestion || !!questionText.trim();
  const canGenerate =
    allTextsPicked &&
    modeOk &&
    characterOk &&
    argumentOk &&
    questionOk &&
    !filmWarning &&
    !generating;

  async function handleGenerate() {
    if (!canGenerate) return;

    const comparativeTexts = (selectedTexts as TextOption[]).map((t) => ({
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
      comparativeNoteType: noteType,
      comparativeMode: meta.needsMode ? mode : undefined,
      comparativeTexts,
      comparativeCharacterName: meta.needsCharacterName
        ? characterName.trim()
        : undefined,
      comparativeArgumentFocus: meta.needsArgumentFocus
        ? argumentFocus.trim()
        : undefined,
      comparativeQuestionText: meta.needsQuestion
        ? questionText.trim()
        : undefined,
      comparativeQuestionFormat: meta.needsQuestion ? questionFormat : undefined,
      comparativeDepth: depth,
      userInstructions: instructions || undefined,
    });
  }

  function fileLabel(): string {
    if (meta.needsTexts === 1 && text1) {
      return `${text1.title} - ${meta.label}`;
    }
    if (meta.needsTexts === 3 && text1 && text2 && text3) {
      return `${meta.label} - ${text1.title}, ${text2.title}, ${text3.title}`;
    }
    return `Comparative - ${meta.label}`;
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
    const filename = `${fileLabel()}.md`.replace(/[/\\?%*:|"<>]/g, "-");
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    const filename = fileLabel().replace(/[/\\?%*:|"<>]/g, "-");
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
              const k = textKey(t);
              return (
                <option key={k} value={k}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Drama">
            {drama.map((t) => {
              const k = textKey(t);
              return (
                <option key={k} value={k}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Film">
            {films.map((t) => {
              const k = textKey(t);
              return (
                <option key={k} value={k}>
                  {formatOption(t)}
                </option>
              );
            })}
          </optgroup>
        </select>
      </div>
    );
  }

  function renderNoteTypeFamily(family: NoteTypeMeta["family"]) {
    const items = NOTE_TYPES.filter((n) => n.family === family);
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {FAMILY_LABELS[family]}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((n) => {
            const selected = n.id === noteType;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNoteTypeChange(n.id)}
                className={`text-left border rounded-md px-3 py-2 transition-colors ${
                  selected
                    ? "border-teal bg-teal/10"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <div className="text-sm font-medium text-navy">{n.label}</div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">
                  {n.blurb}
                </div>
              </button>
            );
          })}
        </div>
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
            Twelve note types across the LC Comparative Study. Pick a type, fill
            the inputs, generate.
          </p>
        </div>

        {/* Year + Level controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Note type picker */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 no-print">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Note Type
          </label>
          {renderNoteTypeFamily("single")}
          {renderNoteTypeFamily("cross")}
          {renderNoteTypeFamily("question")}
        </div>

        {/* Dynamic inputs */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 no-print">
          {/* Mode (when needed) */}
          {meta.needsMode && (
            <div className="mb-4">
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
          )}

          {/* Text pickers */}
          {meta.needsTexts === 1 && (
            <div className="mb-4">
              {renderTextSelect(text1Key, setText1Key, "Text")}
            </div>
          )}
          {meta.needsTexts === 3 && (
            <>
              <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {renderTextSelect(text1Key, setText1Key, "Text 1")}
                {renderTextSelect(text2Key, setText2Key, "Text 2")}
                {renderTextSelect(text3Key, setText3Key, "Text 3")}
              </div>
              {filmWarning && (
                <p className="text-sm text-red-600 mt-1 mb-3">
                  Maximum of 1 film allowed in the comparative study.
                </p>
              )}
            </>
          )}

          {/* Character name (text_character) */}
          {meta.needsCharacterName && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Character Name
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. Lady Macbeth, John Proctor, Hamnet"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>
          )}

          {/* Argument focus (comparative_argument, sample_paragraph) */}
          {meta.needsArgumentFocus && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Argument Focus / Angle
              </label>
              <input
                type="text"
                value={argumentFocus}
                onChange={(e) => setArgumentFocus(e.target.value)}
                placeholder='e.g. "the role of social class in determining freedom", "the ending and how it shapes the vision"'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Specific angle within the chosen mode. The more specific, the
                sharper the output.
              </p>
            </div>
          )}

          {/* Question + format (question_plan, sample_answer) */}
          {meta.needsQuestion && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Format
                </label>
                <select
                  value={questionFormat}
                  onChange={(e) =>
                    setQuestionFormat(e.target.value as QuestionFormat)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  <option value="Q1a_30">Q1(a) - 30 marks - one text</option>
                  <option value="Q1b_40">Q1(b) - 40 marks - two texts</option>
                  <option value="Q2_70">Q2 - 70 marks - all three texts</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Question (verbatim)
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  placeholder='Paste the SEC question, e.g. "Compare the extent to which divisions are encouraged in subtle rather than obvious ways, in order to maintain control and power successfully."'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
                />
              </div>
            </>
          )}

          {/* Depth */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Depth
            </label>
            <div className="flex gap-3 flex-wrap">
              {(["quick", "standard", "deep"] as Depth[]).map((d) => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="comparativeDepth"
                    value={d}
                    checked={depth === d}
                    onChange={() => setDepth(d)}
                    className="accent-teal"
                  />
                  <span className="text-sm text-navy capitalize">{d}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Quick = 600-800 words, the essentials. Standard = 1300-1600 words, the working note. Deep = 2000-2500 words, flagship resource with essay-language section and a worked top-band paragraph.
            </p>
          </div>

          {/* Additional instructions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Instructions{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
              placeholder='e.g. "Tilt the analysis towards gender", "Class is a mixed-ability HL group"'
            />
          </div>

          {/* Generate button */}
          <div className="flex gap-2">
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
                <h2 className="font-medium text-navy text-sm">{meta.label}</h2>
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
