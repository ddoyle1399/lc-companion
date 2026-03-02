import { promises as fs } from "fs";
import path from "path";

const POEMS_DIR = path.join(process.cwd(), "data", "poems");

/**
 * Converts a poet name and poem title into a safe filename.
 * e.g., "W.B. Yeats" + "The Lake Isle of Innisfree" -> "wb-yeats--the-lake-isle-of-innisfree.txt"
 */
function toFilename(poet: string, poem: string): string {
  const safeName = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  return `${safeName(poet)}--${safeName(poem)}.txt`;
}

/**
 * Get the stored text for a specific poem. Returns null if not stored.
 */
export async function getPoemText(
  poet: string,
  poem: string
): Promise<string | null> {
  const filePath = path.join(POEMS_DIR, toFilename(poet, poem));
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return text.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Save poem text to the local store.
 */
export async function savePoemText(
  poet: string,
  poem: string,
  text: string
): Promise<void> {
  await fs.mkdir(POEMS_DIR, { recursive: true });
  const filePath = path.join(POEMS_DIR, toFilename(poet, poem));
  await fs.writeFile(filePath, text.trim(), "utf-8");
}

/**
 * Delete a stored poem text.
 */
export async function deletePoemText(
  poet: string,
  poem: string
): Promise<void> {
  const filePath = path.join(POEMS_DIR, toFilename(poet, poem));
  try {
    await fs.unlink(filePath);
  } catch {
    // File didn't exist, that's fine
  }
}

/**
 * List all stored poems. Returns an array of { poet, poem } pairs.
 */
export async function listStoredPoems(): Promise<
  { poet: string; poem: string; filename: string }[]
> {
  try {
    const files = await fs.readdir(POEMS_DIR);
    return files
      .filter((f) => f.endsWith(".txt"))
      .map((f) => {
        // Reverse the filename back to poet/poem names (approximate)
        const base = f.replace(".txt", "");
        const parts = base.split("--");
        return {
          poet: parts[0] || "",
          poem: parts[1] || "",
          filename: f,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Check if poem text exists for a specific poem.
 */
export async function hasPoemText(
  poet: string,
  poem: string
): Promise<boolean> {
  const text = await getPoemText(poet, poem);
  return text !== null;
}

/**
 * Get stored status for a batch of poems. Returns a map of "poet::poem" -> boolean.
 */
export async function getStoredStatusBatch(
  poems: { poet: string; poem: string }[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  await Promise.all(
    poems.map(async ({ poet, poem }) => {
      const key = `${poet}::${poem}`;
      results[key] = await hasPoemText(poet, poem);
    })
  );
  return results;
}
