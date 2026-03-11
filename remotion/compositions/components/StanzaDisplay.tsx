import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { DecorativeLine } from "./DecorativeLine";

const TEAL = "#2A9D8F";
const LINE_STAGGER = 10; // frames between each line appearing

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

  // Only show the highlighted lines, filtering out blank lines
  const linesToShow = highlightLines.filter((idx) => {
    const line = poemLines[idx];
    return line !== undefined && line.trim() !== "";
  });

  // Debug logging for stanza verification
  if (frame === 0) {
    console.log(
      `[StanzaDisplay] sectionIndex=${sectionIndex}, highlightLines=[${highlightLines}], ` +
      `linesToShow=[${linesToShow}], lines: ${linesToShow.map((idx) => `[${idx}]="${poemLines[idx]}"`).join(", ")}`
    );
  }

  if (linesToShow.length === 0) return null;

  // Key quote spotlight timing: starts at 40% through, lasts 75 frames
  const spotlightStart = Math.floor(durationInFrames * 0.4);
  const spotlightEnd = spotlightStart + 75;
  const hasSpotlight = keyQuote && linesToShow.includes(keyQuote.lineIndex);

  const spotlightProgress = hasSpotlight
    ? interpolate(frame, [spotlightStart, spotlightStart + 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;

  const spotlightExit = hasSpotlight
    ? interpolate(frame, [spotlightEnd - 15, spotlightEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    : 0;

  const isInSpotlight =
    hasSpotlight && frame >= spotlightStart && frame < spotlightEnd;

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
      {/* Section indicator top right with vertical decorative line */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <DecorativeLine width={20} direction="vertical" delay={0} thickness={1} />
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 11,
            color: TEAL,
            textTransform: "uppercase",
            letterSpacing: 4,
            opacity: 0.5,
          }}
        >
          STANZA {sectionIndex}
        </div>
      </div>

      {/* Poem lines - centred, generous spacing */}
      <div
        style={{
          maxWidth: "55%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${interpolate(frame, [0, durationInFrames], [0, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        {linesToShow.map((lineIdx, i) => {
          const line = poemLines[lineIdx] || "";
          const staggerDelay = i * LINE_STAGGER;

          // Staggered fade-in
          const lineOpacity = interpolate(
            frame,
            [staggerDelay, staggerDelay + 18],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          const lineY = interpolate(
            frame,
            [staggerDelay, staggerDelay + 18],
            [12, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          // Highlight sweep: after line fades in, brightness sweeps left to right
          const sweepStart = staggerDelay + 18;
          const sweepProgress = interpolate(
            frame,
            [sweepStart, sweepStart + 15],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const isFocusLine = i === 0; // First line is the focus

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
              finalOpacity = lineOpacity * (0.15 + 0.85 * (1 - dimAmount));
            }
          } else if (!isFocusLine) {
            // Non-focus lines slightly dimmer
            finalOpacity = lineOpacity * (isFocusLine ? 0.95 : 0.35 + 0.6 * sweepProgress);
          }

          // Focus line scale during spotlight
          const scale =
            isQuoteLine && isInSpotlight
              ? 1 + 0.03 * spotlightProgress * (1 - spotlightExit)
              : 1;

          // Glow on focus line during spotlight
          const glowIntensity =
            isQuoteLine && isInSpotlight
              ? spotlightProgress * (1 - spotlightExit)
              : 0;

          return (
            <div
              key={lineIdx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: finalOpacity,
                transform: `translateY(${lineY}px) scale(${scale})`,
                marginBottom: 0,
                width: "100%",
              }}
            >
              {/* Teal accent bar on focus line */}
              {isFocusLine && !isInSpotlight && (
                <div
                  style={{
                    width: 1.5,
                    height: 30,
                    backgroundColor: TEAL,
                    marginRight: 20,
                    opacity: interpolate(frame, [0, 18], [0, 0.6], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Spotlight bracket lines */}
              {isQuoteLine && isInSpotlight && (
                <div
                  style={{
                    width: interpolate(spotlightProgress, [0, 1], [0, 40]),
                    height: 1,
                    backgroundColor: TEAL,
                    opacity: 0.3 * spotlightProgress * (1 - spotlightExit),
                    marginRight: 16,
                    flexShrink: 0,
                  }}
                />
              )}

              <div
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 34,
                  color: "#FFFFFF",
                  lineHeight: 2.8,
                  textAlign: "center",
                  textShadow: isQuoteLine && isInSpotlight
                    ? `0 1px 8px rgba(0,0,0,0.3), 0 0 ${30 * glowIntensity}px rgba(42, 157, 143, 0.15)`
                    : "0 1px 8px rgba(0,0,0,0.3)",
                }}
              >
                {line}
              </div>

              {/* Right spotlight bracket */}
              {isQuoteLine && isInSpotlight && (
                <div
                  style={{
                    width: interpolate(spotlightProgress, [0, 1], [0, 40]),
                    height: 1,
                    backgroundColor: TEAL,
                    opacity: 0.3 * spotlightProgress * (1 - spotlightExit),
                    marginLeft: 16,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
