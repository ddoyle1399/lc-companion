import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";

interface TechniqueOverlayProps {
  techniques: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

const CARD_DURATION = 90; // 3 seconds per card
const CARD_ENTER = 12;
const CARD_EXIT = 12;

export const TechniqueOverlay: React.FC<TechniqueOverlayProps> = ({
  techniques,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  if (!techniques || techniques.length === 0) return null;

  // Calculate when each technique card appears
  // Start at 20% into the section, space them evenly
  const startFrame = Math.floor(durationInFrames * 0.2);
  const availableFrames = durationInFrames - startFrame - 15; // leave buffer at end
  const perCard = Math.min(
    CARD_DURATION + CARD_EXIT,
    Math.floor(availableFrames / techniques.length)
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {techniques.map((tech, i) => {
        const cardStart = startFrame + i * perCard;
        const cardEnd = cardStart + Math.min(CARD_DURATION, perCard - CARD_EXIT);

        // Enter animation
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

        // Exit animation
        const exitProgress = interpolate(
          frame,
          [cardEnd - CARD_EXIT, cardEnd],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.quad),
          }
        );

        const isVisible = frame >= cardStart && frame < cardEnd;
        if (!isVisible) return null;

        const translateY = interpolate(enterProgress - exitProgress, [-1, 0, 1], [100, 0, 100]);
        const opacity = enterProgress * (1 - exitProgress);

        return (
          <div
            key={i}
            style={{
              transform: `translateY(${translateY}px)`,
              opacity,
              backgroundColor: "rgba(10, 15, 25, 0.85)",
              borderRadius: 12,
              padding: 32,
              maxWidth: 600,
              minWidth: 400,
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Technique name */}
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: TEAL,
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 12,
              }}
            >
              {tech.name}
            </div>

            {/* Quote */}
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 18,
                fontStyle: "italic",
                color: "#FFFFFF",
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              {"\u201C"}{tech.quote}{"\u201D"}
            </div>

            {/* Effect */}
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.5,
              }}
            >
              {tech.effect}
            </div>
          </div>
        );
      })}
    </div>
  );
};
