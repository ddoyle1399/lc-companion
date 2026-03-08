import { writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import type { ScriptSection, AudioSection } from "./types";

const execAsync = promisify(exec);

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

/**
 * Check whether the ElevenLabs API key and voice ID are configured.
 */
export function isConfigured(): boolean {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  return !!(
    apiKey &&
    apiKey !== "placeholder" &&
    apiKey !== "placeholder_until_user_provides" &&
    voiceId &&
    voiceId !== "placeholder" &&
    voiceId !== "placeholder_until_user_provides"
  );
}

/**
 * Generate audio for a single text string via the ElevenLabs API.
 * Returns the raw MP3 buffer.
 */
export async function generateAudio(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  console.log(`[elevenlabs] generateAudio called: textLength=${text.length}, voiceId="${voiceId}", apiKeyPresent=${!!apiKey}`);

  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set");
  }

  const url = `${ELEVENLABS_API_URL}/${voiceId}`;
  console.log(`[elevenlabs] POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  console.log(`[elevenlabs] Response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error(`[elevenlabs] API ERROR (${res.status}): ${errorText}`);
    throw new Error(`ElevenLabs API error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[elevenlabs] Audio received: ${buffer.length} bytes`);
  return buffer;
}

/**
 * Get the duration of an MP3 file using ffprobe.
 * Falls back to a file-size estimate if ffprobe is not available.
 */
async function getMp3Duration(filePath: string, fileSize: number): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`
    );
    const info = JSON.parse(stdout);
    const duration = parseFloat(info.format?.duration);
    if (!isNaN(duration) && duration > 0) {
      return duration;
    }
  } catch {
    // ffprobe not available or failed
  }

  // Fallback: estimate from file size assuming ~128kbps MP3
  // 128kbps = 16000 bytes per second
  return Math.max(1, fileSize / 16000);
}

/**
 * Small delay to avoid rate limiting on the ElevenLabs free tier.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate audio for a single script section, write it to disk,
 * and return the section metadata with real duration.
 */
export async function generateSectionAudio(
  section: ScriptSection,
  outputDir: string
): Promise<AudioSection> {
  const filePath = path.join(outputDir, `${section.id}.mp3`);
  const textPreview = section.spokenText.slice(0, 60).replace(/\n/g, " ");

  console.log(`[elevenlabs] Section "${section.id}": generating audio for "${textPreview}..."`);

  let audioBuffer: Buffer;
  try {
    audioBuffer = await generateAudio(section.spokenText);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[elevenlabs] Section "${section.id}" attempt 1 FAILED: ${errMsg}`);
    // Retry once on failure
    await delay(1000);
    try {
      audioBuffer = await generateAudio(section.spokenText);
    } catch (retryErr) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error(`[elevenlabs] Section "${section.id}" attempt 2 FAILED: ${retryMsg}`);
      console.error(`[elevenlabs] Section "${section.id}": both attempts failed, returning empty audio`);
      const wordCount = section.spokenText.split(/\s+/).length;
      return {
        sectionId: section.id,
        filePath: "",
        durationSeconds: wordCount / 2.5,
      };
    }
  }

  await writeFile(filePath, audioBuffer);
  console.log(`[elevenlabs] Section "${section.id}": saved ${audioBuffer.length} bytes to ${filePath}`);

  const durationSeconds = await getMp3Duration(filePath, audioBuffer.length);
  console.log(`[elevenlabs] Section "${section.id}": duration=${durationSeconds.toFixed(1)}s`);

  // Rate limit delay between calls
  await delay(500);

  return {
    sectionId: section.id,
    filePath,
    durationSeconds,
  };
}
