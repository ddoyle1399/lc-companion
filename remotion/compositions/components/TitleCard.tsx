import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { COLORS, FONTS } from "./design";

interface TitleCardProps {
  title: string;
  poet: string;
  durationInFrames: number;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  poet,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Gold vertical rule grows down from centre
  const ruleHeight = interpolate(frame, [0, 40], [0, 340], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Poet eyebrow: slides in from left
  const eyebrowOpacity = interpolate(frame, [18, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eyebrowX = interpolate(frame, [18, 38], [-14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Separator line under eyebrow: extends right
  const sepWidth = interpolate(frame, [28, 52], [0, 90], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title: spring
  const titleSpring = spring({
    frame: frame - 45,
    fps,
    config: { damping: 20, mass: 1.0 },
  });
  const titleOpacity = interpolate(frame, [45, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(titleSpring, [0, 1], [22, 0]);

  // Subtitle
  const subOpacity = interpolate(frame, [72, 92], [0, 0.45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Brand
  const brandOpacity = interpolate(frame, [82, 105], [0, 0.65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="title" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: fadeOut,
        }}
      >
        {/* Gold vertical rule — editorial left margin marker */}
        <div
          style={{
            position: "absolute",
            left: 148,
            top: "calc(50% - 170px)",
            width: 2,
            height: ruleHeight,
            background: `linear-gradient(to bottom, transparent 0%, ${COLORS.gold} 15%, ${COLORS.gold} 85%, transparent 100%)`,
          }}
        />

        {/* Content block — left-aligned, beside the rule */}
        <div
          style={{
            position: "absolute",
            left: 188,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            maxWidth: 980,
          }}
        >
          {/* Poet — eyebrow label, gold caps */}
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.gold,
              textTransform: "uppercase" as const,
              letterSpacing: 7,
              opacity: eyebrowOpacity,
              transform: `translateX(${eyebrowX}px)`,
              marginBottom: 22,
            }}
          >
            {poet}
          </div>

          {/* Separator */}
          <div
            style={{
              width: sepWidth,
              height: 1,
              background: COLORS.gold,
              opacity: 0.45,
              marginBottom: 36,
            }}
          />

          {/* Poem title — large italic Playfair */}
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 78,
              fontWeight: 400,
              fontStyle: "italic" as const,
              color: COLORS.cream,
              lineHeight: 1.12,
              letterSpacing: -0.5,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              marginBottom: 44,
            }}
          >
            {title}
          </div>

          {/* Level / year label */}
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 14,
              fontWeight: 400,
              color: COLORS.steel,
              textTransform: "uppercase" as const,
              letterSpacing: 5,
              opacity: subOpacity,
            }}
          >
            Leaving Certificate · Higher Level Poetry
          </div>
        </div>

        {/* Brand — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 64,
            right: 84,
            textAlign: "right" as const,
            opacity: brandOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.gold,
              textTransform: "uppercase" as const,
              letterSpacing: 5,
            }}
          >
            The H1 Club
          </div>
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 11,
              color: COLORS.steel,
              textTransform: "uppercase" as const,
              letterSpacing: 3,
              marginTop: 5,
              opacity: 0.6,
            }}
          >
            theh1club.ie
          </div>
        </div>
      </div>
    </div>
  );
};
