import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface CornerAccentProps {
  corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  delay?: number;
  size?: number;
  opacity?: number;
}

export const CornerAccent: React.FC<CornerAccentProps> = ({
  corner,
  delay = 0,
  size = 40,
  opacity: maxOpacity = 0.10,
}) => {
  const frame = useCurrentFrame();

  const drawProgress = interpolate(frame, [delay, delay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulse =
    drawProgress >= 1
      ? maxOpacity * (0.85 + 0.15 * Math.sin((frame - delay - 25) * 0.02))
      : maxOpacity * drawProgress;

  const armLength = size * drawProgress;

  const positionStyle: React.CSSProperties = {};
  let hLine: React.CSSProperties = {};
  let vLine: React.CSSProperties = {};

  const color = "rgba(42, 157, 143, 1)";
  const t = 1.5;

  switch (corner) {
    case "topLeft":
      positionStyle.top = 32;
      positionStyle.left = 32;
      hLine = { width: armLength, height: t, backgroundColor: color, position: "absolute", top: 0, left: 0 };
      vLine = { width: t, height: armLength, backgroundColor: color, position: "absolute", top: 0, left: 0 };
      break;
    case "topRight":
      positionStyle.top = 32;
      positionStyle.right = 32;
      hLine = { width: armLength, height: t, backgroundColor: color, position: "absolute", top: 0, right: 0 };
      vLine = { width: t, height: armLength, backgroundColor: color, position: "absolute", top: 0, right: 0 };
      break;
    case "bottomLeft":
      positionStyle.bottom = 32;
      positionStyle.left = 32;
      hLine = { width: armLength, height: t, backgroundColor: color, position: "absolute", bottom: 0, left: 0 };
      vLine = { width: t, height: armLength, backgroundColor: color, position: "absolute", bottom: 0, left: 0 };
      break;
    case "bottomRight":
      positionStyle.bottom = 32;
      positionStyle.right = 32;
      hLine = { width: armLength, height: t, backgroundColor: color, position: "absolute", bottom: 0, right: 0 };
      vLine = { width: t, height: armLength, backgroundColor: color, position: "absolute", bottom: 0, right: 0 };
      break;
  }

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        width: size,
        height: size,
        opacity: pulse,
        pointerEvents: "none",
      }}
    >
      <div style={hLine} />
      <div style={vLine} />
    </div>
  );
};
