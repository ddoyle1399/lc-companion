import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TechniqueCardProps {
  techniques: { name: string; quote: string; effect: string }[];
  durationFrames: number;
}

const TEAL = "#2A9D8F";

export const TechniqueCard: React.FC<TechniqueCardProps> = ({
  techniques,
  durationFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(
    frame,
    [durationFrames - 10, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {techniques.map((tech, i) => {
        const stagger = i * 10;
        const fadeIn = interpolate(frame, [stagger, stagger + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const slideX = interpolate(frame, [stagger, stagger + 15], [40, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const opacity = Math.min(fadeIn, fadeOut);

        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateX(${slideX}px)`,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: 8,
              padding: 24,
              maxWidth: 380,
            }}
          >
            {/* Technique name */}
            <div
              style={{
                fontSize: 13,
                fontFamily: "Arial, sans-serif",
                fontWeight: 700,
                color: TEAL,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              {tech.name}
            </div>

            {/* Quote */}
            <div
              style={{
                fontSize: 18,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                color: "#FFFFFF",
                marginTop: 10,
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {"\u201C"}{tech.quote}{"\u201D"}
            </div>

            {/* Effect */}
            <div
              style={{
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                color: "rgba(255, 255, 255, 0.7)",
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: TEAL }}>&#8212; </span>
              {tech.effect}
            </div>
          </div>
        );
      })}
    </div>
  );
};
