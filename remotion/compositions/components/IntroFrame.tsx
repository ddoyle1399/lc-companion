import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";

interface IntroFrameProps {
  poemLines: string[];
  highlightLines: number[];
  poet: string;
  durationInFrames: number;
  spokenText?: string;
}

function getSentences(text: string | undefined, count: number): string[] {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, count).map((s) => s.trim());
}

export const IntroFrame: React.FC<IntroFrameProps> = ({
  poet,
  durationInFrames,
  spokenText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sentences = getSentences(spokenText, 3);

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ruleHeight = interpolate(frame, [0, 35], [0, 240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelOpacity = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const poetSpring = spring({ frame: frame - 22, fps, config: { damping: 18, mass: 0.9 } });
  const poetOpacity = interpolate(frame, [22, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const poetY = interpolate(poetSpring, [0, 1], [18, 0]);

  const sepWidth = interpolate(frame, [36, 58], [0, 110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sentenceEntrances = sentences.map((_, i) => {
    const delay = 55 + i * 22;
    return {
      opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      }),
      y: interpolate(frame, [delay, delay + 20], [12, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      }),
    };
  });

  const drift = interpolate(frame, [0, durationInFrames], [0, -5], {
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
        paddingRight: 220,
        transform: `translateY(${drift}px)`,
      }}
    >
      {/* Section label */}
      <div
        style={{
          position: "absolute",
          top: 42,
          left: LAYOUT.paddingH,
          fontFamily: FONTS.label,
          fontSize: 13,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 5,
          opacity: labelOpacity,
        }}
      >
        Introduction
      </div>

      {/* Teal vertical rule */}
      <div
        style={{
          position: "absolute",
          left: 148,
          top: "calc(50% - 120px)",
          width: 2,
          height: ruleHeight,
          background: `linear-gradient(to bottom, transparent, ${COLORS.teal}, transparent)`,
          opacity: 0.5,
        }}
      />

      {/* Poet name */}
      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 17,
          fontWeight: 600,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 7,
          opacity: poetOpacity,
          transform: `translateY(${poetY}px)`,
          marginBottom: 22,
        }}
      >
        {poet}
      </div>

      {/* Separator */}
      <div
        style={{
          width: sepWidth,
          height: 1.5,
          background: COLORS.teal,
          opacity: 0.35,
          marginBottom: 44,
        }}
      />

      {/* Context sentences */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1100 }}>
        {sentences.map((sentence, i) => (
          <div
            key={i}
            style={{
              fontFamily: i === 0 ? FONTS.display : FONTS.body,
              fontSize: i === 0 ? 32 : 26,
              fontStyle: i === 0 ? ("italic" as const) : ("normal" as const),
              color: COLORS.navy,
              lineHeight: 1.65,
              opacity: sentenceEntrances[i].opacity * (i === 0 ? 1 : 0.70),
              transform: `translateY(${sentenceEntrances[i].y}px)`,
              letterSpacing: i === 0 ? 0.2 : 0,
            }}
          >
            {sentence}
          </div>
        ))}
      </div>

      {/* Brand */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: LAYOUT.paddingH,
          fontFamily: FONTS.label,
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
