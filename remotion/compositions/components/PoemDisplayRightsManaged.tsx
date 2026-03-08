import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface PoemDisplayRightsManagedProps {
  lines: string[];
  highlightLines: number[];
  poet: string;
  spokenText?: string;
  techniques?: { name: string; quote: string; effect: string }[];
}

const TEAL = "#2A9D8F";
const MAX_QUOTED_LINES = 3;

/**
 * Rights-managed poem display. Never shows more than 3 consecutive lines at once.
 * Lines are styled as inline quotations, not as the primary visual.
 * The main visual layer shows analysis text, device labels, and thematic commentary.
 */
export const PoemDisplayRightsManaged: React.FC<PoemDisplayRightsManagedProps> = ({
  lines,
  highlightLines,
  poet,
  spokenText,
  techniques,
}) => {
  const frame = useCurrentFrame();

  // Extract up to MAX_QUOTED_LINES consecutive highlighted lines
  const sortedHighlight = [...highlightLines].sort((a, b) => a - b);
  const quotedLineIndices = sortedHighlight.slice(0, MAX_QUOTED_LINES);
  const quotedLines = quotedLineIndices
    .map((i) => lines[i])
    .filter((l) => l && l.trim().length > 0);

  // Build analysis summary from spokenText if available
  const analysisText = spokenText || "";

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const quoteDelay = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const techniqueDelay = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        opacity: fadeIn,
      }}
    >
      {/* Analysis text as primary visual */}
      {analysisText && (
        <div
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 26,
            lineHeight: "1.7em",
            color: "rgba(255, 255, 255, 0.85)",
            marginBottom: 40,
            maxHeight: "40%",
            overflow: "hidden",
          }}
        >
          {analysisText.length > 280
            ? analysisText.slice(0, 280).trim() + "..."
            : analysisText}
        </div>
      )}

      {/* Technique labels */}
      {techniques && techniques.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 32,
            opacity: techniqueDelay,
          }}
        >
          {techniques.map((t, i) => (
            <div
              key={i}
              style={{
                background: "rgba(42, 157, 143, 0.2)",
                border: `1px solid ${TEAL}`,
                borderRadius: 6,
                padding: "6px 14px",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: 18,
                color: TEAL,
                fontWeight: 600,
              }}
            >
              {t.name}
            </div>
          ))}
        </div>
      )}

      {/* Quoted lines as inline quotation, not primary visual */}
      {quotedLines.length > 0 && (
        <div
          style={{
            borderLeft: `3px solid rgba(42, 157, 143, 0.6)`,
            paddingLeft: 20,
            marginTop: 8,
            opacity: quoteDelay,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 22,
              fontStyle: "italic",
              lineHeight: "1.9em",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            {quotedLines.map((line, i) => (
              <div key={i}>&ldquo;{line}&rdquo;</div>
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 24,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 16,
          color: "rgba(255, 255, 255, 0.4)",
          fontStyle: "italic",
        }}
      >
        {poet}
      </div>
    </div>
  );
};
