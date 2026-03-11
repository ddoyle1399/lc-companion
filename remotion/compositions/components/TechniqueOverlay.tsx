import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const TEAL = "#2A9D8F";
const STAGGER_DELAY = 18;
const SPRING_CONFIG = { damping: 15, mass: 0.8 };

interface TechniqueOverlayProps {
  techniques: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

export const TechniqueOverlay: React.FC<TechniqueOverlayProps> = ({
  techniques,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!techniques || techniques.length === 0) return null;

  // Cards fade out together at the end of the section
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      {techniques.slice(0, 2).map((tech, i) => {
        const cardStart = i * STAGGER_DELAY;

        // Spring entrance from below
        const enterSpring = spring({
          frame: frame - cardStart,
          fps,
          config: SPRING_CONFIG,
        });

        const translateY = interpolate(enterSpring, [0, 1], [30, 0]);
        const enterOpacity = interpolate(
          frame,
          [cardStart, cardStart + 18],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const opacity = enterOpacity * fadeOut;

        // Position: first card bottom-left, second card bottom-right
        const positionStyle: React.CSSProperties =
          i === 0
            ? { position: "absolute", left: 60, bottom: 80 }
            : { position: "absolute", right: 60, bottom: 80 };

        return (
          <div
            key={i}
            style={{
              ...positionStyle,
              transform: `translateY(${translateY}px)`,
              opacity,
              background: "linear-gradient(90deg, rgba(10,15,25,0.9) 0%, rgba(10,15,25,0.7) 100%)",
              borderRadius: 4,
              padding: "20px 24px",
              maxWidth: 380,
              borderLeft: `2px solid ${TEAL}`,
              borderTop: "1px solid rgba(42, 157, 143, 0.15)",
              pointerEvents: "none",
            }}
          >
            {/* Technique name */}
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: TEAL,
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 8,
              }}
            >
              {tech.name}
            </div>

            {/* Tiny separator line */}
            <div
              style={{
                width: 30,
                height: 1,
                backgroundColor: TEAL,
                opacity: 0.3,
                marginBottom: 10,
              }}
            />

            {/* Quote */}
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 16,
                fontStyle: "italic",
                color: "#FFFFFF",
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              {"\u201C"}
              {tech.quote}
              {"\u201D"}
            </div>

            {/* Effect */}
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.5)",
                lineHeight: 1.5,
              }}
            >
              {tech.effect}
            </div>
          </div>
        );
      })}
    </>
  );
};
