import { NextRequest } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
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

          compositionSections = audioSections.map((audio, i) => ({
            type: finalScript.sections[i].type,
            highlightLines: finalScript.sections[i].highlightLines,
            durationInFrames: Math.round(audio.durationSeconds * FPS),
            audioSrc: `file://${audio.filePath}`,
            spokenText: finalScript.sections[i].spokenText,
            keyQuote: finalScript.sections[i].keyQuote,
            techniques: finalScript.sections[i].techniques,
          }));
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

        // Copy to data/videos
        const videosDir = path.join(process.cwd(), "data", "videos");
        await fs.mkdir(videosDir, { recursive: true });
        const filename = `${slugify(poet)}--${slugify(poem)}--${Date.now()}.mp4`;
        const finalPath = path.join(videosDir, filename);
        await fs.copyFile(outputPath, finalPath);

        send({
          stage: "complete",
          progress: 1,
          message: "Video ready!",
          videoUrl: `/api/video/download?file=${encodeURIComponent(filename)}`,
        });

        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      } catch (error) {
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
