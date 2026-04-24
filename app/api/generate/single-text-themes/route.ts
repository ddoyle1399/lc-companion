import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const textKey = request.nextUrl.searchParams.get("textKey");
  if (!textKey) {
    return NextResponse.json({ error: "missing_textKey" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Fetch the verified quote bank for this text and extract unique tags.
  const { data, error } = await supabase
    .from("notes")
    .select("themes, quotes")
    .eq("content_type", "single_text_notes")
    .eq("subject_key", textKey)
    .eq("status", "verified");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ themes: [] });
  }

  // Prefer the explicit themes array on the note row. Fall back to tags
  // aggregated across quotes if themes is empty.
  const themes = new Set<string>();
  for (const row of data) {
    const topLevel = Array.isArray(row.themes) ? row.themes : [];
    for (const t of topLevel) {
      if (typeof t === "string") themes.add(t);
    }
    const quotes = Array.isArray(row.quotes) ? row.quotes : [];
    for (const q of quotes) {
      if (q && typeof q === "object") {
        const tags = Array.isArray((q as { tags?: unknown[] }).tags)
          ? ((q as { tags: unknown[] }).tags as unknown[])
          : [];
        for (const tag of tags) {
          if (typeof tag === "string") themes.add(tag);
        }
      }
    }
  }

  // Return alphabetised for stable UI ordering.
  const sorted = Array.from(themes).sort();
  return NextResponse.json({ themes: sorted });
}
