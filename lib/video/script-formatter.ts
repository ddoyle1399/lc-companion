import { getClient } from "@/lib/claude/client";
import { buildScriptSystemPrompt, buildScriptUserPrompt } from "./script-prompt";
import type { VideoScript } from "./types";

function parseScriptJSON(raw: string): VideoScript {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (!parsed.poemTitle || typeof parsed.poemTitle !== "string") {
    throw new Error("Missing or invalid poemTitle");
  }
  if (!parsed.poet || typeof parsed.poet !== "string") {
    throw new Error("Missing or invalid poet");
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error("Missing or empty sections array");
  }

  for (const section of parsed.sections) {
    if (!section.id || !section.type || !section.spokenText) {
      throw new Error(`Invalid section: missing id, type, or spokenText`);
    }
    if (!Array.isArray(section.highlightLines)) {
      section.highlightLines = [];
    }
    if (typeof section.estimatedDuration !== "number") {
      const wordCount = section.spokenText.split(/\s+/).length;
      section.estimatedDuration = Math.round(wordCount / 2.5);
    }
  }

  if (typeof parsed.totalEstimatedDuration !== "number") {
    parsed.totalEstimatedDuration = parsed.sections.reduce(
      (sum: number, s: { estimatedDuration: number }) => sum + s.estimatedDuration,
      0
    );
  }

  return parsed as VideoScript;
}

export async function generateVideoScript(
  poet: string,
  poem: string,
  poemText: string,
  poetryNote: string,
  year: number,
  level: "HL" | "OL"
): Promise<VideoScript> {
  const client = getClient();
  const systemPrompt = buildScriptSystemPrompt();
  const poemLines = poemText.split("\n");
  const userPrompt = buildScriptUserPrompt(
    poet,
    poem,
    poemText,
    poetryNote,
    poemLines.length
  );

  let lastError: Error | null = null;

  // Up to 2 attempts
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      // Extract text from the response
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      return parseScriptJSON(textBlock.text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Only retry on parse errors, not API errors
      if (
        lastError.message.includes("API") ||
        lastError.message.includes("rate") ||
        lastError.message.includes("authentication")
      ) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Failed to generate video script");
}
