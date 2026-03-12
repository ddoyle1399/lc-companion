import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";

interface OutroFrameProps {
  poet: string;
  poemTitle: string;
  durationInFrames: number;
  spokenText?: string;
  outroData?: {
    closingLine: string;
    poemTitle: string;
    poetName: string;
  };
}

export const OutroFrame: React.FC<OutroFrameProps> = ({
  poet,
  poemTitle,
  durationInFrames,
  spokenText,
  outroData,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const closingLine =
    outroData?.closingLine ??
    spokenText?.match(/[^.!?]+[.!?]+/)?.[0]?.trim() ??
    "";

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const labelOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ruleWidth = interpolate(frame, [8, 38], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const closingSpring = spring({ frame: frame - 30, fps, config: { damping: 18, mass: 1.0 } });
  const closingOpacity = interpolate(frame, [30, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const closingY = interpolate(closingSpring, [0, 1], [18, 0]);

  const poemTagOpacity = interpolate(frame, [55, 72], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeOut,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: 188,
        paddingRight: 188,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 42,
          left: LAYOUT.paddingH,
          fontFamily: FONTS.label,
          fontSize: 13,
          color: COLORS.gold,
          textTransform: "uppercase" as const,
          letterSpacing: 5,
          opacity: labelOpacity,
        }}
      >
        Summary
      </div>

      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 14,
          color: COLORS.gold,
          textTransform: "uppercase" as const,
          letterSpacing: 6,
          marginBottom: 22,
          opacity: labelOpacity,
        }}
      >
        Key Takeaway
      </div>

      <div
        style={{
          width: ruleWidth,
          height: 1,
          background: COLORS.gold,
          opacity: 0.4,
          marginBottom: 44,
        }}
      />

      {closingLine && (
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 36,
            fontStyle: "italic" as const,
            color: COLORS.cream,
            lineHeight: 1.55,
            transform: `translateY(${closingY}px)`,
            maxWidth: 1300,
            marginBottom: 44,
            borderLeft: `2px solid ${COLORS.gold}`,
            paddingLeft: 32,
            opacity: closingOpacity * 0.90,
          }}
        >
          {closingLine}
        </div>
      )}

      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 17,
          color: COLORS.steel,
          letterSpacing: 3,
          opacity: poemTagOpacity,
          textTransform: "uppercase" as const,
        }}
      >
        {poemTitle} · {poet}
      </div>

      {/* Brand */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: LAYOUT.paddingH,
          fontFamily: FONTS.label,
          fontSize: 11,
          color: COLORS.gold,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          opacity: 0.35,
        }}
      >
        The H1 Club
      </div>
    </div>
  );
};
