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

interface BgConfig {
  base: string;
  overlay: string;
}

const BG: Record<SectionType, BgConfig> = {
  title: {
    base: `linear-gradient(160deg, #FFF8EE 0%, #FFF2DC 100%)`,
    overlay: `radial-gradient(ellipse 90% 70% at 70% 50%, rgba(42,157,143,0.07) 0%, transparent 65%)`,
  },
  intro: {
    base: `linear-gradient(160deg, #FFF0E0 0%, #FFFDF7 100%)`,
    overlay: `radial-gradient(ellipse 80% 60% at 25% 60%, rgba(212,168,75,0.08) 0%, transparent 65%)`,
  },
  stanza_analysis: {
    base: `linear-gradient(165deg, #FFFDF7 0%, #FFF8EE 100%)`,
    overlay: `radial-gradient(ellipse 70% 55% at 78% 38%, rgba(42,157,143,0.05) 0%, transparent 60%)`,
  },
  theme: {
    base: `linear-gradient(155deg, #F5F0FF 0%, #EEF0FF 100%)`,
    overlay: `radial-gradient(ellipse 85% 60% at 50% 55%, rgba(42,157,143,0.06) 0%, transparent 65%)`,
  },
  exam_connection: {
    base: `linear-gradient(160deg, #F0F5FF 0%, #EAF4F2 100%)`,
    overlay: `radial-gradient(ellipse 65% 50% at 62% 44%, rgba(42,157,143,0.08) 0%, transparent 60%)`,
  },
  outro: {
    base: `linear-gradient(160deg, #FFFDF7 0%, #FFF8EE 100%)`,
    overlay: `radial-gradient(ellipse 80% 65% at 50% 50%, rgba(212,168,75,0.06) 0%, transparent 65%)`,
  },
  closing: {
    base: `linear-gradient(160deg, #FFF8EE 0%, #FFF2DC 100%)`,
    overlay: `radial-gradient(ellipse 95% 80% at 50% 50%, rgba(42,157,143,0.08) 0%, transparent 70%)`,
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

  // Very slow glow breathe — adds organic warmth without obvious animation
  const breatheScale = 1 + 0.018 * Math.sin(frame / 100);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: cfg.base,
        overflow: "hidden",
      }}
    >
      {/* Radial warm glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: cfg.overlay,
          transform: `scale(${breatheScale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
};
