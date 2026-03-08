/**
 * Standalone test for ElevenLabs TTS API.
 * Usage: npm run test:elevenlabs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

// Load .env.local manually (no dotenv dependency needed)
function loadEnv() {
  try {
    const envPath = path.resolve(".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx);
      const value = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.error("Could not read .env.local");
  }
}

loadEnv();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

console.log("--- ElevenLabs Test ---");
console.log(`API Key: ${API_KEY ? API_KEY.slice(0, 8) + "..." + API_KEY.slice(-4) : "MISSING"}`);
console.log(`Voice ID: ${VOICE_ID || "MISSING"}`);
console.log("");

if (!API_KEY || !VOICE_ID) {
  console.error("ERROR: ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set in .env.local");
  process.exit(1);
}

const testText = "This is a test of the ElevenLabs text to speech system.";
const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

console.log(`POST ${url}`);
console.log(`Text: "${testText}"`);
console.log("");

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: testText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  console.log(`Response status: ${res.status} ${res.statusText}`);
  console.log(`Content-Type: ${res.headers.get("content-type")}`);
  console.log(`Content-Length: ${res.headers.get("content-length")}`);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`\nERROR RESPONSE BODY:\n${errorBody}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`\nAudio data received: ${buffer.length} bytes`);

  if (buffer.length < 100) {
    console.error("WARNING: Audio data suspiciously small, may not be valid MP3");
    console.log("First 50 bytes (hex):", buffer.subarray(0, 50).toString("hex"));
  }

  // Check MP3 magic bytes (ID3 tag or MPEG frame sync)
  const isMP3 = (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || // ID3
                (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0); // MPEG sync
  console.log(`Valid MP3 header: ${isMP3}`);

  const outputDir = path.resolve("data");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "test-elevenlabs.mp3");
  writeFileSync(outputPath, buffer);
  console.log(`\nSaved to: ${outputPath}`);
  console.log("SUCCESS: ElevenLabs API is working.");
} catch (err) {
  console.error("\nFETCH ERROR:", err);
  process.exit(1);
}
