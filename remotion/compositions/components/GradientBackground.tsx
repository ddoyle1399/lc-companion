import React from "react";

export type SectionType =
  | "title"
  | "intro"
  | "stanza_analysis"
  | "theme"
  | "exam_connection"
  | "outro"
  | "closing";

interface BackgroundSpec {
  base: string;
  glow?: {
    color: string;
    opacity: number;
    posX: string; // CSS percentage
    posY: string;
  };
}

const BACKGROUNDS: Record<SectionType, BackgroundSpec> = {
  title: {
    base: "#080F1A",
    glow: { color: "#1A3A4A", opacity: 0.15, posX: "50%", posY: "50%" },
  },
  closing: {
    base: "#080F1A",
    glow: { color: "#1A3A4A", opacity: 0.15, posX: "50%", posY: "50%" },
  },
  intro: {
    base: "#0C1220",
  },
  stanza_analysis: {
    base: "#0C1220",
    glow: { color: "#2A9D8F", opacity: 0.05, posX: "80%", posY: "20%" },
  },
  theme: {
    base: "#100C20",
    glow: { color: "#4A2A8F", opacity: 0.05, posX: "50%", posY: "50%" },
  },
  exam_connection: {
    base: "#0E0E1A",
  },
  outro: {
    base: "#080F1A",
    glow: { color: "#1A3A4A", opacity: 0.15, posX: "50%", posY: "50%" },
  },
};

interface GradientBackgroundProps {
  sectionType: SectionType;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  sectionType,
}) => {
  const spec = BACKGROUNDS[sectionType] || BACKGROUNDS.intro;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: spec.base,
      }}
    >
      {spec.glow && (
        <div
          style={{
            position: "absolute",
            top: spec.glow.posY,
            left: spec.glow.posX,
            transform: "translate(-50%, -50%)",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${spec.glow.color} 0%, transparent 70%)`,
            opacity: spec.glow.opacity,
          }}
        />
      )}
    </div>
  );
};
