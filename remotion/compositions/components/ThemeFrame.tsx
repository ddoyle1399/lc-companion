import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";

interface ThemeFrameProps {
  spokenText?: string;
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

/**
 * Extract theme keywords from spoken text.
 * Looks for capitalised words or short phrases that represent themes.
 * Falls back to technique names if available.
 */
function extractThemes(
  spokenText?: string,
  techniques?: { name: string; quote: string; effect: string }[]
): { label: string; quote: string }[] {
  const themes: { label: string; quote: string }[] = [];

  if (techniques && techniques.length > 0) {
    for (const t of techniques) {
      themes.push({ label: t.name, quote: t.quote });
    }
  }

  // If no techniques, extract key phrases from spoken text
  if (themes.length === 0 && spokenText) {
    const sentences = spokenText.split(/[.!?]+/).filter((s) => s.trim());
    for (const s of sentences.slice(0, 3)) {
      const trimmed = s.trim();
      if (trimmed.length > 5) {
        const words = trimmed.split(/\s+/).slice(0, 4).join(" ");
        themes.push({ label: words, quote: "" });
      }
    }
  }

  return themes.slice(0, 4);
}

export const ThemeFrame: React.FC<ThemeFrameProps> = ({
  spokenText,
  keyQuote,
  techniques,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const themes = extractThemes(spokenText, techniques);

  // Header fade in
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Per-theme timing: crossfade between themes
  const themeStartFrame = 20;
  const crossfadeDuration = 15;
  const perTheme = Math.floor(
    (durationInFrames - themeStartFrame - 15) / Math.max(themes.length, 1)
  );

  // Determine which theme is currently active
  const activeThemeIndex = Math.min(
    Math.floor(Math.max(0, frame - themeStartFrame) / perTheme),
    themes.length - 1
  );

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
      {/* Section header with opacity pulse (Change 4) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: headerOpacity * (0.9 + 0.1 * Math.sin(frame * 0.05)),
        }}
      >
        THEMES
      </div>

      {/* Theme display area - crossfade between themes */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "70%",
          position: "relative",
          minHeight: 200,
          justifyContent: "center",
        }}
      >
        {themes.map((theme, i) => {
          const start = themeStartFrame + i * perTheme;
          const end = start + perTheme;

          // Fade in
          const enterOpacity = interpolate(
            frame,
            [start, start + crossfadeDuration],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Scale up from 0.95 to 1.0
          const enterScale = interpolate(
            frame,
            [start, start + crossfadeDuration],
            [0.95, 1.0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Fade out (crossfade to next theme)
          const exitOpacity =
            i < themes.length - 1
              ? interpolate(
                  frame,
                  [end - crossfadeDuration, end],
                  [1, 0],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.in(Easing.quad),
                  }
                )
              : 1;

          const opacity = enterOpacity * exitOpacity;

          // Slow upward drift while visible (Change 4)
          const drift = interpolate(
            frame,
            [start, end],
            [0, -5],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Quote fade in (15 frames after theme label)
          const quoteOpacity = interpolate(
            frame,
            [start + crossfadeDuration, start + crossfadeDuration + 15],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Teal underline draws itself under theme word
          const underlineWidth = interpolate(
            frame,
            [start + 5, start + 20],
            [0, 100],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Only render if theme has any visibility
          if (frame < start || opacity < 0.01) return null;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                opacity,
                transform: `translateY(${drift}px) scale(${enterScale})`,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Theme label */}
              <div
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 48,
                  color: "#FFFFFF",
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {theme.label}
              </div>

              {/* Teal underline */}
              <div
                style={{
                  width: `${underlineWidth}%`,
                  maxWidth: 300,
                  height: 2,
                  backgroundColor: TEAL,
                  marginTop: 12,
                  marginBottom: 16,
                  opacity: 0.7,
                }}
              />

              {/* Supporting quote */}
              {theme.quote && (
                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 18,
                    fontStyle: "italic",
                    color: "rgba(255, 255, 255, 0.5)",
                    opacity: quoteOpacity,
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
            opacity: interpolate(frame, [30, 50], [0, 1], {
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
