import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";

interface ExamFrameProps {
  poet: string;
  spokenText?: string;
  techniques?: { name: string; quote: string; effect: string }[];
  examConnection?: {
    questionTypes: string[];
    linkedPoems: string[];
    examTip: string;
  };
  durationInFrames: number;
}

function extractQuestionTypes(spokenText?: string): string[] {
  if (!spokenText) return [];
  const sentences = spokenText.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 3).map((s) =>
    s.trim().split(/\s+/).slice(0, 8).join(" ")
  );
}

const Pill: React.FC<{ text: string; frame: number; delay: number }> = ({
  text,
  frame,
  delay,
}) => {
  const opacity = interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const y = interpolate(frame, [delay, delay + 16], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div
      style={{
        background: COLORS.goldDim,
        border: `1px solid ${COLORS.goldBorder}`,
        borderRadius: 4,
        padding: "10px 20px",
        fontFamily: FONTS.body,
        fontSize: 20,
        color: COLORS.cream,
        lineHeight: 1.4,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  );
};

export const ExamFrame: React.FC<ExamFrameProps> = ({
  poet,
  spokenText,
  examConnection,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const questionTypes =
    examConnection?.questionTypes ?? extractQuestionTypes(spokenText);
  const linkedPoems = examConnection?.linkedPoems ?? [];
  const examTip = examConnection?.examTip ?? "";

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
  const headerOpacity = interpolate(frame, [12, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const tipDelay = 35 + questionTypes.length * 14;
  const tipOpacity = interpolate(frame, [tipDelay, tipDelay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const tipY = interpolate(frame, [tipDelay, tipDelay + 20], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
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
        Exam Focus
      </div>

      {/* Two-column content area */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: LAYOUT.paddingH + 100,
          right: LAYOUT.paddingH + 100,
          bottom: 100,
          display: "flex",
          gap: 80,
        }}
      >
        {/* LEFT: Question types */}
        <div style={{ flex: "0 0 50%" }}>
          <div
            style={{
              fontFamily: FONTS.label,
              fontSize: 13,
              color: COLORS.teal,
              textTransform: "uppercase" as const,
              letterSpacing: 5,
              marginBottom: 24,
              opacity: headerOpacity,
            }}
          >
            Likely Question Types
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questionTypes.map((q, i) => (
              <Pill key={i} text={q} frame={frame} delay={22 + i * 14} />
            ))}
          </div>

          {/* Linked poems */}
          {linkedPoems.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div
                style={{
                  fontFamily: FONTS.label,
                  fontSize: 13,
                  color: COLORS.steel,
                  textTransform: "uppercase" as const,
                  letterSpacing: 4,
                  marginBottom: 16,
                  opacity: interpolate(frame, [35, 50], [0, 0.7], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                Pair with
              </div>
              {linkedPoems.slice(0, 2).map((poem, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 19,
                    color: COLORS.cream,
                    opacity: interpolate(
                      frame,
                      [44 + i * 12, 60 + i * 12],
                      [0, 0.7],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
                    marginBottom: 8,
                    fontStyle: "italic" as const,
                  }}
                >
                  {poem}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Exam tip */}
        {examTip && (
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", paddingTop: 44 }}>
            <div
              style={{
                background: "rgba(42, 157, 143, 0.08)",
                border: `1px solid rgba(42, 157, 143, 0.22)`,
                borderLeft: `3px solid ${COLORS.teal}`,
                borderRadius: 4,
                padding: "24px 28px",
                opacity: tipOpacity,
                transform: `translateY(${tipY}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.label,
                  fontSize: 11,
                  color: COLORS.teal,
                  textTransform: "uppercase" as const,
                  letterSpacing: 4,
                  marginBottom: 14,
                }}
              >
                Exam Tip
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 21,
                  color: COLORS.white,
                  lineHeight: 1.65,
                  opacity: 0.85,
                }}
              >
                {examTip}
              </div>
            </div>
          </div>
        )}
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
