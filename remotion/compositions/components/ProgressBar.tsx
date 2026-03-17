import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

const TEAL = "#2A9D8F";
const NAVY = "#1B2838";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const dotScale = 1 + 0.3 * Math.sin(frame * 0.15);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 0,
        width: "100%",
        height: 2,
      }}
    >
      {/* Track background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: NAVY,
          opacity: 0.08,
        }}
      />
      {/* Fill */}
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          backgroundColor: TEAL,
          opacity: 0.50,
          position: "relative",
        }}
      >
        {/* Glowing playhead dot */}
        <div
          style={{
            position: "absolute",
            right: -2,
            top: -1,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: TEAL,
            opacity: 0.70,
            transform: `scale(${dotScale})`,
            boxShadow: `0 0 6px ${TEAL}`,
          }}
        />
      </div>
    </div>
  );
};
