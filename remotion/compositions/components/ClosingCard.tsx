import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { CornerAccent } from "./CornerAccent";
import { DecorativeLine } from "./DecorativeLine";

interface ClosingCardProps {
  durationInFrames: number;
}

const TEAL = "#2A9D8F";
const SPRING_CONFIG = { damping: 15, mass: 0.8 };

export const ClosingCard: React.FC<ClosingCardProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in from black
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade to solid black at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const masterOpacity = fadeIn * fadeOut;

  // Subtle breathing scale
  const breathe = 1 + 0.005 * (frame / durationInFrames);

  // Brand name spring entrance
  const brandSpring = spring({
    frame: frame - 5,
    fps,
    config: SPRING_CONFIG,
  });
  const brandOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandY = interpolate(brandSpring, [0, 1], [12, 0]);

  // Subtitle
  const subOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL
  const urlOpacity = interpolate(frame, [22, 35], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="closing" />

      {/* Corner accents */}
      <CornerAccent corner="topLeft" delay={3} opacity={0.06} />
      <CornerAccent corner="topRight" delay={3} opacity={0.06} />
      <CornerAccent corner="bottomLeft" delay={3} opacity={0.06} />
      <CornerAccent corner="bottomRight" delay={3} opacity={0.06} />

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
          opacity: masterOpacity,
          transform: `scale(${breathe})`,
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
            transform: `translateY(${brandY}px)`,
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          The H1 Club
        </div>

        {/* Decorative line */}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <DecorativeLine width={60} delay={10} />
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
            color: TEAL,
            opacity: subOpacity,
            letterSpacing: 3,
          }}
        >
          by LC English Hub
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 13,
            fontFamily: "Arial, sans-serif",
            color: "#FFFFFF",
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
