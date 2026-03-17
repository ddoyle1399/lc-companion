import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Img, staticFile } from "remotion";

interface BackgroundImageProps {
  /** Absolute file path to the image (served via staticFile or http src) */
  src: string;
  /** Total duration of this section in frames, used for Ken Burns timing */
  durationInFrames: number;
}

/**
 * Displays a full-screen background image with a slow Ken Burns effect
 * (gentle zoom + drift) and a semi-transparent cream overlay so text stays
 * readable on the left side.
 */
export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  src,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Ken Burns: scale 1.0 -> 1.05, translateX 0 -> -10px over section duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, durationInFrames], [0, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade in over first 20 frames
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity,
      }}
    >
      {/* The image itself, Ken Burns transform applied */}
      <img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
          transformOrigin: "center center",
        }}
      />

      {/* Left-heavy cream overlay: strong on left for text readability, lighter on right to show image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(255,248,238,0.82) 0%, rgba(255,248,238,0.65) 45%, rgba(255,248,238,0.28) 100%)",
        }}
      />
    </div>
  );
};
