import { useState, useRef, useCallback } from "react";
import type { VideoPipelineEvent, VideoScript } from "@/lib/video/types";

interface UseVideoPipelineReturn {
  stage: VideoPipelineEvent["stage"] | null;
  progress: number;
  message: string;
  videoUrl: string | null;
  script: VideoScript | null;
  error: string | null;
  running: boolean;
  startPipeline: (params: {
    poet: string;
    poem: string;
    poemText: string;
    year: number;
    level: "HL" | "OL";
    poetryNote?: string;
    script?: VideoScript;
  }) => void;
  cancel: () => void;
}

export function useVideoPipeline(): UseVideoPipelineReturn {
  const [stage, setStage] = useState<VideoPipelineEvent["stage"] | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRunning(false);
    setMessage("Cancelled.");
  }, []);

  const startPipeline = useCallback(
    (params: {
      poet: string;
      poem: string;
      poemText: string;
      year: number;
      level: "HL" | "OL";
      poetryNote?: string;
      script?: VideoScript;
    }) => {
      // Reset state
      setStage(null);
      setProgress(0);
      setMessage("Starting pipeline...");
      setVideoUrl(null);
      setScript(null);
      setError(null);
      setRunning(true);

      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        try {
          const response = await fetch("/api/video/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            const text = await response.text();
            throw new Error(text || "Failed to start pipeline");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6);
              try {
                const event: VideoPipelineEvent = JSON.parse(json);
                setStage(event.stage);
                setProgress(event.progress);
                setMessage(event.message);

                if (event.script) {
                  setScript(event.script);
                }

                if (event.stage === "complete" && event.videoUrl) {
                  setVideoUrl(event.videoUrl);
                  setRunning(false);
                }

                if (event.stage === "error") {
                  setError(event.message);
                  setRunning(false);
                }
              } catch {
                // Skip malformed events
              }
            }
          }

          // Stream ended - if we got a script but no video, the pipeline
          // stopped for script review
          setRunning(false);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError(
            err instanceof Error ? err.message : "Pipeline failed"
          );
          setRunning(false);
        }
      })();
    },
    []
  );

  return {
    stage,
    progress,
    message,
    videoUrl,
    script,
    error,
    running,
    startPipeline,
    cancel,
  };
}
