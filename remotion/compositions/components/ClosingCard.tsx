import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { GradientBackground } from "./GradientBackground";

interface ClosingCardProps {
  durationInFrames: number;
}

const TEAL = "#2A9D8F";

export const ClosingCard: React.FC<ClosingCardProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const lineOpacity =
    interpolate(frame, [0, 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const brandOpacity =
    interpolate(frame, [5, 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const subOpacity =
    interpolate(frame, [10, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const urlOpacity =
    interpolate(frame, [15, 25], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="closing" />
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
        }}
      >
        {/* Brand name */}
        <div
          style={{
            fontSize: 40,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            color: "#FFFFFF",
            opacity: brandOpacity,
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          The H1 Club
        </div>

        {/* Teal line */}
        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: TEAL,
            opacity: lineOpacity,
            marginTop: 20,
            marginBottom: 20,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 16,
            fontFamily: "Arial, sans-serif",
            color: TEAL,
            opacity: subOpacity,
          }}
        >
          by LC English Hub
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
            color: "rgba(255, 255, 255, 0.5)",
            marginTop: 16,
            opacity: urlOpacity,
          }}
        >
          theh1club.ie
        </div>
      </div>
    </div>
  );
};
