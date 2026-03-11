import React from "react";
import { useCurrentFrame } from "remotion";

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
  const frame = useCurrentFrame();
  const spec = BACKGROUNDS[sectionType] || BACKGROUNDS.intro;

  // Slow glow position drift
  const glowDriftX = Math.sin(frame * 0.008) * 3;
  const glowDriftY = Math.cos(frame * 0.006) * 2;

  // Grid drift: 0.5px per second at 30fps
  const gridDriftX = (frame / 30) * 0.5;
  const gridDriftY = (frame / 30) * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: spec.base,
        overflow: "hidden",
      }}
    >
      {spec.glow && (
        <div
          style={{
            position: "absolute",
            top: spec.glow.posY,
            left: spec.glow.posX,
            transform: `translate(calc(-50% + ${glowDriftX}px), calc(-50% + ${glowDriftY}px))`,
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${spec.glow.color} 0%, transparent 70%)`,
            opacity: spec.glow.opacity,
          }}
        />
      )}

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: -120,
          width: "calc(100% + 240px)",
          height: "calc(100% + 240px)",
          transform: `translate(${gridDriftX % 120}px, ${gridDriftY % 120}px)`,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 0.5px, transparent 0.5px), " +
            "linear-gradient(90deg, rgba(255,255,255,0.02) 0.5px, transparent 0.5px)",
          backgroundSize: "120px 120px",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
