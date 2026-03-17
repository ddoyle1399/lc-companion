import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { COLORS, FONTS } from "./design";

interface ClosingCardProps {
  durationInFrames: number;
}

export const ClosingCard: React.FC<ClosingCardProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const masterOpacity = fadeIn * fadeOut;

  const ruleWidth = interpolate(frame, [5, 40], [0, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandSpring = spring({ frame: frame - 8, fps, config: { damping: 18, mass: 0.9 } });
  const brandOpacity = interpolate(frame, [8, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandY = interpolate(brandSpring, [0, 1], [14, 0]);

  const tagOpacity = interpolate(frame, [22, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(frame, [35, 52], [0, 0.40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const breathe = 1 + 0.008 * Math.sin(frame / 60);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="closing" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          opacity: masterOpacity,
          transform: `scale(${breathe})`,
        }}
      >
        <div
          style={{
            width: ruleWidth,
            height: 1.5,
            background: `linear-gradient(to right, transparent, ${COLORS.teal}, transparent)`,
            marginBottom: 40,
            opacity: 0.5,
          }}
        />

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 58,
            fontWeight: 700,
            fontStyle: "italic" as const,
            color: COLORS.navy,
            letterSpacing: 0.5,
            opacity: brandOpacity,
            transform: `translateY(${brandY}px)`,
            marginBottom: 16,
            textAlign: "center" as const,
          }}
        >
          The H1 Club
        </div>

        <div
          style={{
            fontFamily: FONTS.label,
            fontSize: 14,
            color: COLORS.teal,
            textTransform: "uppercase" as const,
            letterSpacing: 6,
            opacity: tagOpacity,
            textAlign: "center" as const,
            marginBottom: 40,
          }}
        >
          by LC English Hub
        </div>

        <div
          style={{
            width: ruleWidth * 0.7,
            height: 1,
            background: `linear-gradient(to right, transparent, ${COLORS.teal}, transparent)`,
            opacity: 0.3,
            marginBottom: 44,
          }}
        />

        <div style={{ display: "flex", gap: 48, opacity: urlOpacity }}>
          {["theh1club.ie", "lcenglishhub.ie"].map((url) => (
            <div
              key={url}
              style={{
                fontFamily: FONTS.label,
                fontSize: 16,
                color: COLORS.navy,
                textTransform: "uppercase" as const,
                letterSpacing: 4,
                opacity: 0.40,
              }}
            >
              {url}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
