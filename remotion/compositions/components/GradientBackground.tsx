import React from "react";

export type SectionType =
  | "title"
  | "intro"
  | "stanza_analysis"
  | "theme"
  | "exam_connection"
  | "outro"
  | "closing";

interface GradientSpec {
  from: string;
  to: string;
}

const GRADIENTS: Record<SectionType, GradientSpec> = {
  title: { from: "#0B1628", to: "#0F2B3C" },
  intro: { from: "#141E30", to: "#243B55" },
  stanza_analysis: { from: "#0A1A12", to: "#1A3A2A" },
  theme: { from: "#1A0A2E", to: "#2D1B69" },
  exam_connection: { from: "#1C1C2E", to: "#2A2A4A" },
  outro: { from: "#0B1628", to: "#0F2B3C" },
  closing: { from: "#0B1628", to: "#0F2B3C" },
};

interface GradientBackgroundProps {
  sectionType: SectionType;
  showGlow?: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  sectionType,
  showGlow = false,
}) => {
  const { from, to } = GRADIENTS[sectionType] || GRADIENTS.intro;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      {showGlow && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(42, 157, 143, 0.08) 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};

export { GRADIENTS };
