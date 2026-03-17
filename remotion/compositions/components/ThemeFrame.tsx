import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";

interface Theme {
  name: string;
  supportingPoints: string[];
  quote?: string;
}

interface ThemeFrameProps {
  spokenText?: string;
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
  themes?: Theme[];
  durationInFrames: number;
}

const ThemeCard: React.FC<{ theme: Theme; frame: number; delay: number }> = ({
  theme,
  frame,
  delay,
}) => {
  const opacity = interpolate(frame, [delay, delay + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const x = interpolate(frame, [delay, delay + 22], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div
      style={{
        background: COLORS.cardBg,
        boxShadow: COLORS.cardShadow,
        border: `1px solid ${COLORS.glassBorder}`,
        borderLeft: `3px solid ${COLORS.teal}`,
        borderRadius: 4,
        padding: "20px 28px",
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.navy,
          marginBottom: 12,
          letterSpacing: 0.1,
        }}
      >
        {theme.name}
      </div>
      {theme.supportingPoints.slice(0, 2).map((point, i) => (
        <div
          key={i}
          style={{
            fontFamily: FONTS.body,
            fontSize: 18,
            color: COLORS.navyMid,
            lineHeight: 1.6,
            marginBottom: 6,
            paddingLeft: 14,
            borderLeft: `1px solid ${COLORS.tealBorder}`,
          }}
        >
          {point}
        </div>
      ))}
      {theme.quote && (
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 18,
            fontStyle: "italic" as const,
            color: COLORS.teal,
            opacity: 0.80,
            marginTop: 10,
          }}
        >
          &ldquo;{theme.quote}&rdquo;
        </div>
      )}
    </div>
  );
};

export const ThemeFrame: React.FC<ThemeFrameProps> = ({
  spokenText,
  themes = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const labelOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ruleWidth = interpolate(frame, [10, 40], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const introOpacity = interpolate(frame, [28, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const drift = interpolate(frame, [0, durationInFrames], [0, -5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const intro = spokenText?.match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? "";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeOut,
        paddingLeft: 188,
        paddingRight: 188,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
        Themes
      </div>

      {/* Heading + separator */}
      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 17,
          fontWeight: 600,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 6,
          marginBottom: 18,
          opacity: labelOpacity,
        }}
      >
        Key Themes
      </div>
      <div
        style={{
          width: ruleWidth,
          height: 1.5,
          background: COLORS.teal,
          opacity: 0.35,
          marginBottom: 36,
        }}
      />

      {/* Intro line */}
      {intro && (
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 24,
            color: COLORS.navy,
            lineHeight: 1.7,
            opacity: introOpacity * 0.70,
            marginBottom: 36,
            maxWidth: 1400,
          }}
        >
          {intro}
        </div>
      )}

      {/* Theme cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400 }}>
        {themes.slice(0, 3).map((theme, i) => (
          <ThemeCard key={i} theme={theme} frame={frame} delay={40 + i * 22} />
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
