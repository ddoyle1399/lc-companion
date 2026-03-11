import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

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

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slow drift upward
  const drift = interpolate(frame, [0, durationInFrames], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Poem title fades in first
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const titleY = interpolate(frame, [0, 15], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Poet name fades in 10 frames after title
  const poetOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Teal line draws itself 15 frames after title
  const lineWidth = interpolate(frame, [15, 30], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Closing line fades in 15 frames after the line
  const closingOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const closingY = interpolate(frame, [30, 45], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

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
          }}
        />

        {/* Closing line */}
        {closingLine && (
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 20,
              fontStyle: "italic",
              color: "rgba(255, 255, 255, 0.7)",
              textAlign: "center",
              maxWidth: "60%",
              lineHeight: 1.5,
              opacity: closingOpacity,
              transform: `translateY(${closingY}px)`,
            }}
          >
            {closingLine}
          </div>
        )}
      </div>
    </div>
  );
};
