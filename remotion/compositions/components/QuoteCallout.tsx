import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface QuoteCalloutProps {
  text: string;
  durationFrames: number;
}

export const QuoteCallout: React.FC<QuoteCalloutProps> = ({
  text,
  durationFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationFrames - 10, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  const translateY = interpolate(frame, [0, 15], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        maxWidth: 350,
      }}
    >
      {/* Teal vertical line */}
      <div
        style={{
          width: 3,
          backgroundColor: "#2A9D8F",
          borderRadius: 2,
          flexShrink: 0,
        }}
      />

      {/* Quote text */}
      <div
        style={{
          paddingLeft: 20,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 32,
          fontStyle: "italic",
          color: "#FFFFFF",
          lineHeight: 1.4,
          textShadow: "0 2px 15px rgba(0,0,0,0.4)",
        }}
      >
        {"\u201C"}{text}{"\u201D"}
      </div>
    </div>
  );
};
