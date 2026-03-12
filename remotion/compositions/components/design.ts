import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";

// Must be called at module level — Remotion prefetches these before rendering
const { fontFamily: PLAYFAIR } = loadPlayfairDisplay();
const { fontFamily: BARLOW } = loadBarlowCondensed();
const { fontFamily: LORA } = loadLora();

export const FONTS = {
  display: PLAYFAIR,   // Poem text, titles, quotes — elegant serif
  label: BARLOW,       // Section labels, eyebrows, UI chrome — condensed sans
  body: LORA,          // Analysis text, technique descriptions — warm readable serif
} as const;

export const COLORS = {
  // Backgrounds
  bg: "#0A0E1A",
  bgDeep: "#060810",
  // Primary accent — warm editorial gold (Penguin Classics / Faber)
  gold: "#C4965A",
  goldLight: "#D4AA72",
  goldDim: "rgba(196, 150, 90, 0.22)",
  goldGlow: "rgba(196, 150, 90, 0.10)",
  goldBorder: "rgba(196, 150, 90, 0.28)",
  // Text
  cream: "#F2E8D5",    // Poem text — warm, like aged paper
  white: "#FFFFFF",
  muted: "rgba(255, 255, 255, 0.50)",
  // Secondary UI
  steel: "#7D9BB5",
  steelDim: "rgba(125, 155, 181, 0.35)",
  // Glass panels
  glass: "rgba(255, 255, 255, 0.04)",
  glassBorder: "rgba(255, 255, 255, 0.09)",
  // Dividers
  divider: "rgba(255, 255, 255, 0.07)",
  goldDivider: "rgba(196, 150, 90, 0.25)",
  // Brand teal — keep for consistency
  teal: "#2A9D8F",
} as const;

export const LAYOUT = {
  // Panel split at 1920px wide
  poemPanelRight: 820,   // left panel ends here
  analysisPanelLeft: 880, // right panel starts here
  paddingH: 80,
  paddingV: 100,
  headerH: 90,
} as const;
