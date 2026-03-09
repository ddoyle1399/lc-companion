import { getClient } from "@/lib/claude/client";
import { buildScriptSystemPrompt, buildScriptUserPrompt } from "./script-prompt";
import type { VideoScript, ScriptWarning } from "./types";

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

/**
 * Validate the generated script against the source note and poem text.
 * Returns warnings for potential hallucinations (does not block generation).
 */
function validateScript(
  script: VideoScript,
  poetryNote: string,
  poemText: string
): ScriptWarning[] {
  const warnings: ScriptWarning[] = [];
  const noteLower = poetryNote.toLowerCase();
  const poemLines = poemText.split("\n").map((l) => l.trim().toLowerCase());
  const poemTextLower = poemText.toLowerCase();

  for (const section of script.sections) {
    // Check technique names exist in the source note
    if (section.techniques) {
      for (const tech of section.techniques) {
        if (!noteLower.includes(tech.name.toLowerCase())) {
          const msg = `Technique "${tech.name}" in section "${section.id}" not found in source note`;
          console.warn(`[script-validation] ${msg}`);
          warnings.push({
            type: "technique_not_in_note",
            message: msg,
            sectionId: section.id,
            value: tech.name,
          });
        }
      }
    }

    // Check keyQuote text appears in the poem
    if (section.keyQuote) {
      const quoteWords = section.keyQuote.text.toLowerCase().trim();
      // Check if the quote appears anywhere in the poem text (fuzzy: check if most words match a line)
      const foundInPoem = poemLines.some((line) => line.includes(quoteWords)) ||
        poemTextLower.includes(quoteWords);

      if (!foundInPoem) {
        const msg = `Key quote "${section.keyQuote.text}" in section "${section.id}" not found in poem text`;
        console.warn(`[script-validation] ${msg}`);
        warnings.push({
          type: "quote_not_in_poem",
          message: msg,
          sectionId: section.id,
          value: section.keyQuote.text,
        });
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[script-validation] ${warnings.length} warning(s) found`);
  } else {
    console.log(`[script-validation] No warnings. Script content looks clean.`);
  }

  return warnings;
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

      const script = parseScriptJSON(textBlock.text);
      const warnings = validateScript(script, poetryNote, poemText);
      if (warnings.length > 0) {
        script.warnings = warnings;
      }
      return script;
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
