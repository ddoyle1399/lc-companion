"use client";

import { useState, useRef, useCallback } from "react";

interface UseStreamGenerateOptions {
  /** When true (default), strips any text before the first markdown heading. */
  stripPreamble?: boolean;
}

export type GenerationStage =
  | "idle"
  | "streaming"
  | "auditing"
  | "rewriting"
  | "extracting"
  | "matching"
  | "saving"
  | "complete"
  | "error";

interface UseStreamGenerateReturn {
  output: string;
  rawOutput: string;
  generating: boolean;
  textStreamComplete: boolean;
  stage: GenerationStage;
  stageLabel: string;
  error: string;
  searchStatus: string;
  noteId: string | null;
  saveError: string | null;
  outlinesStatus: {
    ok: boolean;
    matched: number;
    generated: number;
    failed: number;
    note?: string;
  } | null;
  outlinesSaveStatus: {
    ok: boolean;
    inserted: number;
    error?: string;
  } | null;
  generate: (body: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useStreamGenerate(
  options?: UseStreamGenerateOptions
): UseStreamGenerateReturn {
  const stripPreamble = options?.stripPreamble ?? true;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [textStreamComplete, setTextStreamComplete] = useState(false);
  const [stage, setStage] = useState<GenerationStage>("idle");
  const [error, setError] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outlinesStatus, setOutlinesStatus] = useState<{
    ok: boolean;
    matched: number;
    generated: number;
    failed: number;
    note?: string;
  } | null>(null);
  const [outlinesSaveStatus, setOutlinesSaveStatus] = useState<{
    ok: boolean;
    inserted: number;
    error?: string;
  } | null>(null);

  const rawOutputRef = useRef("");
  const foundHeadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Given the current stage, produce a human label for the status line.
  const stageLabel = (() => {
    switch (stage) {
      case "streaming":
        return searchStatus || "Generating...";
      case "auditing":
        return "Auditing quality...";
      case "rewriting":
        return "Rewriting to fix flagged issues...";
      case "extracting":
        return "Extracting quotes and themes...";
      case "matching":
        return "Matching past exam questions...";
      case "saving":
        return "Saving...";
      case "complete":
        return "";
      case "error":
        return error || "Error";
      default:
        return "";
    }
  })();

  const generate = useCallback(
    async (body: Record<string, unknown>) => {
      setGenerating(true);
      setTextStreamComplete(false);
      setStage("streaming");
      setOutput("");
      setError("");
      setSearchStatus("");
      setNoteId(null);
      setSaveError(null);
      setOutlinesStatus(null);
      setOutlinesSaveStatus(null);
      rawOutputRef.current = "";
      foundHeadingRef.current = false;

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
                  setStage("error");
                } else if (parsed.status === "searching") {
                  setSearchStatus("Searching for text...");
                } else if (parsed.critic) {
                  // Text stream finished; critic pass produced a verdict.
                  setTextStreamComplete(true);
                  if (parsed.critic.status === "block") {
                    setStage("rewriting");
                  } else {
                    setStage("extracting");
                  }
                } else if (parsed.audit) {
                  // Audit event — mostly informational, but confirms post-stream work underway.
                  setTextStreamComplete(true);
                } else if (parsed.replace) {
                  // Retry produced new text. Swap it in.
                  rawOutputRef.current = parsed.replace;
                  setOutput(parsed.replace);
                  setTextStreamComplete(true);
                  setStage("extracting");
                } else if (parsed.fallback) {
                  // Retry failed and content could not be recovered.
                  rawOutputRef.current = parsed.fallback;
                  setOutput(parsed.fallback);
                  setTextStreamComplete(true);
                  setStage("error");
                  setError(parsed.fallback);
                } else if (parsed.extraction) {
                  setTextStreamComplete(true);
                  setStage("matching");
                } else if (parsed.save) {
                  setTextStreamComplete(true);
                  setStage("saving");
                  if (parsed.save.ok) {
                    setNoteId(parsed.save.noteId);
                  } else {
                    setSaveError(parsed.save.error);
                  }
                } else if (parsed.outlines) {
                  setOutlinesStatus(parsed.outlines);
                  setTextStreamComplete(true);
                  setStage("saving");
                } else if (parsed.outlinesSave) {
                  setOutlinesSaveStatus(parsed.outlinesSave);
                } else if (parsed.text) {
                  setSearchStatus("");
                  rawOutputRef.current += parsed.text;

                  if (stripPreamble) {
                    if (foundHeadingRef.current) {
                      setOutput((prev) => prev + parsed.text);
                    } else {
                      const headingMatch =
                        rawOutputRef.current.match(/^([\s\S]*?)(#{1,2}\s)/);
                      if (headingMatch) {
                        foundHeadingRef.current = true;
                        const fromHeading = rawOutputRef.current.slice(
                          headingMatch[1].length
                        );
                        setOutput(fromHeading);
                      }
                    }
                  } else {
                    setOutput((prev) => prev + parsed.text);
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
        if (stripPreamble && !foundHeadingRef.current && rawOutputRef.current) {
          setOutput(rawOutputRef.current);
        }
        setGenerating(false);
        setStage((prev) => (prev === "error" ? "error" : "complete"));
        abortRef.current = null;
      }
    },
    [stripPreamble]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setOutput("");
    setError("");
    setSearchStatus("");
    setNoteId(null);
    setSaveError(null);
    setOutlinesStatus(null);
    setOutlinesSaveStatus(null);
    setTextStreamComplete(false);
    setStage("idle");
    rawOutputRef.current = "";
    foundHeadingRef.current = false;
  }, []);

  return {
    output,
    rawOutput: rawOutputRef.current,
    generating,
    textStreamComplete,
    stage,
    stageLabel,
    error,
    searchStatus,
    noteId,
    saveError,
    outlinesStatus,
    outlinesSaveStatus,
    generate,
    stop,
    reset,
  };
}
