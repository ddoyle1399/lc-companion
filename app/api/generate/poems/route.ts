import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPoemsForPoet } from "@/data/circulars";

export async function GET(req: NextRequest) {
  const poet = req.nextUrl.searchParams.get("poetKey");
  const yearStr = req.nextUrl.searchParams.get("year");

  if (!poet || !yearStr) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);
  const prescribed = getPoemsForPoet(year, poet);

  if (prescribed.length === 0) {
    return NextResponse.json({ poems: [] });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("notes")
    .select("sub_key")
    .eq("subject_key", poet)
    .eq("content_type", "poem_notes")
    .eq("status", "verified")
    .in("sub_key", prescribed);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verified = new Set((data ?? []).map((r) => r.sub_key as string));
  const poems = prescribed.map((title) => ({
    title,
    verified: verified.has(title),
  }));

  return NextResponse.json({ poems });
}
