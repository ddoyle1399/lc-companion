import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TitleCardProps {
  title: string;
  poet: string;
  durationInFrames: number;
}

const NAVY = "#1B2A4A";
const CREAM = "#FAF8F5";
const TEAL = "#2A9D8F";

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  poet,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
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
          fontSize: 56,
          fontFamily: "Calibri, sans-serif",
          fontWeight: 700,
          color: CREAM,
          textAlign: "center",
          maxWidth: "80%",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 32,
          fontFamily: "Calibri, sans-serif",
          color: TEAL,
          marginTop: 24,
          textAlign: "center",
        }}
      >
        {poet}
      </div>
    </div>
  );
};
