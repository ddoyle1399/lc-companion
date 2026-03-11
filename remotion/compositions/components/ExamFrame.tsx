import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { CornerAccent } from "./CornerAccent";
import { AnimatedDots } from "./AnimatedDots";
import { DecorativeLine } from "./DecorativeLine";

const TEAL = "#2A9D8F";

interface ExamFrameProps {
  poet: string;
  spokenText?: string;
  techniques?: { name: string; quote: string; effect: string }[];
  examConnection?: {
    questionTypes: string[];
    linkedPoets: string[];
    linkedPoems?: string[];
    examTip: string;
  };
  durationInFrames: number;
}

/**
 * Fallback: extract connected poet names from spoken text.
 */
function extractPoetNames(spokenText?: string, currentPoet?: string): string[] {
  if (!spokenText) return [];
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
  const names: string[] = [];
  let match;
  while ((match = namePattern.exec(spokenText)) !== null) {
    const name = match[1];
    if (name !== currentPoet && !names.includes(name)) {
      names.push(name);
    }
  }
  return names.slice(0, 3);
}

/**
 * Fallback: extract question types from spoken text.
 */
function extractQuestionTypes(spokenText?: string): string[] {
  if (!spokenText) return [];
  const types: string[] = [];
  const questionPattern = /questions?\s+(?:on|about)\s+([^,.]+)/gi;
  let match;
  while ((match = questionPattern.exec(spokenText)) !== null) {
    types.push(match[1].trim());
  }
  if (types.length === 0) {
    const sentences = spokenText.split(/[.!?]+/).filter((s) => s.trim());
    for (const s of sentences.slice(0, 3)) {
      const words = s.trim().split(/\s+/).slice(0, 6).join(" ");
      if (words.length > 3) types.push(words);
    }
  }
  return types.slice(0, 3);
}

export const ExamFrame: React.FC<ExamFrameProps> = ({
  poet,
  spokenText,
  examConnection,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const questionTypes = examConnection?.questionTypes ?? extractQuestionTypes(spokenText);
  const linkedPoets = examConnection?.linkedPoets ?? extractPoetNames(spokenText, poet);
  const linkedPoems = examConnection?.linkedPoems ?? [];
  const examTip = examConnection?.examTip ?? "";

  // Header fade in
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slow drift
  const drift = interpolate(frame, [0, durationInFrames], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exam tip timing
  const allItemCount = questionTypes.length + linkedPoets.length;
  const tipStartFrame = 30 + allItemCount * 15;
  const tipOpacity = interpolate(frame, [tipStartFrame, tipStartFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const tipY = interpolate(frame, [tipStartFrame, tipStartFrame + 18], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        opacity: fadeOut,
      }}
    >
      {/* Corner accents on all four corners */}
      <CornerAccent corner="topLeft" delay={0} opacity={0.05} />
      <CornerAccent corner="topRight" delay={0} opacity={0.05} />
      <CornerAccent corner="bottomLeft" delay={0} opacity={0.05} />
      <CornerAccent corner="bottomRight" delay={0} opacity={0.05} />

      {/* Subtle centre horizontal line behind content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "20%",
          width: "60%",
        }}
      >
        <DecorativeLine width={1152} delay={5} color="rgba(42, 157, 143, 0.04)" thickness={1} />
      </div>

      {/* EXAM FOCUS header */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: headerOpacity,
        }}
      >
        EXAM FOCUS
      </div>

      {/* Two-column layout */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 0,
          right: 0,
          bottom: 140,
          display: "flex",
          flexDirection: "row",
          paddingLeft: 100,
          paddingRight: 100,
          gap: 60,
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* Left column: Question Types */}
        <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
              opacity: interpolate(frame, [10, 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.quad),
              }),
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: TEAL,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 16,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              Question Types
            </div>
          </div>

          {questionTypes.map((qt, i) => {
            const start = 25 + i * 15;
            const itemOpacity = interpolate(frame, [start, start + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            });
            const itemY = interpolate(frame, [start, start + 18], [10, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            });

            return (
              <div
                key={i}
                style={{
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: 13,
                    color: TEAL,
                    flexShrink: 0,
                  }}
                >
                  {"\u2014"}
                </div>
                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 20,
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: 1.4,
                  }}
                >
                  {qt}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: Pairs Well With */}
        <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
              opacity: interpolate(frame, [10, 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.quad),
              }),
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: TEAL,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 16,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              Pairs Well With
            </div>
          </div>

          {linkedPoets.map((poetName, i) => {
            const start = 25 + i * 15;
            const itemOpacity = interpolate(frame, [start, start + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            });
            const itemY = interpolate(frame, [start, start + 18], [10, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            });

            const linkedPoem = linkedPoems[i];

            return (
              <div
                key={i}
                style={{
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px)`,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 22,
                    fontWeight: "bold",
                    color: "#FFFFFF",
                    lineHeight: 1.3,
                  }}
                >
                  {poetName}
                </div>
                {linkedPoem && (
                  <div
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: 16,
                      color: "rgba(255, 255, 255, 0.5)",
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    {linkedPoem}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated dots above the exam tip */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <AnimatedDots delay={tipStartFrame - 10} />
      </div>

      {/* Exam tip at bottom centre */}
      {examTip && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: `translateX(-50%) translateY(${tipY}px)`,
            maxWidth: "70%",
            textAlign: "center",
            opacity: tipOpacity * fadeOut,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 18,
              fontStyle: "italic",
              color: "rgba(255, 255, 255, 0.6)",
              lineHeight: 1.5,
            }}
          >
            {examTip}
          </div>
        </div>
      )}
    </div>
  );
};
