import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

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
  color = `rgba(42, 157, 143, 0.30)`,
  thickness = 1.5,
}) => {
  const frame = useCurrentFrame();

  const drawProgress = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulse =
    drawProgress >= 1
      ? 0.30 + 0.08 * Math.sin((frame - delay - 20) * 0.03)
      : drawProgress * 0.38;

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
