"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "@/components/nav";

import poetryHL2026 from "@/data/circulars/2026-poetry-hl.json";
import poetryOL2026 from "@/data/circulars/2026-poetry-ol.json";
import poetryHL2027 from "@/data/circulars/2027-poetry-hl.json";
import poetryOL2027 from "@/data/circulars/2027-poetry-ol.json";

type Level = "HL" | "OL";

interface PoemEntry {
  poet: string;
  poem: string;
}

const hlData: Record<number, { poets: Record<string, string[]> }> = {
  2026: poetryHL2026,
  2027: poetryHL2027,
};

const olData: Record<number, { poems: { poet: string; title: string }[] }> = {
  2026: poetryOL2026,
  2027: poetryOL2027,
};

function getAllPoems(year: number, level: Level): PoemEntry[] {
  if (level === "HL") {
    const data = hlData[year];
    if (!data) return [];
    const entries: PoemEntry[] = [];
    for (const [poet, poems] of Object.entries(data.poets)) {
      for (const poem of poems) {
        entries.push({ poet, poem });
      }
    }
    return entries;
  }
  const data = olData[year];
  if (!data) return [];
  return data.poems.map((p) => ({ poet: p.poet, poem: p.title }));
}

function groupByPoet(poems: PoemEntry[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const { poet, poem } of poems) {
    if (!groups[poet]) groups[poet] = [];
    groups[poet].push(poem);
  }
  return groups;
}

export default function PoemsPage() {
  const [year, setYear] = useState(2026);
  const [level, setLevel] = useState<Level>("HL");
  const [storedStatus, setStoredStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Editor state
  const [editingPoet, setEditingPoet] = useState("");
  const [editingPoem, setEditingPoem] = useState("");
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingText, setLoadingText] = useState(false);

  const allPoems = getAllPoems(year, level);
  const grouped = groupByPoet(allPoems);
  const poets = Object.keys(grouped).sort();

  const fetchStoredStatus = useCallback(async () => {
    if (allPoems.length === 0) return;
    setLoading(true);
    try {
      const poemsParam = encodeURIComponent(
        JSON.stringify(allPoems.map((p) => ({ poet: p.poet, poem: p.poem })))
      );
      const res = await fetch(`/api/poems?batch=true&poems=${poemsParam}`);
      if (res.ok) {
        const data = await res.json();
        setStoredStatus(data.status || {});
      }
    } catch {
      // Silently fail, status just won't show
    } finally {
      setLoading(false);
    }
  }, [year, level]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStoredStatus();
  }, [fetchStoredStatus]);

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setEditingPoet("");
    setEditingPoem("");
    setEditingText("");
  }

  function handleLevelChange(newLevel: Level) {
    setLevel(newLevel);
    setEditingPoet("");
    setEditingPoem("");
    setEditingText("");
  }

  async function handlePoemClick(poet: string, poem: string) {
    setEditingPoet(poet);
    setEditingPoem(poem);
    setEditingText("");
    setLoadingText(true);

    try {
      const res = await fetch(
        `/api/poems?poet=${encodeURIComponent(poet)}&poem=${encodeURIComponent(poem)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEditingText(data.text || "");
      }
    } catch {
      // Failed to load, start with empty
    } finally {
      setLoadingText(false);
    }
  }

  async function handleSave() {
    if (!editingPoet || !editingPoem) return;

    setSaving(true);
    try {
      const res = await fetch("/api/poems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poet: editingPoet,
          poem: editingPoem,
          text: editingText,
        }),
      });

      if (res.ok) {
        setStoredStatus((prev) => ({
          ...prev,
          [`${editingPoet}::${editingPoem}`]: true,
        }));
      }
    } catch {
      // Save failed
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingPoet || !editingPoem) return;

    try {
      const res = await fetch(
        `/api/poems?poet=${encodeURIComponent(editingPoet)}&poem=${encodeURIComponent(editingPoem)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setEditingText("");
        setStoredStatus((prev) => ({
          ...prev,
          [`${editingPoet}::${editingPoem}`]: false,
        }));
      }
    } catch {
      // Delete failed
    }
  }

  const storedCount = Object.values(storedStatus).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy">
            Poem Text Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Store verified poem texts so the generator can quote directly
            instead of relying on web search.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
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
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="HL">Higher Level</option>
                <option value="OL">Ordinary Level</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              {loading ? (
                "Checking stored texts..."
              ) : (
                <>
                  <span className="font-medium text-teal">{storedCount}</span>{" "}
                  of {allPoems.length} poems stored
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Poem list */}
          <div className="space-y-4">
            {poets.map((poet) => (
              <div
                key={poet}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 bg-navy/5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-navy">{poet}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {grouped[poet].map((poem) => {
                    const key = `${poet}::${poem}`;
                    const isStored = storedStatus[key];
                    const isActive =
                      editingPoet === poet && editingPoem === poem;

                    return (
                      <button
                        key={poem}
                        onClick={() => handlePoemClick(poet, poem)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                          isActive
                            ? "bg-teal/10 text-teal"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isStored ? "bg-teal" : "bg-gray-300"
                          }`}
                        />
                        <span className="truncate">{poem}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Editor panel */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {editingPoet && editingPoem ? (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-navy">
                    {editingPoet}
                  </h3>
                  <p className="text-sm text-gray-500">{editingPoem}</p>
                </div>
                <div className="p-4">
                  {loadingText ? (
                    <div className="text-sm text-gray-400 py-8 text-center">
                      Loading...
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-y"
                        placeholder="Paste the full poem text here..."
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSave}
                          disabled={!editingText.trim() || saving}
                          className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? "Saving..." : "Save Text"}
                        </button>
                        {storedStatus[`${editingPoet}::${editingPoem}`] && (
                          <button
                            onClick={handleDelete}
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Paste the verified poem text here. When stored, the
                        generator will quote directly from this text instead of
                        searching the web.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-400">
                  Select a poem from the list to add or view its text.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
