"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CopyDeleteBarProps {
  bodyText: string;
  bodyHtml: string | null;
  deleteHref: string;
  backHref: string;
}

export default function CopyDeleteBar({ bodyText, bodyHtml, deleteHref, backHref }: CopyDeleteBarProps) {
  const router = useRouter();
  const [copyTextState, setCopyTextState] = useState<"idle" | "copied">("idle");
  const [copyHtmlState, setCopyHtmlState] = useState<"idle" | "copied">("idle");
  const [deleting, setDeleting] = useState(false);

  async function handleCopyText() {
    await navigator.clipboard.writeText(bodyText);
    setCopyTextState("copied");
    setTimeout(() => setCopyTextState("idle"), 2000);
  }

  async function handleCopyHtml() {
    if (!bodyHtml) return;
    try {
      const textBlob = new Blob([bodyText], { type: "text/plain" });
      const htmlBlob = new Blob([bodyHtml], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob }),
      ]);
    } catch {
      await navigator.clipboard.writeText(bodyText);
    }
    setCopyHtmlState("copied");
    setTimeout(() => setCopyHtmlState("idle"), 2000);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(deleteHref, { method: "DELETE" });
    if (res.ok) {
      router.push(backHref);
    } else {
      setDeleting(false);
      alert("Delete failed. Please try again.");
    }
  }

  return (
    <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-200">
      <button
        onClick={handleCopyText}
        className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
      >
        {copyTextState === "copied" ? "Copied!" : "Copy plain text"}
      </button>
      {bodyHtml && (
        <button
          onClick={handleCopyHtml}
          className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
        >
          {copyHtmlState === "copied" ? "Copied!" : "Copy HTML"}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50 ml-auto"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
