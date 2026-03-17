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

  const ruleHeight = interpolate(frame, [0, 40], [0, 340], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eyebrowOpacity = interpolate(frame, [18, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eyebrowX = interpolate(frame, [18, 38], [-14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sepWidth = interpolate(frame, [28, 52], [0, 90], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

  const subOpacity = interpolate(frame, [72, 92], [0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandOpacity = interpolate(frame, [82, 105], [0, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GradientBackground sectionType="title" />

      <div style={{ position: "absolute", inset: 0, opacity: fadeOut }}>
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 36, left: 36, width: 36, height: 36, borderTop: `2px solid ${COLORS.teal}`, borderLeft: `2px solid ${COLORS.teal}`, opacity: 0.12 }} />
        <div style={{ position: "absolute", top: 36, right: 36, width: 36, height: 36, borderTop: `2px solid ${COLORS.teal}`, borderRight: `2px solid ${COLORS.teal}`, opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: 36, left: 36, width: 36, height: 36, borderBottom: `2px solid ${COLORS.teal}`, borderLeft: `2px solid ${COLORS.teal}`, opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: 36, right: 36, width: 36, height: 36, borderBottom: `2px solid ${COLORS.teal}`, borderRight: `2px solid ${COLORS.teal}`, opacity: 0.12 }} />

        {/* Teal vertical rule */}
        <div
          style={{
            position: "absolute",
            left: 148,
            top: "calc(50% - 170px)",
            width: 2,
            height: ruleHeight,
            background: `linear-gradient(to bottom, transparent 0%, ${COLORS.teal} 15%, ${COLORS.teal} 85%, transparent 100%)`,
            opacity: 0.7,
          }}
        />

        {/* Content block */}
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
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.teal,
              textTransform: "uppercase" as const,
              letterSpacing: 7,
              opacity: eyebrowOpacity,
              transform: `translateX(${eyebrowX}px)`,
              marginBottom: 22,
            }}
          >
            {poet}
          </div>

          <div
            style={{
              width: sepWidth,
              height: 1.5,
              background: COLORS.teal,
              opacity: 0.4,
              marginBottom: 36,
            }}
          />

          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 72,
              fontWeight: 700,
              fontStyle: "italic" as const,
              color: COLORS.navy,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              marginBottom: 44,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 14,
              fontWeight: 400,
              color: COLORS.navy,
              textTransform: "uppercase" as const,
              letterSpacing: 5,
              opacity: subOpacity,
            }}
          >
            Leaving Certificate · Higher Level Poetry
          </div>
        </div>

        {/* Brand */}
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
              color: COLORS.teal,
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
              color: COLORS.navy,
              textTransform: "uppercase" as const,
              letterSpacing: 3,
              marginTop: 5,
              opacity: 0.35,
            }}
          >
            theh1club.ie
          </div>
        </div>
      </div>
    </div>
  );
};
