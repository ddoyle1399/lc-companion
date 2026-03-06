import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface PoemDisplayProps {
  lines: string[];
  highlightLines: number[];
}

const TEAL = "#2A9D8F";

export const PoemDisplay: React.FC<PoemDisplayProps> = ({
  lines,
  highlightLines,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: "55%",
        height: "100%",
        padding: "60px 60px 60px 80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {lines.map((line, i) => {
        const isHighlighted = highlightLines.includes(i);

        // Fade highlighted lines in over 10 frames
        const targetOpacity = isHighlighted ? 0.9 : 0.3;
        const lineOpacity = interpolate(
          frame,
          [0, 10],
          [0.3, targetOpacity],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const borderOpacity = isHighlighted
          ? interpolate(frame, [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0;

        return (
          <div
            key={i}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 28,
              lineHeight: "2.2em",
              color: `rgba(255, 255, 255, ${lineOpacity})`,
              textShadow: isHighlighted
                ? "0 2px 20px rgba(0,0,0,0.5)"
                : "none",
              borderLeft: `3px solid rgba(42, 157, 143, ${borderOpacity})`,
              paddingLeft: 15,
              minHeight: line ? undefined : "2.2em",
            }}
          >
            {line || "\u00A0"}
          </div>
        );
      })}
    </div>
  );
};
