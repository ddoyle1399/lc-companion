import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { CornerAccent } from "./CornerAccent";
import { AnimatedDots } from "./AnimatedDots";

const TEAL = "#2A9D8F";

interface OutroFrameProps {
  poet: string;
  poemTitle: string;
  durationInFrames: number;
  spokenText?: string;
  outroData?: {
    closingLine: string;
    poemTitle: string;
    poetName: string;
  };
}

export const OutroFrame: React.FC<OutroFrameProps> = ({
  poet,
  poemTitle,
  durationInFrames,
  spokenText,
  outroData,
}) => {
  const frame = useCurrentFrame();

  const displayTitle = outroData?.poemTitle ?? poemTitle;
  const displayPoet = outroData?.poetName ?? poet;
  const closingLine = outroData?.closingLine ?? spokenText ?? "";

  // Split closing line into words for typewriter effect
  const words = closingLine.split(/\s+/).filter((w) => w.length > 0);

  // Fade to black at end (20 frames)
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slow drift upward
  const drift = interpolate(frame, [0, durationInFrames], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Poem title fades in first
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const titleY = interpolate(frame, [0, 18], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Poet name fades in 10 frames after title
  const poetOpacity = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Teal line draws itself
  const lineWidth = interpolate(frame, [18, 36], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Typewriter: each word fades in over 3 frames with 2-frame gap
  const typewriterStart = 36;
  const wordTimings = words.map((_, i) => typewriterStart + i * 5);

  // Dots appear after all words
  const dotsDelay = words.length > 0
    ? wordTimings[words.length - 1] + 10
    : typewriterStart + 10;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#080F1A",
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* Poem title */}
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 40,
            fontWeight: "bold",
            color: "#FFFFFF",
            textAlign: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            maxWidth: "70%",
          }}
        >
          {displayTitle}
        </div>

        {/* Poet name */}
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 18,
            color: TEAL,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginTop: 16,
            opacity: poetOpacity,
          }}
        >
          {displayPoet}
        </div>

        {/* Teal line */}
        <div
          style={{
            width: lineWidth,
            height: 1.5,
            backgroundColor: TEAL,
            marginTop: 28,
            marginBottom: 28,
            opacity: lineWidth > 0 ? 0.5 : 0,
          }}
        />

        {/* Closing line - typewriter word by word */}
        {words.length > 0 && (
          <div
            style={{
              maxWidth: "60%",
              textAlign: "center",
              lineHeight: 1.5,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0 6px",
            }}
          >
            {words.map((word, i) => {
              const wordStart = wordTimings[i];
              const wordOpacity = interpolate(
                frame,
                [wordStart, wordStart + 3],
                [0, 0.7],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              return (
                <span
                  key={i}
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 20,
                    fontStyle: "italic",
                    color: "#FFFFFF",
                    opacity: wordOpacity,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}

        {/* Final dots */}
        <div style={{ marginTop: 24 }}>
          <AnimatedDots delay={dotsDelay} />
        </div>
      </div>
    </div>
  );
};
