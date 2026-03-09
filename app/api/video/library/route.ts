import { NextRequest } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

interface VideoMetadata {
  year: string;
  level: string;
  poet: string;
  poem: string;
  createdAt: string;
  duration: number;
  fileSize: number;
  hasAudio: boolean;
  videoFile: string;
}

const VIDEOS_DIR = path.join(process.cwd(), "data", "videos");

export async function GET() {
  try {
    await fs.mkdir(VIDEOS_DIR, { recursive: true });
    const files = await fs.readdir(VIDEOS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const videos: VideoMetadata[] = [];
    for (const jsonFile of jsonFiles) {
      try {
        const content = await fs.readFile(
          path.join(VIDEOS_DIR, jsonFile),
          "utf-8"
        );
        const metadata: VideoMetadata = JSON.parse(content);

        // Verify the MP4 file still exists
        try {
          await fs.access(path.join(VIDEOS_DIR, metadata.videoFile));
          videos.push(metadata);
        } catch {
          // MP4 missing, skip this entry
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Sort newest first
    videos.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return Response.json(videos);
  } catch {
    return Response.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("file");

  if (!filename) {
    return Response.json({ error: "Missing file parameter" }, { status: 400 });
  }

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return Response.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const mp4Path = path.join(VIDEOS_DIR, filename);
    const jsonPath = path.join(
      VIDEOS_DIR,
      filename.replace(/\.mp4$/, ".json")
    );

    await fs.rm(mp4Path, { force: true });
    await fs.rm(jsonPath, { force: true });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
