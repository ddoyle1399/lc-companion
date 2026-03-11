import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

const TEAL = "#2A9D8F";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  // Playhead dot pulse
  const dotScale = 1 + 0.3 * Math.sin(frame * 0.15);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 0,
        width: "100%",
        height: 1,
      }}
    >
      {/* Track */}
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          backgroundColor: TEAL,
          opacity: 0.25,
          position: "relative",
        }}
      >
        {/* Glowing playhead dot */}
        <div
          style={{
            position: "absolute",
            right: -2,
            top: -1.5,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: TEAL,
            opacity: 0.5,
            transform: `scale(${dotScale})`,
            boxShadow: `0 0 6px ${TEAL}`,
          }}
        />
      </div>
    </div>
  );
};
