"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/components/nav";
import { useVideoPipeline } from "@/lib/hooks/useVideoPipeline";
import type { VideoScript, ScriptSection } from "@/lib/video/types";

import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";

type Level = "HL" | "OL";
type UIState = "select" | "script" | "rendering" | "done";

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
    return data ? data.poets[poet] || [] : [];
  }
  const data = olData[year];
  return data
    ? data.poems.filter((p) => p.poet === poet).map((p) => p.title)
    : [];
}

const SECTION_LABELS: Record<string, string> = {
  intro: "Introduction",
  stanza_analysis: "Stanza Analysis",
  theme: "Themes",
  exam_connection: "Exam Connection",
  outro: "Conclusion",
};

export default function VideoPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <VideoPage />
    </Suspense>
  );
}

function VideoPage() {
  // Selection state
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [poet, setPoet] = useState("");
  const [poem, setPoem] = useState("");
  const [poetryNote, setPoetryNote] = useState("");

  // Poem text state
  const [poemText, setPoemText] = useState<string | null>(null);
  const [poemTextLoading, setPoemTextLoading] = useState(false);
  const [poemTextError, setPoemTextError] = useState("");

  // Script state
  const [script, setScript] = useState<VideoScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState("");

  // UI state machine
  const [uiState, setUIState] = useState<UIState>("select");

  // Pipeline hook
  const pipeline = useVideoPipeline();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-populate from query params (coming from poetry page)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
    const qYear = searchParams.get("year");
    const qLevel = searchParams.get("level");
    const qPoet = searchParams.get("poet");
    const qPoem = searchParams.get("poem");

    if (qPoet && qPoem) {
      if (qYear) setYear(Number(qYear));
      if (qLevel === "HL" || qLevel === "OL") setLevel(qLevel);
      setPoet(qPoet);
      setPoem(qPoem);

      // Load note from sessionStorage if available
      const storedNote = sessionStorage.getItem("lc-video-note");
      if (storedNote) {
        setPoetryNote(storedNote);
        sessionStorage.removeItem("lc-video-note");
      }

      // Fetch poem text
      fetch(
        `/api/poems?poet=${encodeURIComponent(qPoet)}&poem=${encodeURIComponent(qPoem)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.text) {
            setPoemText(data.text);
          } else {
            setPoemTextError(
              "No poem text stored. Add it on the Poems page first."
            );
          }
        })
        .catch(() => {
          setPoemTextError("Failed to check poem text.");
        });
    }
    setInitialized(true);
  }, [initialized, searchParams]);

  const poets = getPoets(year, level);
  const poems = poet ? getPoems(year, level, poet) : [];

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setPoet("");
    setPoem("");
    setPoemText(null);
    setPoemTextError("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setPoet("");
    setPoem("");
    setPoemText(null);
    setPoemTextError("");
  }

  function handlePoetChange(newPoet: string) {
    setPoet(newPoet);
    setPoem("");
    setPoemText(null);
    setPoemTextError("");
  }

  const handlePoemChange = useCallback(
    async (newPoem: string) => {
      setPoem(newPoem);
      setPoemText(null);
      setPoemTextError("");

      if (!newPoem || !poet) return;

      setPoemTextLoading(true);
      try {
        const res = await fetch(
          `/api/poems?poet=${encodeURIComponent(poet)}&poem=${encodeURIComponent(newPoem)}`
        );
        const data = await res.json();
        if (data.text) {
          setPoemText(data.text);
        } else {
          setPoemTextError(
            "No poem text stored. Add it on the Poems page first."
          );
        }
      } catch {
        setPoemTextError("Failed to check poem text.");
      } finally {
        setPoemTextLoading(false);
      }
    },
    [poet]
  );

  async function handleGenerateScript() {
    if (!poet || !poem || !poemText || !poetryNote) return;

    setScriptLoading(true);
    setScriptError("");

    try {
      const res = await fetch("/api/video/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poet, poem, poemText, poetryNote, year, level }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate script");
      }

      setScript(data.script);
      setUIState("script");
    } catch (err) {
      setScriptError(
        err instanceof Error ? err.message : "Script generation failed"
      );
    } finally {
      setScriptLoading(false);
    }
  }

  function handleSectionTextChange(index: number, newText: string) {
    if (!script) return;
    const updated = { ...script };
    updated.sections = [...updated.sections];
    updated.sections[index] = {
      ...updated.sections[index],
      spokenText: newText,
    };
    // Recalculate estimated duration
    const wordCount = newText.split(/\s+/).length;
    updated.sections[index].estimatedDuration = Math.round(wordCount / 2.5);
    updated.totalEstimatedDuration = updated.sections.reduce(
      (sum, s) => sum + s.estimatedDuration,
      0
    );
    setScript(updated);
  }

  function handleStartRender() {
    if (!script || !poemText) return;
    setUIState("rendering");
    pipeline.startRender(script, poemText, poet, poem);
  }

  function handleStartNew() {
    setScript(null);
    setPoetryNote("");
    setScriptError("");
    setUIState("select");
  }

  // Watch pipeline for completion/error to transition UI state
  if (uiState === "rendering" && pipeline.videoUrl) {
    setUIState("done");
  }

  const canGenerate = poet && poem && poemText && poetryNote && !scriptLoading;

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy">
            Video Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate narrated video analysis from a poetry note.
          </p>
        </div>

        {/* State 1: Selection and Input */}
        {uiState === "select" && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
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
                    onChange={(e) =>
                      handleLevelChange(e.target.value as Level)
                    }
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
                    onChange={(e) => handlePoemChange(e.target.value)}
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

              {/* Poem text status */}
              {poemTextLoading && (
                <p className="text-xs text-gray-500 mt-3">
                  Checking poem text...
                </p>
              )}
              {poemTextError && (
                <p className="text-sm text-amber-600 mt-3">
                  {poemTextError}{" "}
                  <a
                    href="/poems"
                    className="underline text-teal hover:text-navy"
                  >
                    Go to Poems
                  </a>
                </p>
              )}
              {poemText && (
                <p className="text-xs text-green-600 mt-3">
                  Poem text found ({poemText.split("\n").length} lines).
                </p>
              )}

              {/* Poetry note input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poetry Note
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Paste a reviewed poetry note to convert into a video script.
                </p>
                <textarea
                  value={poetryNote}
                  onChange={(e) => setPoetryNote(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y font-mono"
                  placeholder="Paste your reviewed poetry analysis note here..."
                />
              </div>

              {/* Generate script button */}
              <div className="mt-4">
                <button
                  onClick={handleGenerateScript}
                  disabled={!canGenerate}
                  className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scriptLoading ? "Generating Script..." : "Generate Script"}
                </button>
              </div>

              {scriptError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm">
                  {scriptError}
                </div>
              )}
            </div>
          </>
        )}

        {/* State 2: Script Review */}
        {uiState === "script" && script && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-medium text-navy">
                    {script.poemTitle} by {script.poet}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {script.sections.length} sections, ~
                    {Math.round(script.totalEstimatedDuration / 60)} min{" "}
                    {script.totalEstimatedDuration % 60}s estimated
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUIState("select");
                      setScript(null);
                    }}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleStartRender}
                    className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors"
                  >
                    Start Rendering
                  </button>
                </div>
              </div>
            </div>

            {script.sections.map((section: ScriptSection, i: number) => (
              <div
                key={section.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-teal/10 text-teal rounded">
                    {SECTION_LABELS[section.type] || section.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    ~{section.estimatedDuration}s
                    {section.highlightLines.length > 0 &&
                      ` | Lines ${section.highlightLines
                        .map((l) => l + 1)
                        .join(", ")}`}
                  </span>
                </div>
                <textarea
                  value={section.spokenText}
                  onChange={(e) =>
                    handleSectionTextChange(i, e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
                />
              </div>
            ))}
          </div>
        )}

        {/* State 3: Pipeline Progress */}
        {uiState === "rendering" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-medium text-navy mb-4">Rendering Video</h2>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{pipeline.message}</span>
                <span className="text-gray-400">
                  {Math.round(pipeline.progress * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pipeline.progress * 100}%` }}
                />
              </div>
            </div>

            {pipeline.stage && (
              <p className="text-xs text-gray-400">
                Stage: {pipeline.stage}
              </p>
            )}

            {pipeline.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm">
                {pipeline.error}
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={() => {
                  pipeline.cancel();
                  setUIState("script");
                }}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* State 4: Completion */}
        {uiState === "done" && pipeline.videoUrl && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-medium text-navy mb-4">Video Ready</h2>

            <video
              controls
              className="w-full rounded-lg border border-gray-200 mb-4"
              src={pipeline.videoUrl}
            >
              Your browser does not support the video tag.
            </video>

            <div className="flex gap-2">
              <a
                href={pipeline.videoUrl}
                download
                className="bg-navy text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors inline-block"
              >
                Download MP4
              </a>
              <button
                onClick={handleStartNew}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Start New Video
              </button>
              <button
                onClick={() => router.push("/poetry")}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Back to Notes
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
