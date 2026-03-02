"use client";

import { useState, useRef, useCallback } from "react";
import Nav from "@/components/nav";

// Import circular data statically for client-side use
import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";

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
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const rawOutputRef = useRef("");
  const foundHeadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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

  const handleGenerate = useCallback(async () => {
    if (!poet || !poem) return;

    setGenerating(true);
    setOutput("");
    setError("");
    setSearchStatus("");
    rawOutputRef.current = "";
    foundHeadingRef.current = false;

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          circular: circularNumbers[year],
          level,
          contentType: "poetry",
          poet,
          poem,
          userInstructions: instructions || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
              } else if (parsed.status === "searching") {
                setSearchStatus("Searching for poem text...");
              } else if (parsed.text) {
                setSearchStatus("");
                rawOutputRef.current += parsed.text;

                if (foundHeadingRef.current) {
                  // Already past the preamble, append directly
                  setOutput((prev) => prev + parsed.text);
                } else {
                  // Check if we've hit a markdown heading yet
                  const headingMatch = rawOutputRef.current.match(/^([\s\S]*?)(#{1,2}\s)/);
                  if (headingMatch) {
                    foundHeadingRef.current = true;
                    // Output from the heading onwards
                    const fromHeading = rawOutputRef.current.slice(headingMatch[1].length);
                    setOutput(fromHeading);
                  }
                  // If no heading yet, don't display anything (it's preamble)
                }
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled
      } else {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      // If stream ended without ever finding a heading, show all output
      if (!foundHeadingRef.current && rawOutputRef.current) {
        setOutput(rawOutputRef.current);
      }
      setGenerating(false);
      abortRef.current = null;
    }
  }, [poet, poem, year, level, instructions]);

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
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

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy">
            Poetry Note Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate exam-aligned poetry analysis notes for prescribed poems.
          </p>
        </div>

        {/* Controls */}
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
                onClick={handleStop}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Output */}
        {(output || generating) && (
          <div className="bg-white border border-gray-200 rounded-lg">
            {/* Output header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div>
                <h2 className="font-medium text-navy text-sm">
                  {poet} &ndash; {poem}
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
                    Download .md
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
      </main>
    </div>
  );
}
