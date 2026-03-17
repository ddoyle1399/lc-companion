import OpenAI from "openai";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { VideoScript } from "./types";

const STYLE_PREFIX =
  "Soft watercolour illustration style, warm colours, no text, no words, no letters, no numbers, educational feel, gentle and approachable. Simple clean composition with plenty of negative space on the left side for text overlay.";

interface SectionImage {
  sectionId: number;
  prompt: string;
  imagePath: string;
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder_for_image_generation") {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate a background image for one video section.
 * Returns the path to the saved PNG file.
 */
export async function generateSectionImage(
  prompt: string,
  outputPath: string
): Promise<string> {
  const client = getClient();

  const fullPrompt = `${STYLE_PREFIX} ${prompt}`;

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: "1792x1024",
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data returned from DALL-E");
  }

  const buffer = Buffer.from(b64, "base64");
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

/**
 * Generate background images for all sections in a video script that have an imagePrompt.
 * Falls back gracefully if OPENAI_API_KEY is not set or any call fails.
 */
export async function generateVideoImages(
  script: VideoScript,
  outputDir: string
): Promise<SectionImage[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder_for_image_generation") {
    console.log(
      "Skipping image generation (no OPENAI_API_KEY). Using solid colour backgrounds."
    );
    return [];
  }

  await fs.mkdir(outputDir, { recursive: true });

  const results: SectionImage[] = [];

  for (let i = 0; i < script.sections.length; i++) {
    const section = script.sections[i];
    if (!section.imagePrompt) continue;

    const imagePath = path.join(outputDir, `section-${i}.png`);

    try {
      console.log(`[image-gen] Generating visual for section ${i + 1} of ${script.sections.length}: ${section.id}`);
      await generateSectionImage(section.imagePrompt, imagePath);
      results.push({ sectionId: i, prompt: section.imagePrompt, imagePath });
      console.log(`[image-gen] Section ${i + 1} done.`);
    } catch (err) {
      console.warn(
        `[image-gen] Warning: failed to generate image for section ${i} (${section.id}):`,
        err instanceof Error ? err.message : err
      );
    }

    // 1-second delay between API calls to avoid rate limiting
    if (i < script.sections.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
