import { NextRequest } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  checkVoiceboxHealth,
  generateSectionAudio,
  getVoiceboxConfig,
} from "@/lib/video/voicebox";
import type { VideoScript, PoemVideoProps, VideoPipelineEvent } from "@/lib/video/types";

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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { script, poemText, poet, poem } = body as {
    script: VideoScript;
    poemText: string;
    poet: string;
    poem: string;
  };

  if (!script || !poemText || !poet || !poem) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
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
        // Check Voicebox health
        const config = getVoiceboxConfig();
        const healthy = await checkVoiceboxHealth(config.serverUrl);
        if (!healthy) {
          send({
            stage: "error",
            progress: 0,
            message:
              "Voicebox server is not running. Start it at " +
              config.serverUrl,
          });
          controller.close();
          return;
        }

        // Create temp directory for audio files
        const tmpDir = path.join(
          "/tmp",
          `lc-video-${Date.now()}`
        );
        await fs.mkdir(tmpDir, { recursive: true });

        // Audio generation stage
        const audioSections = [];
        const total = script.sections.length;

        for (let i = 0; i < total; i++) {
          send({
            stage: "audio",
            progress: i / total,
            message: `Generating audio: section ${i + 1} of ${total}...`,
            sectionIndex: i,
          });

          const audio = await generateSectionAudio(
            script.sections[i],
            tmpDir,
            config
          );
          audioSections.push(audio);
        }

        send({
          stage: "audio",
          progress: 1,
          message: "Audio generation complete.",
        });

        // Verify bundle exists
        const bundlePath = path.resolve(".remotion-bundle");
        try {
          await fs.access(bundlePath);
        } catch {
          send({
            stage: "error",
            progress: 0,
            message:
              "Remotion bundle not found. Run: npm run bundle:remotion",
          });
          controller.close();
          // Clean up temp dir
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          return;
        }

        // Build composition props
        const poemLines = poemText.split("\n");
        const FPS = 30;
        const titleDurationInFrames = 90; // 3 seconds
        const closingDurationInFrames = 60; // 2 seconds

        const compositionSections = audioSections.map((audio, i) => ({
          type: script.sections[i].type,
          highlightLines: script.sections[i].highlightLines,
          durationInFrames: Math.round(audio.durationSeconds * FPS),
          audioSrc: `file://${audio.filePath}`,
        }));

        const inputProps: PoemVideoProps = {
          poemTitle: script.poemTitle,
          poet: script.poet,
          poemLines,
          sections: compositionSections,
          titleDurationInFrames,
          closingDurationInFrames,
        };

        const totalFrames =
          titleDurationInFrames +
          compositionSections.reduce((sum, s) => sum + s.durationInFrames, 0) +
          closingDurationInFrames;

        // Render stage
        send({
          stage: "render",
          progress: 0,
          message: "Starting video render...",
        });

        // Dynamic import to avoid Next.js bundling issues
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

        // Clean up temp directory
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
