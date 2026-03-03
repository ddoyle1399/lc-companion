"use client";

import { useState, useRef, useCallback } from "react";

interface UseStreamGenerateOptions {
  /** When true (default), strips any text before the first markdown heading. */
  stripPreamble?: boolean;
}

interface UseStreamGenerateReturn {
  output: string;
  rawOutput: string;
  generating: boolean;
  error: string;
  searchStatus: string;
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
  const [error, setError] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const rawOutputRef = useRef("");
  const foundHeadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (body: Record<string, unknown>) => {
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
                } else if (parsed.status === "searching") {
                  setSearchStatus("Searching for text...");
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
    rawOutputRef.current = "";
    foundHeadingRef.current = false;
  }, []);

  return {
    output,
    rawOutput: rawOutputRef.current,
    generating,
    error,
    searchStatus,
    generate,
    stop,
    reset,
  };
}
