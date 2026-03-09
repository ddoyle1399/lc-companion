import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";

interface ExamFrameProps {
  poet: string;
  spokenText?: string;
  techniques?: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

export const ExamFrame: React.FC<ExamFrameProps> = ({
  poet,
  spokenText,
  techniques,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Header
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Poet name
  const poetOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Extract exam keywords from techniques
  const examPoints: string[] = [];
  if (techniques) {
    for (const t of techniques) {
      examPoints.push(t.name);
    }
  }
  // If no techniques, extract from spoken text
  if (examPoints.length === 0 && spokenText) {
    const sentences = spokenText.split(/[.!?]+/).filter((s) => s.trim());
    for (const s of sentences.slice(0, 4)) {
      const words = s.trim().split(/\s+/).slice(0, 5).join(" ");
      if (words.length > 3) examPoints.push(words);
    }
  }

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
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Section header */}
      <div
        style={{
          position: "absolute",
          top: 80,
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

      {/* Poet name */}
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 36,
          color: "#FFFFFF",
          marginBottom: 48,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          opacity: poetOpacity,
        }}
      >
        {poet}
      </div>

      {/* Exam points as labels */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          maxWidth: "70%",
        }}
      >
        {examPoints.slice(0, 6).map((point, i) => {
          const start = 20 + i * 12;
          const opacity = interpolate(frame, [start, start + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });
          const y = interpolate(frame, [start, start + 15], [12, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                backgroundColor: "rgba(42, 157, 143, 0.15)",
                border: "1px solid rgba(42, 157, 143, 0.3)",
                borderRadius: 8,
                padding: "12px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: 14,
                  color: "#FFFFFF",
                  letterSpacing: 1,
                }}
              >
                {point}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
