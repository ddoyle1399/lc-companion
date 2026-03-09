import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";
const CARD_ENTER = 15;
const CARD_FADE_OUT = 10;
const STAGGER_DELAY = 15;

interface TechniqueOverlayProps {
  techniques: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

export const TechniqueOverlay: React.FC<TechniqueOverlayProps> = ({
  techniques,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  if (!techniques || techniques.length === 0) return null;

  // Cards fade out together at the end of the section
  const fadeOutStart = durationInFrames - CARD_FADE_OUT;
  const fadeOut = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtle scale pulse for constant motion (Change 4)
  const scalePulse =
    1 + 0.005 * Math.sin((frame / durationInFrames) * Math.PI * 2);

  return (
    <>
      {techniques.slice(0, 2).map((tech, i) => {
        const cardStart = i * STAGGER_DELAY;

        // Slide in from bottom with fade
        const enterProgress = interpolate(
          frame,
          [cardStart, cardStart + CARD_ENTER],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          }
        );

        const translateY = interpolate(enterProgress, [0, 1], [30, 0]);
        const opacity = enterProgress * fadeOut;

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
              transform: `translateY(${translateY}px) scale(${scalePulse})`,
              opacity,
              backgroundColor: "rgba(10, 15, 25, 0.85)",
              borderRadius: 12,
              padding: 24,
              maxWidth: 420,
              border: "1px solid rgba(42, 157, 143, 0.2)",
              pointerEvents: "none",
            }}
          >
            {/* Technique name */}
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: TEAL,
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 10,
              }}
            >
              {tech.name}
            </div>

            {/* Quote */}
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 17,
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
                color: "rgba(255, 255, 255, 0.6)",
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
