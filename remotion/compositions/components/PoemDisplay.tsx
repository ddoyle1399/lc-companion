import React from "react";

interface PoemDisplayProps {
  lines: string[];
  highlightLines: number[];
}

const NAVY = "#1B2A4A";
const TEAL = "#2A9D8F";
const CREAM = "#FAF8F5";
const GREY = "#999999";

export const PoemDisplay: React.FC<PoemDisplayProps> = ({
  lines,
  highlightLines,
}) => {
  return (
    <div
      style={{
        width: "60%",
        height: "100%",
        backgroundColor: CREAM,
        padding: "60px 50px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {lines.map((line, i) => {
        const isHighlighted = highlightLines.includes(i);
        return (
          <div
            key={i}
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 22,
              lineHeight: 1.8,
              color: isHighlighted ? NAVY : GREY,
              backgroundColor: isHighlighted
                ? `${TEAL}33` // 20% opacity
                : "transparent",
              borderLeft: isHighlighted
                ? `4px solid ${TEAL}`
                : "4px solid transparent",
              paddingLeft: 16,
              paddingTop: 4,
              paddingBottom: 4,
              transition: "all 0.3s ease",
            }}
          >
            {line || "\u00A0"}
          </div>
        );
      })}
    </div>
  );
};
