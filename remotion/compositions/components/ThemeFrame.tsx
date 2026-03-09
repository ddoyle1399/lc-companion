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
    // Take first 3 sentences as theme indicators
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

  // Header
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Calculate per-theme timing
  const themeStartFrame = 20;
  const perTheme = Math.floor(
    (durationInFrames - themeStartFrame - 15) / Math.max(themes.length, 1)
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
      {/* Section header */}
      <div
        style={{
          position: "absolute",
          top: 80,
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: headerOpacity,
        }}
      >
        THEMES
      </div>

      {/* Theme display area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          maxWidth: "70%",
        }}
      >
        {themes.map((theme, i) => {
          const start = themeStartFrame + i * perTheme;
          const enterOpacity = interpolate(
            frame,
            [start, start + 15],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );
          const enterY = interpolate(frame, [start, start + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });

          return (
            <div
              key={i}
              style={{
                opacity: enterOpacity,
                transform: `translateY(${enterY}px)`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 44,
                  color: "#FFFFFF",
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {theme.label}
              </div>
              {theme.quote && (
                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 18,
                    fontStyle: "italic",
                    color: "rgba(255, 255, 255, 0.5)",
                    marginTop: 10,
                  }}
                >
                  {"\u201C"}{theme.quote}{"\u201D"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key quote if present */}
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
          {"\u201C"}{keyQuote.text}{"\u201D"}
        </div>
      )}
    </div>
  );
};
