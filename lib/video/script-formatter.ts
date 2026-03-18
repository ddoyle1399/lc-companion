import fs from "fs";
import path from "path";
import { getClient } from "@/lib/claude/client";
import { buildScriptSystemPrompt, buildScriptUserPrompt } from "./script-prompt";
import type { VideoScript, ScriptWarning } from "./types";

function repairJSON(raw: string): string {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();

  // Fix trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  // Fix missing commas between object properties: }" followed by "
  cleaned = cleaned.replace(/}"\s*"/g, '},"');

  // If JSON is truncated (doesn't end with }), try to close it
  const trimmed = cleaned.trimEnd();
  if (!trimmed.endsWith("}")) {
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escape = false;
    for (const char of trimmed) {
      if (escape) { escape = false; continue; }
      if (char === "\\" && inString) { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === "{") braces++;
      if (char === "}") braces--;
      if (char === "[") brackets++;
      if (char === "]") brackets--;
    }
    while (brackets > 0) { cleaned += "]"; brackets--; }
    while (braces > 0) { cleaned += "}"; braces--; }
  }

  return cleaned;
}

function saveDebugResponse(raw: string): void {
  try {
    const debugPath = path.join(process.cwd(), "data", "debug-last-script-response.txt");
    fs.mkdirSync(path.dirname(debugPath), { recursive: true });
    fs.writeFileSync(debugPath, raw, "utf-8");
    console.error("[script-formatter] Script JSON parsing failed. Raw response saved to data/debug-last-script-response.txt for inspection.");
  } catch {
    console.error("[script-formatter] Could not save debug response to file.");
  }
}

function parseScriptJSON(raw: string): VideoScript {
  const cleaned = repairJSON(raw);

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
  let lastRawResponse: string | null = null;

  // Up to 2 attempts
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryInstruction = attempt > 0
      ? "\n\nIMPORTANT: Your previous response contained malformed JSON. This time, ensure your response is ONLY valid JSON. Double-check all commas, closing braces, and closing brackets before responding. Do not include any text outside the JSON object."
      : "";

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt + retryInstruction }],
      });

      // Extract text from the response
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      lastRawResponse = textBlock.text;
      const script = parseScriptJSON(textBlock.text);
      const warnings = validateScript(script, poetryNote, poemText);
      if (warnings.length > 0) {
        script.warnings = warnings;
      }
      return script;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Only retry on JSON parse errors. Bail immediately on API/network errors.
      if (
        lastError.message.includes("API") ||
        lastError.message.includes("rate") ||
        lastError.message.includes("authentication") ||
        lastError.message.includes("Connection error") ||
        lastError.message.includes("connection") ||
        lastError.message.includes("network")
      ) {
        console.error("[script-formatter] Non-retryable error on attempt", attempt + 1, ":", lastError.message);
        throw lastError;
      }
      if (lastRawResponse) {
        saveDebugResponse(lastRawResponse);
      }
      console.warn("[script-formatter] Parse error on attempt", attempt + 1, "- retrying:", lastError.message);
    }
  }

  throw lastError || new Error("Failed to generate video script");
}
