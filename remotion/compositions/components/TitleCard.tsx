import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { Particles } from "./Particles";
import { Vignette } from "./Vignette";

interface TitleCardProps {
  title: string;
  poet: string;
  durationInFrames: number;
}

const TEAL = "#2A9D8F";

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  poet,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Fade in: line at 0.5s (15f), title at 1s (30f), poet at 1.5s (45f)
  // Fade out everything over last 15 frames
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const lineOpacity =
    interpolate(frame, [0, 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const titleOpacity =
    interpolate(frame, [15, 30], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const titleY = interpolate(frame, [15, 30], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const poetOpacity =
    interpolate(frame, [30, 45], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * fadeOut;

  const poetY = interpolate(frame, [30, 45], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="title" showGlow />
      <Particles />
      <Vignette />
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
        {/* Teal accent line */}
        <div
          style={{
            width: 80,
            height: 2,
            backgroundColor: TEAL,
            opacity: lineOpacity,
            marginBottom: 32,
          }}
        />

        {/* Poem title */}
        <div
          style={{
            fontSize: 56,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: "70%",
            lineHeight: 1.3,
            letterSpacing: 2,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: "0 2px 30px rgba(0,0,0,0.4)",
          }}
        >
          {title}
        </div>

        {/* Poet name */}
        <div
          style={{
            fontSize: 20,
            fontFamily: "Arial, sans-serif",
            color: TEAL,
            marginTop: 28,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 4,
            opacity: poetOpacity,
            transform: `translateY(${poetY}px)`,
          }}
        >
          {poet}
        </div>
      </div>
    </div>
  );
};
