import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface ClosingCardProps {
  durationInFrames: number;
}

const NAVY = "#1B2A4A";
const CREAM = "#FAF8F5";
const TEAL = "#2A9D8F";

export const ClosingCard: React.FC<ClosingCardProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: NAVY,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 44,
          fontFamily: "Calibri, sans-serif",
          fontWeight: 700,
          color: CREAM,
        }}
      >
        LC English Hub
      </div>
      <div
        style={{
          width: 60,
          height: 4,
          backgroundColor: TEAL,
          marginTop: 20,
          borderRadius: 2,
        }}
      />
    </div>
  );
};
