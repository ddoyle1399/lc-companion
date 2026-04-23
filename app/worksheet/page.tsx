"use client";

import { useState } from "react";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToWord } from "@/lib/export/word";
import { exportToPDF } from "@/lib/export/pdf";

import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";
import poetryHL2028 from "@/data/circulars/2028-poetry-hl.json";
import poetryOL2028 from "@/data/circulars/2028-poetry-ol.json";
import singleTexts2026 from "@/data/circulars/2026-single-texts.json";
import singleTexts2027 from "@/data/circulars/2027-single-texts.json";
import singleTexts2028 from "@/data/circulars/2028-single-texts.json";
import comp2026 from "@/data/circulars/2026-comparative.json";
import comp2027 from "@/data/circulars/2027-comparative.json";
import comp2028 from "@/data/circulars/2028-comparative.json";

type Level = "HL" | "OL";
type WorksheetContentType = "poetry" | "single_text" | "comparative" | "unseen_poetry" | "comprehension" | "composition";

type CompositionType = "personal_essay" | "short_story" | "speech" | "discursive" | "feature_article" | "descriptive";

const compositionTypeLabels: Record<CompositionType, string> = {
  personal_essay: "Personal Essay",
  short_story: "Short Story",
  speech: "Speech",
  discursive: "Discursive Essay",
  feature_article: "Feature Article",
  descriptive: "Descriptive Essay",
};

interface TextOption {
  title: string;
  author?: string;
  director?: string;
  category: string;
}

const circularNumbers: Record<number, string> = {
  2026: "0016/2024",
  2027: "0021/2025",
  2028: "0024/2026",
};

const hlPoetryData: Record<number, { poets: Record<string, string[]> }> = {
  2026: poetryHL2026,
  2027: poetryHL2027,
  2028: poetryHL2028,
};

const olPoetryData: Record<
  number,
  { poems: { poet: string; title: string }[] }
> = {
  2026: poetryOL2026,
  2027: poetryOL2027,
  2028: poetryOL2028,
};

const singleTextData: Record<
  number,
  { single_texts: { author: string; title: string; level: string }[] }
> = {
  2026: singleTexts2026,
  2027: singleTexts2027,
  2028: singleTexts2028,
};

const compData: Record<number, typeof comp2026> = {
  2026: comp2026,
  2027: comp2027,
  2028: comp2028 as unknown as typeof comp2026,
};

function getPoets(year: number, level: Level): string[] {
  if (level === "HL") {
    const data = hlPoetryData[year];
    return data ? Object.keys(data.poets).sort() : [];
  }
  const data = olPoetryData[year];
  return data ? [...new Set(data.poems.map((p) => p.poet))].sort() : [];
}

function getPoems(year: number, level: Level, poet: string): string[] {
  if (level === "HL") {
    const data = hlPoetryData[year];
    return data ? (data.poets[poet] || []) : [];
  }
  const data = olPoetryData[year];
  return data
    ? data.poems.filter((p) => p.poet === poet).map((p) => p.title)
    : [];
}

function getSingleTexts(
  year: number,
  level: Level
): { author: string; title: string }[] {
  const data = singleTextData[year];
  if (!data) return [];
  return data.single_texts.filter(
    (t) => t.level === "H/O" || (level === "OL" && t.level === "O")
  );
}

function getCompModes(year: number, level: Level): string[] {
  const data = compData[year];
  if (!data) return [];
  return level === "HL"
    ? data.comparative_modes_HL
    : data.comparative_modes_OL;
}

function getCompTextOptions(year: number): TextOption[] {
  const data = compData[year];
  if (!data) return [];
  const options: TextOption[] = [];
  for (const t of data.novels_memoirs)
    options.push({ title: t.title, author: t.author, category: "Novel" });
  for (const t of data.drama)
    options.push({ title: t.title, author: t.author, category: "Drama" });
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

const ACTIVITY_TYPES = [
  { id: "pre-lesson", label: "Pre-lesson activities" },
  { id: "during-lesson", label: "During-lesson activities" },
  { id: "post-lesson", label: "Post-lesson / Exam questions" },
  { id: "vocabulary", label: "Vocabulary exercises" },
];

export default function WorksheetPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [contentType, setContentType] =
    useState<WorksheetContentType>("poetry");
  const [poet, setPoet] = useState("");
  const [poem, setPoem] = useState("");
  const [singleTextKey, setSingleTextKey] = useState("");
  const [compMode, setCompMode] = useState("");
  const [text1Key, setText1Key] = useState("");
  const [text2Key, setText2Key] = useState("");
  const [text3Key, setText3Key] = useState("");
  const [activities, setActivities] = useState<string[]>([
    "during-lesson",
    "post-lesson",
  ]);
  const [focusArea, setFocusArea] = useState("both");
  const [compositionType, setCompositionType] = useState<CompositionType>("personal_essay");
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);

  const { output, generating, error, searchStatus, generate, stop } =
    useStreamGenerate();

  const poets = getPoets(year, level);
  const poems = poet ? getPoems(year, level, poet) : [];
  const singleTexts = getSingleTexts(year, level);
  const compModes = getCompModes(year, level);
  const compTextOptions = getCompTextOptions(year);

  const novels = compTextOptions.filter((t) => t.category === "Novel");
  const drama = compTextOptions.filter((t) => t.category === "Drama");
  const films = compTextOptions.filter((t) => t.category === "Film");

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setPoet("");
    setPoem("");
    setSingleTextKey("");
    setCompMode("");
    setText1Key("");
    setText2Key("");
    setText3Key("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setPoet("");
    setPoem("");
    setSingleTextKey("");
    setCompMode("");
  }

  function handleContentTypeChange(newType: WorksheetContentType) {
    setContentType(newType);
    setPoet("");
    setPoem("");
    setSingleTextKey("");
    setCompMode("");
    setText1Key("");
    setText2Key("");
    setText3Key("");
    setFocusArea("both");
    setCompositionType("personal_essay");
  }

  function toggleActivity(id: string) {
    setActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function findTextByKey(key: string): TextOption | undefined {
    return compTextOptions.find(
      (t) => `${t.title}::${t.author || t.director}` === key
    );
  }

  function isReadyToGenerate(): boolean {
    // Skills-based types don't need activity checkboxes (they have fixed structures)
    const needsActivities = contentType === "poetry" || contentType === "single_text" || contentType === "comparative";
    if (needsActivities && activities.length === 0) return false;
    if (contentType === "poetry") return !!poet && !!poem;
    if (contentType === "single_text") return !!singleTextKey;
    if (contentType === "comparative") {
      const t1 = findTextByKey(text1Key);
      const t2 = findTextByKey(text2Key);
      const t3 = findTextByKey(text3Key);
      return !!compMode && !!t1 && !!t2 && !!t3;
    }
    if (contentType === "unseen_poetry") return true;
    if (contentType === "comprehension") return true;
    if (contentType === "composition") return !!compositionType;
    return false;
  }

  async function handleGenerate() {
    if (!isReadyToGenerate()) return;

    const body: Record<string, unknown> = {
      year,
      circular: circularNumbers[year],
      level,
      contentType: "worksheet",
      worksheetContentType: contentType,
      activityTypes: activities,
      userInstructions: instructions || undefined,
    };

    if (contentType === "poetry") {
      body.poet = poet;
      body.poem = poem;
    } else if (contentType === "single_text") {
      const st = singleTexts.find(
        (t) => `${t.title}::${t.author}` === singleTextKey
      );
      if (st) {
        body.author = st.author;
        body.textTitle = st.title;
      }
    } else if (contentType === "comparative") {
      body.comparativeMode = compMode;
      body.comparativeTexts = [text1Key, text2Key, text3Key]
        .map(findTextByKey)
        .filter(Boolean)
        .map((t) => ({
          title: t!.title,
          author: t!.author,
          director: t!.director,
          category: t!.category,
        }));
    } else if (contentType === "comprehension") {
      body.focusArea = focusArea;
    } else if (contentType === "composition") {
      body.compositionType = compositionType;
    }

    await generate(body);
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

  function getFilenameBase(): string {
    if (contentType === "poetry" && poet && poem)
      return `Worksheet - ${poet} - ${poem}`;
    if (contentType === "single_text" && singleTextKey)
      return `Worksheet - ${singleTextKey.split("::")[0]}`;
    if (contentType === "comparative" && compMode)
      return `Worksheet - ${compMode}`;
    if (contentType === "unseen_poetry")
      return `Worksheet - Unseen Poetry - ${level} ${year}`;
    if (contentType === "comprehension")
      return `Worksheet - Comprehension - ${level} ${year}`;
    if (contentType === "composition")
      return `Worksheet - ${compositionTypeLabels[compositionType]} - ${level} ${year}`;
    return "Worksheet";
  }

  function handleDownloadMarkdown() {
    const filename = `${getFilenameBase()}.md`.replace(
      /[/\\?%*:|"<>]/g,
      "-"
    );
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadWord() {
    await exportToWord(
      output,
      getFilenameBase().replace(/[/\\?%*:|"<>]/g, "-")
    );
  }

  function renderCompTextSelect(
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
                  {t.title} by {t.author}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Drama">
            {drama.map((t) => {
              const key = `${t.title}::${t.author || t.director}`;
              return (
                <option key={key} value={key}>
                  {t.title} by {t.author}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="Film">
            {films.map((t) => {
              const key = `${t.title}::${t.author || t.director}`;
              return (
                <option key={key} value={key}>
                  {t.title} dir. {t.director}
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
            Worksheet Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create activities, exercises, and worksheets for class.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) =>
                  handleContentTypeChange(
                    e.target.value as WorksheetContentType
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="poetry">Poetry</option>
                <option value="single_text">Single Text</option>
                <option value="comparative">Comparative</option>
                <option value="unseen_poetry">Unseen Poetry</option>
                <option value="comprehension">Comprehension</option>
                <option value="composition">Composition</option>
              </select>
            </div>
          </div>

          {/* Conditional selectors */}
          <div className="mt-4">
            {contentType === "poetry" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poet
                  </label>
                  <select
                    value={poet}
                    onChange={(e) => {
                      setPoet(e.target.value);
                      setPoem("");
                    }}
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
            )}

            {contentType === "single_text" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text
                </label>
                <select
                  value={singleTextKey}
                  onChange={(e) => setSingleTextKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  <option value="">Select a text</option>
                  {singleTexts.map((t) => (
                    <option
                      key={`${t.title}::${t.author}`}
                      value={`${t.title}::${t.author}`}
                    >
                      {t.title} by {t.author}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {contentType === "comparative" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comparative Mode
                  </label>
                  <select
                    value={compMode}
                    onChange={(e) => setCompMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                  >
                    <option value="">Select a mode</option>
                    {compModes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {renderCompTextSelect(text1Key, setText1Key, "Text 1")}
                  {renderCompTextSelect(text2Key, setText2Key, "Text 2")}
                  {renderCompTextSelect(text3Key, setText3Key, "Text 3")}
                </div>
              </>
            )}

            {contentType === "unseen_poetry" && (
              <p className="text-sm text-gray-500">
                Generates technique identification exercises, quote analysis practice, and a full unseen poem response task.
              </p>
            )}

            {contentType === "comprehension" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focus Area
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  <option value="both">Both Question A and B</option>
                  <option value="question_a">Question A (Comprehension)</option>
                  <option value="question_b">Question B (Functional Writing)</option>
                </select>
              </div>
            )}

            {contentType === "composition" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Composition Type
                </label>
                <select
                  value={compositionType}
                  onChange={(e) => setCompositionType(e.target.value as CompositionType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  {(Object.entries(compositionTypeLabels) as [CompositionType, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Activity types - only for text-based content types */}
          {(contentType === "poetry" || contentType === "single_text" || contentType === "comparative") && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Types
              </label>
              <div className="flex flex-wrap gap-3">
                {ACTIVITY_TYPES.map((at) => (
                  <label
                    key={at.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={activities.includes(at.id)}
                      onChange={() => toggleActivity(at.id)}
                      className="rounded border-gray-300 text-teal focus:ring-teal"
                    />
                    {at.label}
                  </label>
                ))}
              </div>
            </div>
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
              placeholder='e.g., "Focus on close reading of stanzas 2-4", "Mixed-ability class"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!isReadyToGenerate() || generating}
              className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Worksheet"}
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
                <h2 className="font-medium text-navy text-sm">Worksheet</h2>
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
