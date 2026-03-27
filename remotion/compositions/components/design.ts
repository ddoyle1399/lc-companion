import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

// Must be called at module level — Remotion prefetches these before rendering
const { fontFamily: PLAYFAIR } = loadPlayfairDisplay("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: BARLOW } = loadBarlowCondensed("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});
const { fontFamily: LORA } = loadLora("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const { fontFamily: SPACE_MONO } = loadSpaceMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const FONTS = {
  display: PLAYFAIR,  // Poem text, titles, quotes — elegant serif
  label: BARLOW,      // Section eyebrows, condensed upper-case labels
  body: LORA,         // Analysis text, technique descriptions — warm readable serif
  ui: INTER,          // UI chrome, pills, card labels — clean modern sans-serif
  mono: SPACE_MONO,   // Technique names — monospace for a technical/academic feel
} as const;

export const COLORS = {
  // Backgrounds — warm, bright, student-friendly
  bg: "#FFF8EE",
  bgSoft: "#FFFDF7",
  bgPeach: "#FFF0E0",
  bgLavender: "#F5F0FF",
  bgBlue: "#F0F5FF",
  // Text — dark navy, not pure black
  navy: "#1B2838",
  navyMid: "rgba(27, 40, 56, 0.60)",
  navyDim: "rgba(27, 40, 56, 0.30)",
  navyFaint: "rgba(27, 40, 56, 0.08)",
  // Brand teal — primary accent
  teal: "#2A9D8F",
  tealDim: "rgba(42, 157, 143, 0.15)",
  tealBorder: "rgba(42, 157, 143, 0.30)",
  // Coral — secondary accent for emphasis
  coral: "#E07A5F",
  // Gold — highlight and accents
  gold: "#D4A84B",
  goldHighlight: "rgba(212, 168, 75, 0.15)",
  goldBorder: "rgba(212, 168, 75, 0.35)",
  // Cards
  cardBg: "rgba(255, 255, 255, 0.88)",
  cardShadow: "0 4px 20px rgba(0,0,0,0.08)",
  // Dividers
  divider: "rgba(27, 40, 56, 0.08)",
  tealDivider: "rgba(42, 157, 143, 0.25)",
  // Legacy aliases kept so old refs in design system still resolve
  cream: "#FFF8EE",
  white: "#FFFFFF",
  muted: "rgba(27, 40, 56, 0.50)",
  steel: "#5A7A8A",
  steelDim: "rgba(90, 122, 138, 0.30)",
  glass: "rgba(255, 255, 255, 0.80)",
  glassBorder: "rgba(27, 40, 56, 0.10)",
  goldDivider: "rgba(212, 168, 75, 0.25)",
  goldDim: "rgba(212, 168, 75, 0.15)",
  goldLight: "#E8C06A",
} as const;

export const LAYOUT = {
  // Panel split at 1920px wide
  poemPanelRight: 820,   // left panel ends here
  analysisPanelLeft: 880, // right panel starts here
  paddingH: 80,
  paddingV: 100,
  headerH: 90,
} as const;
