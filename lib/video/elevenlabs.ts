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

  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set");
  }

  const res = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
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

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`ElevenLabs API error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  let audioBuffer: Buffer;
  try {
    audioBuffer = await generateAudio(section.spokenText);
  } catch (err) {
    // Retry once on failure
    await delay(1000);
    try {
      audioBuffer = await generateAudio(section.spokenText);
    } catch {
      // Both attempts failed: return estimated duration, no audio file
      const wordCount = section.spokenText.split(/\s+/).length;
      return {
        sectionId: section.id,
        filePath: "",
        durationSeconds: wordCount / 2.5,
      };
    }
  }

  await writeFile(filePath, audioBuffer);

  const durationSeconds = await getMp3Duration(filePath, audioBuffer.length);

  // Rate limit delay between calls
  await delay(500);

  return {
    sectionId: section.id,
    filePath,
    durationSeconds,
  };
}
