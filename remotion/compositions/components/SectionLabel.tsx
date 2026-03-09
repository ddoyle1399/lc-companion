import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface SectionLabelProps {
  type: string;
  spokenText?: string;
}

const TEAL = "#2A9D8F";

const LABELS: Record<string, string> = {
  intro: "Introduction",
  stanza_analysis: "Stanza Analysis",
  theme: "Key Themes",
  exam_connection: "Exam Connection",
  outro: "Summary",
};

function getPreview(text?: string): string {
  if (!text) return "";
  const words = text.split(/\s+/).slice(0, 8).join(" ");
  return words.length < text.length ? words + "..." : words;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  type,
  spokenText,
}) => {
  const frame = useCurrentFrame();
  const label = LABELS[type] || type;
  const preview = getPreview(spokenText);

  const lineWidth = interpolate(frame, [0, 15], [0, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div>
      {/* Teal accent line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: TEAL,
          marginBottom: 16,
        }}
      />

      {/* Section type label with slow opacity pulse (constant motion) */}
      <div
        style={{
          fontSize: 14,
          fontFamily: "Arial, sans-serif",
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 4,
          opacity: textOpacity * (0.9 + 0.1 * Math.sin(frame * 0.05)),
        }}
      >
        {label}
      </div>

      {/* Brief preview from spoken text */}
      {preview && (
        <div
          style={{
            fontSize: 16,
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "rgba(255, 255, 255, 0.4)",
            marginTop: 12,
            lineHeight: 1.5,
            opacity: textOpacity,
          }}
        >
          {preview}
        </div>
      )}
    </div>
  );
};
