import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface CSSLightLeakProps {
  /** 0-6: selects leak position and shape variant */
  seed?: number;
  /** Overall opacity cap (0-1), default 0.20 */
  opacity?: number;
  durationInFrames?: number;
}

// Warm leak positions, each covering a different screen region
const LEAK_CONFIGS = [
  { x: "15%", y: "25%", rx: "55%", ry: "45%" },
  { x: "80%", y: "15%", rx: "50%", ry: "60%" },
  { x: "35%", y: "75%", rx: "65%", ry: "40%" },
  { x: "75%", y: "60%", rx: "45%", ry: "55%" },
  { x: "20%", y: "80%", rx: "60%", ry: "40%" },
  { x: "85%", y: "40%", rx: "50%", ry: "55%" },
  { x: "50%", y: "10%", rx: "70%", ry: "40%" },
];

/**
 * CSS-based warm light leak overlay.
 * Reveals during the first half of its duration and retracts during the second
 * half — matching the behaviour of @remotion/light-leaks but without WebGL.
 * Works reliably in all headless rendering environments.
 */
export const CSSLightLeak: React.FC<CSSLightLeakProps> = ({
  seed = 0,
  opacity: maxOpacity = 0.20,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const dur = durationInFrames ?? 20;

  const cfg = LEAK_CONFIGS[seed % LEAK_CONFIGS.length];

  // Bell curve: 0 → peak at mid-point → 0
  const progress = interpolate(
    frame,
    [0, dur / 2, dur],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity: progress * maxOpacity,
        pointerEvents: "none",
      }}
    >
      {/* Primary warm burst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(
            ellipse ${cfg.rx} ${cfg.ry} at ${cfg.x} ${cfg.y},
            rgba(255, 210, 120, 0.85) 0%,
            rgba(255, 160, 60,  0.50) 35%,
            rgba(255, 120, 40,  0.20) 60%,
            transparent 80%
          )`,
          mixBlendMode: "screen",
        }}
      />
      {/* Secondary softer bloom for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(
            ellipse 40% 30% at ${cfg.x} ${cfg.y},
            rgba(255, 240, 180, 0.6) 0%,
            transparent 60%
          )`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
