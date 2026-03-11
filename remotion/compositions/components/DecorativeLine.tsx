import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

const TEAL = "#2A9D8F";

interface DecorativeLineProps {
  width: number;
  direction?: "horizontal" | "vertical";
  delay?: number;
  color?: string;
  thickness?: number;
}

export const DecorativeLine: React.FC<DecorativeLineProps> = ({
  width,
  direction = "horizontal",
  delay = 0,
  color = `rgba(42, 157, 143, 0.4)`,
  thickness = 1.5,
}) => {
  const frame = useCurrentFrame();

  const drawProgress = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle opacity pulse after drawn
  const pulse =
    drawProgress >= 1
      ? 0.35 + 0.1 * Math.sin((frame - delay - 20) * 0.03)
      : drawProgress * 0.45;

  if (direction === "vertical") {
    return (
      <div
        style={{
          width: thickness,
          height: width * drawProgress,
          backgroundColor: color,
          opacity: pulse,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: width * drawProgress,
        height: thickness,
        backgroundColor: color,
        opacity: pulse,
      }}
    />
  );
};
