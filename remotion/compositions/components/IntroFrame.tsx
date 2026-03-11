import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { CornerAccent } from "./CornerAccent";
import { DecorativeLine } from "./DecorativeLine";
import { AnimatedDots } from "./AnimatedDots";

const TEAL = "#2A9D8F";
const SPRING_CONFIG = { damping: 15, mass: 0.8 };

interface IntroFrameProps {
  poemLines: string[];
  highlightLines: number[];
  poet: string;
  durationInFrames: number;
  spokenText?: string;
}

/**
 * Split spoken text into display lines for the context area.
 */
function getContextLines(spokenText?: string): string[] {
  if (!spokenText) return [];
  const sentences = spokenText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.slice(0, 3);
}

export const IntroFrame: React.FC<IntroFrameProps> = ({
  poet,
  durationInFrames,
  spokenText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contextLines = getContextLines(spokenText);

  // Poet name spring entrance
  const poetSpring = spring({
    frame,
    fps,
    config: SPRING_CONFIG,
  });
  const poetOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const poetY = interpolate(poetSpring, [0, 1], [12, 0]);

  // Era/dates placeholder - fades in after poet
  const eraOpacity = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow drift upward
  const drift = interpolate(frame, [0, durationInFrames], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at end
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
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Corner accents */}
      <CornerAccent corner="topRight" delay={5} opacity={0.06} />
      <CornerAccent corner="bottomLeft" delay={5} opacity={0.06} />

      {/* Main content area - positioned at 25% from top */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* Poet name */}
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 38,
            color: "#FFFFFF",
            textAlign: "center",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            opacity: poetOpacity,
            transform: `translateY(${poetY}px)`,
          }}
        >
          {poet}
        </div>

        {/* Era/dates in teal */}
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            color: TEAL,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginTop: 12,
            opacity: eraOpacity * 0.7,
          }}
        >
          Leaving Certificate Poetry
        </div>

        {/* Decorative line */}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <DecorativeLine width={80} delay={15} />
        </div>
      </div>

      {/* Context text area - positioned at 45% from top */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          maxWidth: 700,
          transform: `translateY(${drift}px)`,
        }}
      >
        {contextLines.map((line, i) => {
          const lineDelay = 25 + i * 10;
          const lineOpacity = interpolate(
            frame,
            [lineDelay, lineDelay + 18],
            [0, 0.65],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const lineY = interpolate(
            frame,
            [lineDelay, lineDelay + 18],
            [8, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 22,
                fontStyle: "italic",
                color: "#FFFFFF",
                opacity: lineOpacity,
                transform: `translateY(${lineY}px)`,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Bottom dots */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          transform: `translateY(${drift}px)`,
        }}
      >
        <AnimatedDots delay={50} />
      </div>
    </div>
  );
};
