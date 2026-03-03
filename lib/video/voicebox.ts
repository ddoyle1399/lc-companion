import { writeFile } from "fs/promises";
import path from "path";
import type { ScriptSection, AudioSection } from "./types";

export interface VoiceboxConfig {
  serverUrl: string;
  profileId: string;
  language: string;
}

export function getVoiceboxConfig(): VoiceboxConfig {
  return {
    serverUrl: process.env.VOICEBOX_URL || "http://127.0.0.1:17493",
    profileId: process.env.VOICEBOX_PROFILE_ID || "default",
    language: "en",
  };
}

/**
 * Check if the Voicebox server is reachable.
 */
export async function checkVoiceboxHealth(serverUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/docs`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Generate audio for a single text string via the Voicebox API.
 * Returns the raw audio buffer.
 */
export async function generateAudio(
  text: string,
  config: VoiceboxConfig
): Promise<Buffer> {
  const res = await fetch(`${config.serverUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      profile_id: config.profileId,
      language: config.language,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(
      `Voicebox API error (${res.status}): ${errorText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Parse the duration of a WAV file from its header.
 * Handles standard 44-byte headers and extended headers by searching
 * for the "data" subchunk.
 */
export function parseWavDuration(buffer: Buffer): number {
  // Verify RIFF header
  const riff = buffer.toString("ascii", 0, 4);
  if (riff !== "RIFF") {
    throw new Error("Not a valid WAV file: missing RIFF header");
  }

  // Read format info from the fmt subchunk
  // Standard position: bytes 20-35
  const numChannels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  if (sampleRate === 0 || numChannels === 0 || bitsPerSample === 0) {
    throw new Error("Invalid WAV header: zero sample rate, channels, or bits per sample");
  }

  // Search for the "data" subchunk to find the actual data size
  let dataSize = 0;
  let offset = 12; // Skip RIFF header (12 bytes)

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }

    // Move to the next chunk (8 bytes for id+size, plus chunk data)
    offset += 8 + chunkSize;
  }

  if (dataSize === 0) {
    throw new Error("WAV file missing data subchunk");
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataSize / (numChannels * bytesPerSample);
  return totalSamples / sampleRate;
}

/**
 * Generate audio for a single script section, write it to disk,
 * and return the section metadata with real duration.
 */
export async function generateSectionAudio(
  section: ScriptSection,
  outputDir: string,
  config: VoiceboxConfig
): Promise<AudioSection> {
  const audioBuffer = await generateAudio(section.spokenText, config);
  const filePath = path.join(outputDir, `${section.id}.wav`);
  await writeFile(filePath, audioBuffer);

  let durationSeconds: number;
  try {
    durationSeconds = parseWavDuration(audioBuffer);
  } catch {
    // Fallback to estimate if WAV parsing fails
    const wordCount = section.spokenText.split(/\s+/).length;
    durationSeconds = wordCount / 2.5;
  }

  return {
    sectionId: section.id,
    filePath,
    durationSeconds,
  };
}
