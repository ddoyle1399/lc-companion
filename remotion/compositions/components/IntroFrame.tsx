import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";

interface IntroFrameProps {
  poemLines: string[];
  highlightLines: number[];
  poet: string;
  durationInFrames: number;
}

export const IntroFrame: React.FC<IntroFrameProps> = ({
  poemLines,
  highlightLines,
  poet,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Pick the first highlighted line as the evocative opening quote
  const quoteLine =
    highlightLines.length > 0 ? poemLines[highlightLines[0]] || "" : "";

  // Slow zoom: scale 1.0 to 1.02
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Quote fade-in
  const quoteOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const quoteY = interpolate(frame, [15, 35], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Poet name fade-in
  const poetOpacity = interpolate(frame, [35, 50], [0, 1], {
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
        transform: `scale(${zoom})`,
        opacity: fadeOut,
      }}
    >
      {quoteLine && (
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 40,
            fontStyle: "italic",
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: "65%",
            lineHeight: 1.6,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            opacity: quoteOpacity,
            transform: `translateY(${quoteY}px)`,
          }}
        >
          {"\u201C"}{quoteLine}{"\u201D"}
        </div>
      )}

      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          marginTop: 32,
          opacity: poetOpacity,
        }}
      >
        {poet}
      </div>
    </div>
  );
};
