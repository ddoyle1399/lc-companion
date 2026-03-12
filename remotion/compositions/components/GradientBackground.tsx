import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "./design";

export type SectionType =
  | "title"
  | "intro"
  | "stanza_analysis"
  | "theme"
  | "exam_connection"
  | "outro"
  | "closing";

interface BgConfig {
  base: string;
  overlay: string;
}

const BG: Record<SectionType, BgConfig> = {
  title: {
    base: `linear-gradient(160deg, #0D1225 0%, #070A14 100%)`,
    overlay: `radial-gradient(ellipse 110% 75% at 68% 50%, rgba(196,150,90,0.09) 0%, transparent 65%)`,
  },
  intro: {
    base: `linear-gradient(160deg, #0A0E1A 0%, #080C18 100%)`,
    overlay: `radial-gradient(ellipse 90% 65% at 25% 60%, rgba(42,100,155,0.08) 0%, transparent 65%)`,
  },
  stanza_analysis: {
    base: `linear-gradient(165deg, #09111F 0%, #070D19 100%)`,
    overlay: `radial-gradient(ellipse 70% 55% at 78% 38%, rgba(196,150,90,0.06) 0%, transparent 60%)`,
  },
  theme: {
    base: `linear-gradient(155deg, #0B0E1E 0%, #08091A 100%)`,
    overlay: `radial-gradient(ellipse 85% 60% at 50% 55%, rgba(55,75,140,0.08) 0%, transparent 65%)`,
  },
  exam_connection: {
    base: `linear-gradient(160deg, #090D18 0%, #07091400 100%)`,
    overlay: `radial-gradient(ellipse 65% 50% at 62% 44%, rgba(42,157,143,0.07) 0%, transparent 60%)`,
  },
  outro: {
    base: `linear-gradient(160deg, #0A0E1A 0%, #060810 100%)`,
    overlay: `radial-gradient(ellipse 80% 65% at 50% 50%, rgba(196,150,90,0.07) 0%, transparent 65%)`,
  },
  closing: {
    base: `linear-gradient(160deg, #08091A 0%, #020308 100%)`,
    overlay: `radial-gradient(ellipse 95% 80% at 50% 50%, rgba(196,150,90,0.12) 0%, transparent 70%)`,
  },
};

interface GradientBackgroundProps {
  sectionType: SectionType;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  sectionType,
}) => {
  const frame = useCurrentFrame();
  const cfg = BG[sectionType];

  // Very slow glow breathe — imperceptible as animation, adds organic life
  const breatheScale = 1 + 0.025 * Math.sin(frame / 90);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: cfg.base,
        overflow: "hidden",
      }}
    >
      {/* Radial atmospheric glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: cfg.overlay,
          transform: `scale(${breatheScale})`,
          transformOrigin: "center center",
        }}
      />
      {/* Subtle horizontal vignette — adds cinematic letterbox feel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.45) 100%)`,
        }}
      />
    </div>
  );
};
