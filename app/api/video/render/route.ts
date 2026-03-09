import { NextRequest } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import http from "node:http";
import {
  isConfigured,
  generateSectionAudio,
} from "@/lib/video/elevenlabs";
import type { VideoScript, PoemVideoProps, VideoPipelineEvent } from "@/lib/video/types";
import { getCopyrightMode } from "@/src/data/poets.config";
import { generateVideoScript } from "@/lib/video/script-formatter";
import { getClient } from "@/lib/claude/client";
import {
  buildSystemPrompt,
  buildPoetryNotePrompt,
  type PromptContext,
} from "@/lib/claude/prompts";
import { buildPoetExamSummary } from "@/data/exam-patterns";
import { getPoemsForPoet, getOLPoemsForPoet } from "@/data/circulars";
import { getPoemText } from "@/lib/poems/store";

function sseEvent(data: VideoPipelineEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Start a temporary HTTP server to serve audio files from a directory.
 * Remotion requires http:// URLs for audio assets.
 */
async function startAudioServer(audioDir: string): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer((req, res) => {
    const rawUrl = req.url || "/";
    const filename = decodeURIComponent(rawUrl.slice(1));
    const filePath = path.join(audioDir, filename);

    console.log(`[audio-server] Request: ${rawUrl} -> filename="${filename}" -> filePath="${filePath}"`);

    // Only serve .mp3 files from the audio directory
    if (!filename || !filename.endsWith(".mp3") || filename.includes("..")) {
      console.log(`[audio-server] 404: invalid filename "${filename}"`);
      res.writeHead(404);
      res.end();
      return;
    }

    const fileStream = createReadStream(filePath);
    fileStream.on("error", (err) => {
      console.log(`[audio-server] 404: file read error for "${filePath}":`, err.message);
      res.writeHead(404);
      res.end();
    });
    fileStream.on("open", () => {
      console.log(`[audio-server] 200: serving "${filePath}"`);
    });
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    fileStream.pipe(res);
  });

  // Let the OS assign a random available port
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;

  return { server, port };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Generate a poetry note using the same logic as /api/generate (poetry mode).
 * Returns the full note text, non-streaming.
 */
async function generatePoetryNote(
  poet: string,
  poem: string,
  poemText: string | null,
  year: number,
  level: "HL" | "OL",
): Promise<string> {
  const context: PromptContext = {
    year,
    circular: year === 2027 ? "0021/2025" : "0016/2024",
    level,
    contentType: "poetry",
    poet,
    poem,
    examSummary: buildPoetExamSummary(poet),
    prescribedPoems:
      level === "HL" ? getPoemsForPoet(year, poet) : getOLPoemsForPoet(year, poet),
  };

  if (poemText) {
    context.poemText = poemText;
  } else {
    const storedText = await getPoemText(poet, poem);
    if (storedText) {
      context.poemText = storedText;
    }
  }

  const useWebSearch = !context.poemText;
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = buildPoetryNotePrompt(context);
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    ...(useWebSearch
      ? {
          tools: [
            {
              type: "web_search_20250305" as const,
              name: "web_search" as const,
              max_uses: 3,
            },
          ],
        }
      : {}),
  });

  const textBlocks = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text);

  if (textBlocks.length === 0) {
    throw new Error("No text content in poetry note response");
  }

  return textBlocks.join("\n\n");
}

interface RenderRequestBody {
  poet: string;
  poem: string;
  poemText: string;
  year: number;
  level: "HL" | "OL";
  poetryNote?: string;
  script?: VideoScript;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RenderRequestBody;
  const { poet, poem, poemText, year, level } = body;
  let { poetryNote, script } = body;

  if (!poet || !poem || !poemText || !year || !level) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: poet, poem, poemText, year, level" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: VideoPipelineEvent) {
        controller.enqueue(encoder.encode(sseEvent(event)));
      }

      let audioServer: { server: http.Server; port: number } | null = null;

      try {
        // Step 1: Generate poetry note if not provided
        if (!poetryNote) {
          send({
            stage: "note",
            progress: 0,
            message: "Generating poetry note...",
          });

          poetryNote = await generatePoetryNote(poet, poem, poemText, year, level);

          send({
            stage: "note",
            progress: 1,
            message: "Poetry note generated.",
            noteText: poetryNote,
          });
        }

        // Step 2: Generate video script if not provided
        if (!script) {
          send({
            stage: "script",
            progress: 0,
            message: "Generating video script...",
          });

          script = await generateVideoScript(poet, poem, poemText, poetryNote, year, level);

          send({
            stage: "script",
            progress: 1,
            message: "Video script generated.",
            script,
          });

          // Stop here so the client can review the script before rendering
          controller.close();
          return;
        }

        // Step 3: Audio generation and video rendering
        // At this point script is guaranteed to exist (we returned above if it wasn't)
        const finalScript = script as VideoScript;
        const isSilentMode = !isConfigured();

        const tmpDir = path.join("/tmp", `lc-video-${Date.now()}`);
        await fs.mkdir(tmpDir, { recursive: true });

        const FPS = 30;
        const titleDurationInFrames = 90;
        const closingDurationInFrames = 60;
        const poemLines = poemText.split("\n");

        let compositionSections: PoemVideoProps["sections"];

        if (isSilentMode) {
          send({
            stage: "render",
            progress: 0,
            message: "Silent mode: no audio server detected. Using estimated durations.",
          });

          compositionSections = finalScript.sections.map((section) => {
            const wordCount = section.spokenText.split(/\s+/).length;
            const durationSeconds = section.estimatedDuration || wordCount / 2.5;
            return {
              type: section.type,
              highlightLines: section.highlightLines,
              durationInFrames: Math.round(durationSeconds * FPS),
              audioSrc: "",
              spokenText: section.spokenText,
              keyQuote: section.keyQuote,
              techniques: section.techniques,
            };
          });
        } else {
          const audioSections = [];
          const total = finalScript.sections.length;

          for (let i = 0; i < total; i++) {
            send({
              stage: "audio",
              progress: i / total,
              message: `Generating audio: section ${i + 1} of ${total}...`,
              sectionIndex: i,
            });

            const audio = await generateSectionAudio(
              finalScript.sections[i],
              tmpDir
            );
            audioSections.push(audio);
          }

          send({
            stage: "audio",
            progress: 1,
            message: "Audio generation complete.",
          });

          // Start a local HTTP server to serve audio files to Remotion
          audioServer = await startAudioServer(tmpDir);
          console.log(`[video-render] Audio server started on port ${audioServer.port}, serving from ${tmpDir}`);

          // List audio files in temp dir for debugging
          const tmpFiles = await fs.readdir(tmpDir);
          console.log(`[video-render] Files in tmpDir:`, tmpFiles);

          compositionSections = audioSections.map((audio, i) => {
            // If audio generation failed for this section, filePath will be empty
            const hasAudio = audio.filePath && audio.filePath.length > 0;
            const audioFilename = hasAudio ? path.basename(audio.filePath) : "";
            const audioSrc = hasAudio
              ? `http://127.0.0.1:${audioServer!.port}/${encodeURIComponent(audioFilename)}`
              : "";

            console.log(`[video-render] Section ${i} (${finalScript.sections[i].id}): filePath="${audio.filePath}", audioSrc="${audioSrc}"`);

            return {
              type: finalScript.sections[i].type,
              highlightLines: finalScript.sections[i].highlightLines,
              durationInFrames: Math.round(audio.durationSeconds * FPS),
              audioSrc,
              spokenText: finalScript.sections[i].spokenText,
              keyQuote: finalScript.sections[i].keyQuote,
              techniques: finalScript.sections[i].techniques,
            };
          });
        }

        // Verify bundle exists
        const bundlePath = path.resolve(".remotion-bundle");
        try {
          await fs.access(bundlePath);
        } catch {
          send({
            stage: "error",
            progress: 0,
            message: "Remotion bundle not found. Run: npm run bundle:remotion",
          });
          controller.close();
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          return;
        }

        const copyrightMode = getCopyrightMode(poet);

        console.log(`[video-render] Composition sections audioSrc values:`, compositionSections.map((s, i) => `${i}: "${s.audioSrc}"`));

        const inputProps: PoemVideoProps = {
          poemTitle: finalScript.poemTitle,
          poet: finalScript.poet,
          poemLines,
          copyrightMode,
          sections: compositionSections,
          titleDurationInFrames,
          closingDurationInFrames,
        };

        const totalFrames =
          titleDurationInFrames +
          compositionSections.reduce((sum, s) => sum + s.durationInFrames, 0) +
          closingDurationInFrames;

        send({
          stage: "render",
          progress: 0,
          message: "Starting video render...",
        });

        const { selectComposition, renderMedia } = await import(
          "@remotion/renderer"
        );

        const propsRecord = inputProps as unknown as Record<string, unknown>;

        const composition = await selectComposition({
          serveUrl: bundlePath,
          id: "PoemVideo",
          inputProps: propsRecord,
        });

        const outputPath = path.join(tmpDir, "output.mp4");

        await renderMedia({
          composition: {
            ...composition,
            durationInFrames: totalFrames,
          },
          serveUrl: bundlePath,
          codec: "h264",
          outputLocation: outputPath,
          inputProps: propsRecord,
          onProgress: ({ progress }) => {
            send({
              stage: "render",
              progress,
              message: `Rendering video: ${Math.round(progress * 100)}%...`,
            });
          },
        });

        // Copy to data/videos with persistent metadata
        const videosDir = path.join(process.cwd(), "data", "videos");
        await fs.mkdir(videosDir, { recursive: true });
        const now = new Date();
        const baseName = `${year}-${slugify(poet)}-${slugify(poem)}-${formatTimestamp(now)}`;
        const filename = `${baseName}.mp4`;
        const finalPath = path.join(videosDir, filename);
        await fs.copyFile(outputPath, finalPath);

        // Save metadata JSON
        const stat = await fs.stat(finalPath);
        const totalDurationSeconds = compositionSections.reduce(
          (sum, s) => sum + s.durationInFrames / FPS,
          0
        ) + titleDurationInFrames / FPS + closingDurationInFrames / FPS;

        const metadata = {
          year: String(year),
          level,
          poet,
          poem,
          createdAt: now.toISOString(),
          duration: Math.round(totalDurationSeconds),
          fileSize: stat.size,
          hasAudio: !isSilentMode,
          videoFile: filename,
        };
        await fs.writeFile(
          path.join(videosDir, `${baseName}.json`),
          JSON.stringify(metadata, null, 2)
        );

        send({
          stage: "complete",
          progress: 1,
          message: "Video saved automatically.",
          videoUrl: `/api/video/download?file=${encodeURIComponent(filename)}`,
        });

        // Shut down audio server
        if (audioServer) {
          audioServer.server.close();
        }

        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      } catch (error) {
        if (audioServer) audioServer.server.close();
        const message =
          error instanceof Error ? error.message : "Render failed";
        send({ stage: "error", progress: 0, message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
