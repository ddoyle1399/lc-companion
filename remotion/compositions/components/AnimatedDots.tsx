import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface AnimatedDotsProps {
  delay?: number;
  color?: string;
}

export const AnimatedDots: React.FC<AnimatedDotsProps> = ({
  delay = 0,
  color = "rgba(42, 157, 143, 0.25)",
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {[0, 1, 2].map((i) => {
        const dotDelay = delay + i * 6;
        const opacity = interpolate(frame, [dotDelay, dotDelay + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const pulsePhase = (frame - dotDelay - 10) * 0.06 + i * 2.1;
        const scale =
          opacity >= 1
            ? 1 + 0.1 * Math.sin(pulsePhase)
            : interpolate(opacity, [0, 1], [0.5, 1]);

        return (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: color,
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </div>
  );
};
