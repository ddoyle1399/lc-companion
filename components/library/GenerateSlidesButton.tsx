"use client";

import { useState } from "react";

interface GenerateSlidesButtonProps {
  noteId: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; downloadUrl: string; slideCount: number; sizeKb: number }
  | { kind: "error"; message: string };

export default function GenerateSlidesButton({ noteId }: GenerateSlidesButtonProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleClick() {
    setStatus({ kind: "generating" });
    try {
      const r = await fetch("/api/slides/from-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error
            ? `${data.error}${data.detail ? ": " + data.detail : ""}`
            : `HTTP ${r.status}`,
        });
        return;
      }
      setStatus({
        kind: "ready",
        downloadUrl: data.download_url,
        slideCount: data.slide_count,
        sizeKb: Math.round((data.file_size_bytes ?? 0) / 1024),
      });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-navy">PowerPoint deck</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Classroom-display slides with detailed speaker notes, derived from this note.
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={status.kind === "generating"}
          className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            status.kind === "generating"
              ? "bg-slate-200 text-slate-500 cursor-wait"
              : "bg-navy text-white hover:bg-navy/90"
          }`}
        >
          {status.kind === "generating" ? "Generating..." : "Generate slides"}
        </button>
      </div>

      {status.kind === "generating" && (
        <div className="mt-3 text-xs text-slate-500">
          Parsing note, condensing each section, rendering pptx, uploading. Usually 30-60 seconds.
        </div>
      )}

      {status.kind === "ready" && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
          <div className="text-xs text-emerald-800">
            Ready: {status.slideCount} slides · {status.sizeKb} KB · link expires in 1 hour
          </div>
          <a
            href={status.downloadUrl}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
          >
            Download
          </a>
        </div>
      )}

      {status.kind === "error" && (
        <div className="mt-3 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800">
          {status.message}
        </div>
      )}
    </div>
  );
}
