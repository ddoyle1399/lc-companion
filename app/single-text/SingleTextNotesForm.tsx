"use client";

import { useState, useMemo } from "react";
import type { Asset, AssetsByText } from "./page";

type Level = "higher" | "ordinary";
type Depth = "quick" | "standard" | "deep";

type NoteType =
  | "character_profile"
  | "theme_study"
  | "relationship_study"
  | "scene_analysis"
  | "plot_summary"
  | "quote_bank_theme"
  | "quote_bank_character"
  | "dramatic_technique"
  | "critical_reading";

interface NoteTypeMeta {
  key: NoteType;
  label: string;
  description: string;
  // The asset_type in single_text_assets that drives the Subject dropdown
  // for this note type. null = no subject needed (plot summary etc).
  driver: string | null;
}

const NOTE_TYPES: NoteTypeMeta[] = [
  { key: "character_profile", label: "Character Profile", description: "Deep dive on one character", driver: "character" },
  { key: "theme_study", label: "Theme Study", description: "How a theme is developed", driver: "theme" },
  { key: "relationship_study", label: "Relationship Study", description: "Paired character dynamic", driver: "relationship" },
  { key: "scene_analysis", label: "Scene Analysis", description: "A pivotal scene unpacked", driver: "scene" },
  { key: "dramatic_technique", label: "Dramatic Technique", description: "Soliloquy, irony, staging", driver: "dramatic_technique" },
  { key: "critical_reading", label: "Critical Reading", description: "Feminist, political, psychological", driver: "critical_reading" },
  { key: "quote_bank_theme", label: "Quote Bank: Theme", description: "Curated quotes by theme", driver: "theme" },
  { key: "quote_bank_character", label: "Quote Bank: Character", description: "Curated quotes by character", driver: "character" },
  { key: "plot_summary", label: "Plot Summary", description: "Full play overview", driver: null },
];

interface Props {
  availableTexts: string[];
  assetsByText: AssetsByText;
}

interface GeneratedNote {
  id: string;
  display_subject: string;
  body_markdown: string;
  word_count: number;
}

export default function SingleTextNotesForm({ availableTexts, assetsByText }: Props) {
  const [text, setText] = useState<string>(availableTexts[0] ?? "");
  const [level, setLevel] = useState<Level>("higher");
  const [noteType, setNoteType] = useState<NoteType>("character_profile");
  const [subjectKey, setSubjectKey] = useState<string>("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [instructions, setInstructions] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [note, setNote] = useState<GeneratedNote | null>(null);

  const noteTypeMeta = NOTE_TYPES.find((t) => t.key === noteType)!;

  // Subject options depend on note type's driver and the selected text
  const subjectOptions = useMemo<Asset[]>(() => {
    if (!text) return [];
    if (!noteTypeMeta.driver) return [];
    const all = assetsByText[text] ?? [];
    return all.filter((a) => a.asset_type === noteTypeMeta.driver);
  }, [text, noteTypeMeta, assetsByText]);

  // When note type changes, clear subject so user is forced to pick a valid one
  function handleNoteTypeChange(nt: NoteType) {
    setNoteType(nt);
    setSubjectKey("");
    setNote(null);
    setError("");
  }

  function handleTextChange(t: string) {
    setText(t);
    setSubjectKey("");
    setNote(null);
    setError("");
  }

  const subjectRequired = noteTypeMeta.driver !== null;
  const canGenerate =
    !!text &&
    !!noteType &&
    (!subjectRequired || !!subjectKey) &&
    !!level &&
    !!depth &&
    !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError("");
    setNote(null);

    const effectiveSubject = subjectRequired ? subjectKey : "full_play";

    try {
      const res = await fetch("/api/generate/text-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textKey: text,
          noteType,
          subjectKey: effectiveSubject,
          level,
          depth,
          userInstructions: instructions || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg =
          json.error === "no_verified_bank" || json.error === "quote_bank_too_thin"
            ? `No verified quote bank for ${text}. Upload an anthology first.`
            : json.error === "subject_not_in_catalogue"
              ? "Subject not found in catalogue."
              : json.error === "generation_failed"
                ? `Generation failed: ${json.detail ?? "unknown error"}`
                : json.error || "Unknown error";
        setError(msg);
      } else {
        setNote(json.note);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (availableTexts.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-5">
        <p className="text-sm text-amber-900">
          No verified single-text quote banks yet. Once Macbeth or Othello banks
          are seeded, this page will activate automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">
        {/* Step 1 — Text */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">1. Text</label>
          <div className="flex flex-wrap gap-2">
            {availableTexts.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTextChange(t)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  text === t
                    ? "bg-teal text-white border-teal"
                    : "bg-white text-navy border-gray-200 hover:border-teal"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Level */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">2. Level</label>
          <div className="flex gap-3">
            {(["higher", "ordinary"] as Level[]).map((l) => (
              <label key={l} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  value={l}
                  checked={level === l}
                  onChange={() => setLevel(l)}
                  className="accent-teal"
                />
                <span className="text-sm text-navy">{l === "higher" ? "Higher Level" : "Ordinary Level"}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 3 — Note type */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">3. Note type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {NOTE_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleNoteTypeChange(t.key)}
                className={`text-left px-3 py-2.5 rounded border transition-colors ${
                  noteType === t.key
                    ? "bg-teal/10 border-teal text-navy"
                    : "bg-white border-gray-200 hover:border-teal"
                }`}
              >
                <div className="text-sm font-medium text-navy">{t.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 4 — Subject (conditional) */}
        {subjectRequired && (
          <div>
            <label className="block text-sm font-medium text-navy mb-2">4. Subject</label>
            {subjectOptions.length === 0 ? (
              <p className="text-sm text-gray-400">No catalogue entries available for this combination.</p>
            ) : (
              <select
                value={subjectKey}
                onChange={(e) => { setSubjectKey(e.target.value); setNote(null); setError(""); }}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-navy focus:outline-none focus:border-teal"
              >
                <option value="">Select…</option>
                {subjectOptions.map((opt) => (
                  <option key={opt.subject_key} value={opt.subject_key}>{opt.display_name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Step 5 — Depth */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            {subjectRequired ? "5." : "4."} Depth
          </label>
          <div className="flex gap-3 flex-wrap">
            {(["quick", "standard", "deep"] as Depth[]).map((d) => (
              <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="depth"
                  value={d}
                  checked={depth === d}
                  onChange={() => setDepth(d)}
                  className="accent-teal"
                />
                <span className="text-sm text-navy capitalize">{d}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Quick = 1 page reference. Standard = 3 page substantive note. Deep = 5 page comprehensive.
          </p>
        </div>

        {/* Step 6 — Optional instructions */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1">
            {subjectRequired ? "6." : "5."} Additional instructions <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder='e.g. "Focus on the second half of the play"'
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-navy focus:outline-none focus:border-teal resize-none"
          />
        </div>

        {/* Generate */}
        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              canGenerate
                ? "bg-teal text-white hover:bg-teal/90"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {generating ? "Generating…" : "Generate Note"}
          </button>
          {generating && (
            <p className="text-xs text-gray-400 mt-2">
              This takes 30-90 seconds depending on depth.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded-lg p-5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {note && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold text-navy">{note.display_subject}</h2>
            <span className="text-xs text-gray-400">{note.word_count} words</span>
          </div>
          <div className="prose prose-sm max-w-none text-navy whitespace-pre-wrap">
            {note.body_markdown}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigator.clipboard.writeText(note.body_markdown)}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Copy Markdown
            </button>
            <a
              href={`/single-text/library/${note.id}`}
              className="px-4 py-2 text-sm border border-teal-700 text-teal-700 rounded hover:bg-teal/10"
            >
              View in library
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
