"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/nav";
import { useStreamGenerate } from "@/lib/hooks/useStreamGenerate";
import { exportToSlides, DeckData, SlideData } from "@/lib/export/slides";

import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";
import comp2026 from "@/data/circulars/2026-comparative.json";
import comp2027 from "@/data/circulars/2027-comparative.json";
import singleTexts2026 from "@/data/circulars/2026-single-texts.json";
import singleTexts2027 from "@/data/circulars/2027-single-texts.json";

type Level = "HL" | "OL";
type SlidesContentType = "poetry" | "comparative" | "general" | "single_text" | "unseen_poetry" | "comprehension" | "composition";

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
};

const hlPoetryData: Record<number, { poets: Record<string, string[]> }> = {
  2026: poetryHL2026,
  2027: poetryHL2027,
};

const olPoetryData: Record<
  number,
  { poems: { poet: string; title: string }[] }
> = {
  2026: poetryOL2026,
  2027: poetryOL2027,
};

const compData: Record<number, typeof comp2026> = {
  2026: comp2026,
  2027: comp2027,
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

const singleTextData: Record<
  number,
  { single_texts: { author: string; title: string; level: string }[] }
> = {
  2026: singleTexts2026,
  2027: singleTexts2027,
};

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

function parseDeckJSON(raw: string): DeckData | null {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(cleaned);
    if (parsed.title && Array.isArray(parsed.slides)) {
      return parsed as DeckData;
    }
    return null;
  } catch {
    return null;
  }
}

function SlidePreview({ slide, index }: { slide: SlideData; index: number }) {
  const isNavy = slide.layout === "title" || slide.layout === "summary";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className={`aspect-video p-4 flex flex-col justify-center ${
          isNavy ? "bg-navy text-cream" : "bg-cream text-navy"
        }`}
      >
        <p className="text-xs opacity-50 mb-1">
          Slide {index + 1} &middot; {slide.layout}
        </p>
        <h3
          className={`text-sm font-bold mb-2 ${
            isNavy ? "text-cream" : "text-navy"
          }`}
        >
          {slide.title}
        </h3>
        {slide.layout === "quote" && slide.quote && (
          <p className="text-xs italic border-l-2 border-teal pl-2">
            &ldquo;{slide.quote}&rdquo;
            {slide.attribution && (
              <span className="block text-[10px] mt-1 opacity-60">
                {slide.attribution}
              </span>
            )}
          </p>
        )}
        {slide.content && slide.content.length > 0 && slide.layout !== "quote" && (
          <ul className="text-xs space-y-0.5">
            {slide.content.slice(0, 5).map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-teal mt-0.5">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {slide.layout === "two_column" && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <ul className="space-y-0.5">
              {(slide.left_column || []).slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-teal mt-0.5">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-0.5">
              {(slide.right_column || []).slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-teal mt-0.5">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {slide.speaker_notes && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">
            Speaker notes
          </p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {slide.speaker_notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SlidesPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [contentType, setContentType] = useState<SlidesContentType>("poetry");
  const [poet, setPoet] = useState("");
  const [poem, setPoem] = useState("");
  const [compMode, setCompMode] = useState("");
  const [text1Key, setText1Key] = useState("");
  const [text2Key, setText2Key] = useState("");
  const [text3Key, setText3Key] = useState("");
  const [generalTopic, setGeneralTopic] = useState("");
  const [singleTextKey, setSingleTextKey] = useState("");
  const [compositionType, setCompositionType] = useState<CompositionType>("personal_essay");
  const [instructions, setInstructions] = useState("");
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [parseError, setParseError] = useState(false);

  const { output, rawOutput, generating, error, searchStatus, generate, stop } =
    useStreamGenerate({ stripPreamble: false });

  const poets = getPoets(year, level);
  const poems = poet ? getPoems(year, level, poet) : [];
  const compModes = getCompModes(year, level);
  const compTextOptions = getCompTextOptions(year);

  const singleTexts = getSingleTexts(year, level);
  const novels = compTextOptions.filter((t) => t.category === "Novel");
  const drama = compTextOptions.filter((t) => t.category === "Drama");
  const films = compTextOptions.filter((t) => t.category === "Film");

  // Parse JSON when generation completes
  useEffect(() => {
    if (!generating && output) {
      const parsed = parseDeckJSON(output);
      if (parsed) {
        setDeck(parsed);
        setParseError(false);
      } else {
        setDeck(null);
        setParseError(true);
      }
    }
  }, [generating, output]);

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setPoet("");
    setPoem("");
    setCompMode("");
    setText1Key("");
    setText2Key("");
    setText3Key("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setPoet("");
    setPoem("");
    setCompMode("");
  }

  function handleContentTypeChange(newType: SlidesContentType) {
    setContentType(newType);
    setPoet("");
    setPoem("");
    setCompMode("");
    setText1Key("");
    setText2Key("");
    setText3Key("");
    setGeneralTopic("");
    setSingleTextKey("");
    setCompositionType("personal_essay");
  }

  function findTextByKey(key: string): TextOption | undefined {
    return compTextOptions.find(
      (t) => `${t.title}::${t.author || t.director}` === key
    );
  }

  function isReadyToGenerate(): boolean {
    if (contentType === "poetry") return !!poet && !!poem;
    if (contentType === "comparative") {
      return (
        !!compMode &&
        !!findTextByKey(text1Key) &&
        !!findTextByKey(text2Key) &&
        !!findTextByKey(text3Key)
      );
    }
    if (contentType === "general") return !!generalTopic;
    if (contentType === "single_text") return !!singleTextKey;
    if (contentType === "unseen_poetry") return true;
    if (contentType === "comprehension") return true;
    if (contentType === "composition") return !!compositionType;
    return false;
  }

  async function handleGenerate() {
    if (!isReadyToGenerate()) return;

    setDeck(null);
    setParseError(false);

    const body: Record<string, unknown> = {
      year,
      circular: circularNumbers[year],
      level,
      contentType: "slides",
      slidesContentType: contentType,
      userInstructions: instructions || undefined,
    };

    if (contentType === "poetry") {
      body.poet = poet;
      body.poem = poem;
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
    } else if (contentType === "general") {
      body.textTitle = generalTopic;
    } else if (contentType === "single_text") {
      const st = singleTexts.find(
        (t) => `${t.title}::${t.author}` === singleTextKey
      );
      if (st) {
        body.author = st.author;
        body.textTitle = st.title;
      }
    } else if (contentType === "composition") {
      body.compositionType = compositionType;
    }

    await generate(body);
  }

  async function handleDownloadPptx() {
    if (!deck) return;
    let filename = "Slides";
    if (contentType === "poetry" && poet && poem)
      filename = `${poet} - ${poem}`;
    else if (contentType === "comparative" && compMode)
      filename = `Comparative - ${compMode}`;
    else if (contentType === "general" && generalTopic)
      filename = generalTopic;
    await exportToSlides(
      deck,
      filename.replace(/[/\\?%*:|"<>]/g, "-") + ".pptx"
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
            Slide Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate PowerPoint presentations for classroom use.
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
                  handleContentTypeChange(e.target.value as SlidesContentType)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="poetry">Poetry lesson</option>
                <option value="single_text">Single Text lesson</option>
                <option value="comparative">Comparative lesson</option>
                <option value="unseen_poetry">Unseen Poetry skills</option>
                <option value="comprehension">Comprehension skills</option>
                <option value="composition">Composition skills</option>
                <option value="general">General lesson</option>
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

            {contentType === "general" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Topic
                </label>
                <input
                  type="text"
                  value={generalTopic}
                  onChange={(e) => setGeneralTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                  placeholder='e.g., "Introduction to Shakespearean tragedy", "Paper 1 writing tips"'
                />
              </div>
            )}
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
              placeholder='e.g., "Include a group activity slide", "Focus on key quotes"'
            />
          </div>

          {/* Generate button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!isReadyToGenerate() || generating}
              className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Slides"}
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

        {/* Generating indicator */}
        {generating && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-teal font-medium">
              {searchStatus || "Generating slide content..."}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Slides will appear once generation is complete.
            </p>
          </div>
        )}

        {/* Parse error - show raw output */}
        {!generating && parseError && output && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-medium text-navy text-sm">
                  Slide generation completed
                </h2>
                <p className="text-xs text-red-500 mt-0.5">
                  Could not parse slide JSON. The raw output is shown below. You
                  can try generating again.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                className="text-sm px-3 py-1.5 bg-navy text-white rounded-md hover:bg-teal transition-colors"
              >
                Retry
              </button>
            </div>
            <div className="px-5 py-4 text-xs font-mono whitespace-pre-wrap text-gray-600 max-h-96 overflow-y-auto">
              {output}
            </div>
          </div>
        )}

        {/* Slide preview */}
        {!generating && deck && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-navy">
                  {deck.title}
                </h2>
                {deck.subtitle && (
                  <p className="text-sm text-gray-500">{deck.subtitle}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {deck.slides.length} slides
                </p>
              </div>
              <button
                onClick={handleDownloadPptx}
                className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors"
              >
                Download .pptx
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deck.slides.map((slide, i) => (
                <SlidePreview key={i} slide={slide} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
