import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { PoemVideoProps } from "../lib/video/types";

const FPS = 30;

const poemLines = [
  "I will arise and go now, and go to Innisfree,",
  "And a small cabin build there, of clay and wattles made;",
  "Nine bean-rows will I have there, a hive for the honey-bee,",
  "And live alone in the bee-loud glade.",
  "",
  "And I shall have some peace there, for peace comes dropping slow,",
  "Dropping from the veils of the morning to where the cricket sings;",
  "There midnight's all a glimmer, and noon a purple glow,",
  "And evening full of the linnet's wings.",
  "",
  "I will arise and go now, for always night and day",
  "I hear lake water lapping with low sounds by the shore;",
  "While I stand on the roadway, or on the pavements grey,",
  "I hear it in the deep heart's core.",
];

const sections: PoemVideoProps["sections"] = [
  {
    type: "intro",
    highlightLines: [],
    durationInFrames: 15 * FPS,
    audioSrc: "",
    spokenText: "Yeats wrote this poem in 1890 while living in London. It captures a deep longing for nature and escape from city life.",
    imagePrompt: "Soft watercolour of an old writing desk overlooking a misty Irish lake, warm golden light, with plenty of empty space on the left for text overlay",
  },
  {
    type: "stanza_analysis",
    highlightLines: [0, 1, 2, 3],
    durationInFrames: 25 * FPS,
    audioSrc: "",
    spokenText: "Look at the opening. 'I will arise and go now.'",
    keyQuote: { text: "I will arise and go now", lineIndex: 0 },
    imagePrompt: "Gentle watercolour of a small rustic cabin surrounded by wildflowers and beehives, warm morning light, with plenty of empty space on the left for text overlay",
    techniques: [
      { name: "Biblical Allusion", quote: "I will arise and go", effect: "Echoes the parable of the prodigal son, giving the speaker's desire a sense of spiritual urgency" },
      { name: "Concrete Imagery", quote: "clay and wattles made", effect: "Grounds the fantasy of escape in physical, achievable detail" },
    ],
  },
  {
    type: "stanza_analysis",
    highlightLines: [5, 6, 7, 8],
    durationInFrames: 25 * FPS,
    audioSrc: "",
    spokenText: "The second stanza shifts from action to stillness.",
    keyQuote: { text: "peace comes dropping slow", lineIndex: 5 },
    imagePrompt: "Soft watercolour of a peaceful lake at twilight with gentle ripples, purple and gold sky, with plenty of empty space on the left for text overlay",
    techniques: [
      { name: "Assonance", quote: "dropping, veils, glimmer, glow", effect: "Long vowel sounds slow the rhythm, mirroring the peacefulness described" },
      { name: "Sensory Imagery", quote: "midnight's all a glimmer, and noon a purple glow", effect: "Appeals to sight and colour to create a vivid, almost dreamlike picture of Innisfree" },
    ],
  },
  {
    type: "stanza_analysis",
    highlightLines: [10, 11, 12, 13],
    durationInFrames: 20 * FPS,
    audioSrc: "",
    spokenText: "The final stanza brings you back to reality.",
    keyQuote: { text: "I hear it in the deep heart's core", lineIndex: 13 },
    imagePrompt: "Gentle watercolour of a person standing on a grey city pavement looking up at the sky, warm tones breaking through clouds, with plenty of empty space on the left for text overlay",
    techniques: [
      { name: "Contrast", quote: "roadway...pavements grey", effect: "Juxtaposes dull urban reality with the vivid natural world of Innisfree" },
      { name: "Metaphor", quote: "the deep heart's core", effect: "Innisfree becomes an internal place, not just a physical destination" },
    ],
  },
  {
    type: "theme",
    highlightLines: [],
    durationInFrames: 20 * FPS,
    audioSrc: "",
    spokenText: "Two themes dominate here. First, nature as escape. Innisfree represents freedom from the grey urban world of London. Every sensory detail builds a paradise of sound and colour. Second, memory and longing. The speaker does not physically go to Innisfree. He hears it in his mind. Innisfree lives in the deep heart's core, not on any map.",
    imagePrompt: "Soft watercolour of a winding path between a forest and a city, warm dreamy atmosphere, with plenty of empty space on the left for text overlay",
    keyQuote: { text: "bee-loud glade", lineIndex: 3 },
    techniques: [
      { name: "Onomatopoeia", quote: "bee-loud", effect: "Makes the natural world audible, reinforcing nature as a living, sensory escape" },
    ],
    themes: [
      {
        name: "Nature as Escape",
        supportingPoints: [
          "Innisfree represents freedom from the grey urban world of London.",
          "Every sensory detail builds a paradise of sound and colour.",
          "Nature is not just scenery but a source of spiritual peace.",
        ],
        quote: "peace comes dropping slow",
      },
      {
        name: "Memory and Longing",
        supportingPoints: [
          "The speaker does not physically go to Innisfree. He hears it in his mind.",
          "The repetition of 'I will arise' suggests an unfulfilled desire.",
          "Innisfree lives in the deep heart's core, not on any map.",
        ],
        quote: "I hear it in the deep heart's core",
      },
    ],
  },
  {
    type: "exam_connection",
    highlightLines: [],
    durationInFrames: 12 * FPS,
    audioSrc: "",
    spokenText: "This poem pairs well with questions on nature, memory, and the contrast between urban and rural life. It connects strongly to other Yeats poems that explore the tension between the real and the ideal.",
    imagePrompt: "Clean soft watercolour of an open notebook with a pen on a wooden desk, warm studious atmosphere, with plenty of empty space on the left for text overlay",
    examConnection: {
      questionTypes: [
        "Nature and sense of place",
        "Personal response to a poet's work",
        "The poet's use of imagery and sound",
      ],
      linkedPoems: [
        "The Wild Swans at Coole",
        "Sailing to Byzantium",
        "An Irish Airman Foresees his Death",
      ],
      examTip: "This poem suits any question on nature, memory, or the contrast between urban and rural life.",
    },
  },
  {
    type: "outro",
    highlightLines: [],
    durationInFrames: 5 * FPS,
    audioSrc: "",
    spokenText: "Know this poem inside out. It comes up regularly and rewards close reading.",
    imagePrompt: "Soft watercolour of a peaceful Irish landscape with rolling green hills and a distant lake, golden hour light, with plenty of empty space on the left for text overlay",
    outroData: {
      closingLine: "Know this poem inside out. It comes up regularly and rewards close reading.",
      poemTitle: "The Lake Isle of Innisfree",
      poetName: "W.B. Yeats",
    },
  },
];

const titleDurationInFrames = 90; // 3s
const closingDurationInFrames = 60; // 2s

const inputProps: PoemVideoProps = {
  poemTitle: "The Lake Isle of Innisfree",
  poet: "W.B. Yeats",
  poemLines,
  copyrightMode: "public_domain",
  sections,
  titleDurationInFrames,
  closingDurationInFrames,
};

const totalFrames =
  titleDurationInFrames +
  sections.reduce((sum, s) => sum + s.durationInFrames, 0) +
  closingDurationInFrames;

async function main() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "placeholder_for_image_generation") {
    console.log("Skipping image generation (no OPENAI_API_KEY). Using solid colour backgrounds.");
  }

  console.log("Bundling Remotion composition...");
  const entryPoint = path.resolve("remotion/index.ts");
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });
  console.log(`Bundle complete: ${bundled}`);

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "PoemVideo",
    inputProps: inputProps as unknown as Record<string, unknown>,
  });

  const outputDir = path.resolve("data/videos");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "test-innisfree.mp4");

  console.log(`Rendering ${totalFrames} frames (${(totalFrames / FPS).toFixed(1)}s) to ${outputPath}...`);
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: totalFrames,
    },
    serveUrl: bundled,
    codec: "h264",
    jpegQuality: 95,
    outputLocation: outputPath,
    inputProps: inputProps as unknown as Record<string, unknown>,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`);
      }
    },
  });

  console.log(`\nDone! Video saved to ${outputPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
