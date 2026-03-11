import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { CornerAccent } from "./CornerAccent";
import { DecorativeLine } from "./DecorativeLine";
import { AnimatedDots } from "./AnimatedDots";

interface TitleCardProps {
  title: string;
  poet: string;
  durationInFrames: number;
}

const SPRING_CONFIG = { damping: 15, mass: 0.8 };
const TEAL = "#2A9D8F";

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  poet,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade out everything over last 15 frames
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Title: spring entrance from frame 20
  const titleSpring = spring({
    frame: frame - 20,
    fps,
    config: SPRING_CONFIG,
  });
  const titleOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(titleSpring, [0, 1], [15, 0]);

  // Poet name: fades in from frame 35
  const poetSpring = spring({
    frame: frame - 35,
    fps,
    config: SPRING_CONFIG,
  });
  const poetOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const poetY = interpolate(poetSpring, [0, 1], [10, 0]);

  // Year/level text
  const yearOpacity = interpolate(frame, [50, 65], [0, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="title" />

      {/* Corner accents */}
      <CornerAccent corner="topLeft" delay={0} />
      <CornerAccent corner="bottomRight" delay={0} />

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
        {/* Poem title above line */}
        <div
          style={{
            fontSize: 52,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: "70%",
            lineHeight: 1.3,
            letterSpacing: 1,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: "0 2px 30px rgba(0,0,0,0.4)",
            marginBottom: 24,
          }}
        >
          {title}
        </div>

        {/* Decorative line at centre */}
        <DecorativeLine width={120} delay={10} />

        {/* Poet name below line */}
        <div
          style={{
            fontSize: 16,
            fontFamily: "Arial, sans-serif",
            color: TEAL,
            marginTop: 24,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 5,
            opacity: poetOpacity,
            transform: `translateY(${poetY}px)`,
          }}
        >
          {poet}
        </div>

        {/* Animated dots */}
        <div style={{ marginTop: 20 }}>
          <AnimatedDots delay={45} />
        </div>

        {/* Year/level */}
        <div
          style={{
            fontSize: 12,
            fontFamily: "Arial, sans-serif",
            color: "#FFFFFF",
            marginTop: 16,
            opacity: yearOpacity,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Higher Level | 2026
        </div>
      </div>
    </div>
  );
};
