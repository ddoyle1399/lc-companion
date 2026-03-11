import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { CornerAccent } from "./CornerAccent";
import { AnimatedDots } from "./AnimatedDots";

const TEAL = "#2A9D8F";

interface ThemeData {
  name: string;
  supportingPoints: string[];
  quote?: string;
}

interface ThemeFrameProps {
  spokenText?: string;
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
  themes?: ThemeData[];
  durationInFrames: number;
}

/**
 * Fallback: extract themes from spokenText when no themes array is provided.
 */
function extractThemesFromText(spokenText?: string): ThemeData[] {
  if (!spokenText) return [];

  const sentences = spokenText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length === 0) return [];

  const themes: ThemeData[] = [];
  const prefixes = [
    /^the poem explores\s*/i,
    /^a key theme is\s*/i,
    /^another theme is\s*/i,
    /^the central theme of\s*/i,
    /^one of the main themes is\s*/i,
    /^first,?\s*/i,
    /^second,?\s*/i,
    /^third,?\s*/i,
    /^finally,?\s*/i,
    /^two themes dominate here\s*/i,
  ];

  let currentTheme: ThemeData | null = null;
  for (const sentence of sentences) {
    let cleaned = sentence;
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, "");
    }
    cleaned = cleaned.trim();
    if (!cleaned) continue;

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount <= 6) {
      if (currentTheme) themes.push(currentTheme);
      currentTheme = { name: cleaned, supportingPoints: [] };
    } else if (currentTheme) {
      currentTheme.supportingPoints.push(cleaned);
    } else {
      const words = cleaned.split(/\s+/);
      const name = words.slice(0, 4).join(" ");
      currentTheme = { name, supportingPoints: [cleaned] };
    }
  }
  if (currentTheme) themes.push(currentTheme);

  return themes.slice(0, 4);
}

/**
 * Renders a single theme with staggered build-up animation.
 */
const SingleTheme: React.FC<{
  theme: ThemeData;
  startFrame: number;
  endFrame: number;
  isLast: boolean;
}> = ({ theme, startFrame, endFrame, isLast }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  if (frame < startFrame || frame >= endFrame) return null;

  // Fade out with scale-down
  const fadeOutStart = isLast ? duration - 15 : duration - 20;
  const fadeOut = interpolate(
    localFrame,
    [fadeOutStart, fadeOutStart + 15],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitScale = interpolate(
    localFrame,
    [fadeOutStart, fadeOutStart + 15],
    [1, 0.98],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Entrance scale (0.98 to 1.0)
  const entranceScale = interpolate(localFrame, [0, 18], [0.98, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Theme name fade in
  const nameOpacity = interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Slow upward drift
  const nameDrift = interpolate(localFrame, [0, duration], [0, -3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Supporting points
  const pointTimings = theme.supportingPoints.map((_, i) => ({
    fadeStart: 25 + i * 25,
  }));

  // Quote appears after last point
  const lastPointStart =
    theme.supportingPoints.length > 0
      ? 25 + (theme.supportingPoints.length - 1) * 25
      : 25;
  const quoteStart = lastPointStart + 18;

  const combinedScale = entranceScale * exitScale;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: fadeOut,
        transform: `scale(${combinedScale})`,
      }}
    >
      {/* Theme name */}
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 52,
          fontWeight: "bold",
          color: "#FFFFFF",
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          opacity: nameOpacity,
          transform: `translateY(${nameDrift}px)`,
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {theme.name}
      </div>

      {/* Animated dots as divider */}
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <AnimatedDots delay={startFrame + 12} />
      </div>

      {/* Supporting points */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {theme.supportingPoints.map((point, i) => {
          const pointFadeStart = pointTimings[i].fadeStart;
          const pointOpacity = interpolate(
            localFrame,
            [pointFadeStart, pointFadeStart + 18],
            [0, 0.7],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );
          const pointDrift = interpolate(
            localFrame,
            [pointFadeStart, duration],
            [0, -3],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 20,
                color: "#FFFFFF",
                opacity: pointOpacity,
                transform: `translateY(${pointDrift}px)`,
                textAlign: "center",
                maxWidth: 700,
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span style={{ color: TEAL, fontSize: 14 }}>{"\u2022"}</span>
              <span>{point}</span>
            </div>
          );
        })}
      </div>

      {/* Quote with left-slide entrance */}
      {theme.quote && (
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22,
            fontStyle: "italic",
            color: "#FFFFFF",
            opacity: interpolate(
              localFrame,
              [quoteStart, quoteStart + 18],
              [0, 0.5],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.quad),
              }
            ),
            transform: `translateX(${interpolate(
              localFrame,
              [quoteStart, quoteStart + 18],
              [-10, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)`,
            marginTop: 20,
            textAlign: "center",
            maxWidth: 500,
          }}
        >
          {"\u201C"}
          {theme.quote}
          {"\u201D"}
        </div>
      )}
    </div>
  );
};

export const ThemeFrame: React.FC<ThemeFrameProps> = ({
  spokenText,
  keyQuote,
  themes: themesFromProps,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const themes =
    themesFromProps && themesFromProps.length > 0
      ? themesFromProps
      : extractThemesFromText(spokenText);

  // Header fade in
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Global fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Calculate per-theme timing
  const themeStartFrame = 18;
  const gapFrames = 5;
  const themeCount = Math.max(themes.length, 1);
  const totalGapFrames = (themeCount - 1) * gapFrames;
  const availableFrames = durationInFrames - themeStartFrame - 15 - totalGapFrames;
  const perThemeFrames = Math.floor(availableFrames / themeCount);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Corner accents */}
      <CornerAccent corner="topLeft" delay={0} opacity={0.06} />
      <CornerAccent corner="bottomRight" delay={0} opacity={0.06} />

      {/* THEMES header */}
      <div
        style={{
          position: "absolute",
          top: 80,
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: headerOpacity * 0.9,
        }}
      >
        THEMES
      </div>

      {/* Theme content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "80%",
        }}
      >
        {themes.map((theme, i) => {
          const start = themeStartFrame + i * (perThemeFrames + gapFrames);
          const end = start + perThemeFrames;
          const isLast = i === themes.length - 1;

          return (
            <SingleTheme
              key={i}
              theme={theme}
              startFrame={start}
              endFrame={end}
              isLast={isLast}
            />
          );
        })}
      </div>

      {/* Key quote at bottom if present */}
      {keyQuote && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22,
            fontStyle: "italic",
            color: "rgba(255, 255, 255, 0.4)",
            maxWidth: "60%",
            textAlign: "center",
            opacity: interpolate(frame, [30, 48], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {"\u201C"}
          {keyQuote.text}
          {"\u201D"}
        </div>
      )}
    </div>
  );
};
