import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";
const LINE_STAGGER = 8; // frames between each line appearing

interface StanzaDisplayProps {
  poemLines: string[];
  highlightLines: number[];
  durationInFrames: number;
  keyQuote?: { text: string; lineIndex: number };
  sectionIndex: number;
}

export const StanzaDisplay: React.FC<StanzaDisplayProps> = ({
  poemLines,
  highlightLines,
  durationInFrames,
  keyQuote,
  sectionIndex,
}) => {
  const frame = useCurrentFrame();

  // Only show the highlighted lines (2-4 lines at a time)
  const linesToShow = highlightLines.length > 0 ? highlightLines : [];
  if (linesToShow.length === 0) return null;

  // Key quote spotlight timing: starts at 40% through, lasts 60 frames
  const spotlightStart = Math.floor(durationInFrames * 0.4);
  const spotlightEnd = spotlightStart + 60;
  const hasSpotlight = keyQuote && linesToShow.includes(keyQuote.lineIndex);

  const spotlightProgress = hasSpotlight
    ? interpolate(frame, [spotlightStart, spotlightStart + 12], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;

  const spotlightExit = hasSpotlight
    ? interpolate(frame, [spotlightEnd - 12, spotlightEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    : 0;

  const isInSpotlight =
    hasSpotlight && frame >= spotlightStart && frame < spotlightEnd;

  // Section label
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out all content at section end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
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
      {/* Section indicator top right */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 64,
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: labelOpacity * 0.6,
        }}
      >
        STANZA {sectionIndex}
      </div>

      {/* Poem lines - centred */}
      <div
        style={{
          maxWidth: "60%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {linesToShow.map((lineIdx, i) => {
          const line = poemLines[lineIdx] || "";
          const staggerDelay = i * LINE_STAGGER;

          // Staggered fade-in
          const lineOpacity = interpolate(
            frame,
            [staggerDelay, staggerDelay + 15],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          const lineY = interpolate(
            frame,
            [staggerDelay, staggerDelay + 15],
            [16, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Is this the key quote line?
          const isQuoteLine =
            hasSpotlight && keyQuote && lineIdx === keyQuote.lineIndex;

          // During spotlight: focus line is bright, others dim
          let finalOpacity = lineOpacity;
          if (isInSpotlight) {
            if (isQuoteLine) {
              finalOpacity = lineOpacity * 0.95;
            } else {
              const dimAmount = spotlightProgress * (1 - spotlightExit);
              finalOpacity =
                lineOpacity * (1 - dimAmount * 0.75); // dim to 0.25
            }
          }

          // Focus line scale during spotlight
          const scale =
            isQuoteLine && isInSpotlight
              ? 1 + 0.05 * spotlightProgress * (1 - spotlightExit)
              : 1;

          // Glow on focus line during spotlight
          const glowBlur =
            isQuoteLine && isInSpotlight
              ? 30 * spotlightProgress * (1 - spotlightExit)
              : 0;

          // Teal accent line on first line (focus indicator)
          const showAccent = i === 0 && !isInSpotlight;

          return (
            <div
              key={lineIdx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: finalOpacity,
                transform: `translateY(${lineY}px) scale(${scale})`,
                marginBottom: 8,
                width: "100%",
              }}
            >
              {/* Teal accent bar */}
              {showAccent && (
                <div
                  style={{
                    width: 2,
                    height: 32,
                    backgroundColor: TEAL,
                    marginRight: 20,
                    opacity: interpolate(frame, [0, 20], [0, 0.7], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    flexShrink: 0,
                  }}
                />
              )}
              <div
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 32,
                  color: "#FFFFFF",
                  lineHeight: 2.4,
                  textAlign: "center",
                  textShadow: isQuoteLine && isInSpotlight
                    ? `0 2px 20px rgba(0,0,0,0.5), 0 0 ${glowBlur}px rgba(42, 157, 143, 0.3)`
                    : "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {line}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
