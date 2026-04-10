import { getServerSupabase } from "./server";
import type { SaveNoteInput, SaveNoteResult } from "./types";

export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...input, status: input.status ?? "draft" })
      .select("id")
      .single();

    if (error) {
      console.error("[saveNote] failed to persist note", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, noteId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[saveNote] failed to persist note", err);
    return { ok: false, error: message };
  }
}
