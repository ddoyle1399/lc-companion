import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";
import { WordByWord } from "./WordByWord";

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

  const closingRevealStart = 30;
  // Word-by-word runs until durationInFrames - 30 (leaving room for poem tag)
  const closingRevealDuration = Math.max(60, durationInFrames - closingRevealStart - 30);

  const poemTagOpacity = interpolate(frame, [55, 72], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Container springs in to frame the word-by-word text
  const containerSpring = spring({ frame: frame - closingRevealStart, fps, config: { damping: 18, mass: 1.0 } });
  const containerY = interpolate(containerSpring, [0, 1], [18, 0]);
  const containerOpacity = interpolate(frame, [closingRevealStart, closingRevealStart + 14], [0, 1], {
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
          fontFamily: FONTS.ui,
          fontSize: 12,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 5,
          opacity: labelOpacity,
        }}
      >
        Summary
      </div>

      <div
        style={{
          fontFamily: FONTS.ui,
          fontSize: 13,
          color: COLORS.teal,
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
          height: 1.5,
          background: COLORS.teal,
          opacity: 0.35,
          marginBottom: 44,
        }}
      />

      {/* UPGRADE 3: Word-by-word animation for the closing line */}
      {closingLine && (
        <div
          style={{
            borderLeft: `2px solid ${COLORS.teal}`,
            paddingLeft: 32,
            maxWidth: 1300,
            marginBottom: 44,
            opacity: containerOpacity,
            transform: `translateY(${containerY}px)`,
          }}
        >
          <WordByWord
            text={closingLine}
            durationInFrames={closingRevealDuration}
            fontFamily={FONTS.display}
            fontSize={34}
            fontStyle="italic"
            color={COLORS.navy}
            highlightColor={COLORS.teal}
            lineHeight={1.6}
          />
        </div>
      )}

      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 17,
          color: COLORS.teal,
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
          fontFamily: FONTS.ui,
          fontSize: 11,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          opacity: 0.30,
        }}
      >
        The H1 Club
      </div>
    </div>
  );
};
