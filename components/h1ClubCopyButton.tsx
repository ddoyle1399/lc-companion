"use client";

import { useState } from "react";
import { wrapForH1Club } from "@/lib/export/h1ClubHtml";

/**
 * Reusable button: takes a Markdown body + title + level, wraps it in the
 * H1 Club's brand HTML, copies the result to the clipboard, and flashes
 * "Copied!" for 1.8s. Drop into any generation page that produces a note
 * the operator pastes into the H1 Club CMS.
 *
 * Why this exists: the H1 Club paste flow is the operator's daily output
 * pipeline. Every generation page needs this affordance until the H1 Club
 * is replaced by an in-app library.
 */
export default function H1ClubCopyButton({
  markdown,
  title,
  level = "higher",
  className = "",
  size = "md",
}: {
  markdown: string;
  title: string;
  level?: "higher" | "ordinary" | "HL" | "OL";
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      const normalisedLevel: "higher" | "ordinary" =
        level === "HL" || level === "higher" ? "higher" : "ordinary";
      const html = wrapForH1Club({ markdown, title, level: normalisedLevel });
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access denied or other write failure. Silently no-op;
      // the operator will notice the absent flash and can retry.
    }
  }

  const padding = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";

  return (
    <button
      onClick={handleClick}
      disabled={!markdown}
      title="Copy as H1 Club HTML, ready to paste into the H1 Club CMS"
      className={`${padding} bg-teal text-white font-medium rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {copied ? "Copied!" : "Copy for H1 Club"}
    </button>
  );
}
