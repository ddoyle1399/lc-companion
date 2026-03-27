import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface WordByWordProps {
  text: string;
  /** Total frames available to show all words */
  durationInFrames: number;
  fontFamily: string;
  fontSize: number;
  fontStyle?: "normal" | "italic";
  color: string;
  highlightColor: string;
  fontWeight?: number | string;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
}

/**
 * Displays text word by word.  Each word springs in, briefly scales up and
 * turns to the highlight colour, then settles to the base colour.
 * Used for keyQuote spotlights and the outro closing line.
 */
export const WordByWord: React.FC<WordByWordProps> = ({
  text,
  durationInFrames,
  fontFamily,
  fontSize,
  fontStyle = "normal",
  color,
  highlightColor,
  fontWeight = 400,
  lineHeight = 1.5,
  textAlign = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  // Each word gets an equal share of the available frames, with a small lead-in buffer
  const leadIn = Math.round(fps * 0.1); // 3 frames buffer before first word
  const usableFrames = durationInFrames - leadIn;
  const framesPerWord = Math.max(6, Math.floor(usableFrames / wordCount));

  // How long each word stays "active" (highlighted/scaled) before settling
  const activeFrames = Math.max(4, Math.floor(framesPerWord * 0.5));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25em",
        fontFamily,
        fontSize,
        fontStyle,
        fontWeight,
        lineHeight,
        textAlign,
      }}
    >
      {words.map((word, i) => {
        const wordStart = leadIn + i * framesPerWord;

        // Spring entrance: word pops in from slightly below
        const entranceSpring = spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 18, mass: 0.7, stiffness: 200 },
        });

        const appeared = frame >= wordStart;
        const isActive =
          frame >= wordStart && frame < wordStart + activeFrames;

        const opacity = appeared
          ? interpolate(entranceSpring, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0;

        // Scale pulses up during active window then settles to 1.0
        const scale = isActive
          ? interpolate(
              frame,
              [wordStart, wordStart + activeFrames * 0.5, wordStart + activeFrames],
              [1.0, 1.12, 1.0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          : 1.0;

        // Colour transitions: highlight colour while active, then base colour
        const wordColor = isActive ? highlightColor : color;

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `scale(${scale})`,
              transformOrigin: "bottom center",
              display: "inline-block",
              color: wordColor,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
