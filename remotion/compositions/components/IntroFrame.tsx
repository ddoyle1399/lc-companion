import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

const TEAL = "#2A9D8F";

interface IntroFrameProps {
  poemLines: string[];
  highlightLines: number[];
  poet: string;
  durationInFrames: number;
  spokenText?: string;
}

/**
 * Extract a key contextual word from spoken text for the background element.
 * Looks for meaningful nouns/adjectives, skipping common words.
 */
function extractKeyWord(spokenText?: string): string {
  if (!spokenText) return "";
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "this", "that", "and",
    "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "it", "he", "she", "they", "we", "you", "his", "her", "its",
    "poem", "poet", "poetry", "today", "looking", "one", "most", "will",
    "has", "have", "had", "been", "being", "about", "who", "what", "which",
    "when", "where", "how", "not", "all", "each", "every", "both", "few",
  ]);

  const words = spokenText
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w.toLowerCase()));

  // Return the longest word as a rough proxy for significance
  if (words.length === 0) return "";
  words.sort((a, b) => b.length - a.length);
  return words[0];
}

/**
 * Extract a brief context line from the first sentence of spoken text.
 */
function extractContextLine(spokenText?: string): string {
  if (!spokenText) return "";
  const firstSentence = spokenText.split(/[.!?]/)[0]?.trim() || "";
  if (firstSentence.length > 80) {
    return firstSentence.slice(0, 77) + "...";
  }
  return firstSentence;
}

export const IntroFrame: React.FC<IntroFrameProps> = ({
  poet,
  durationInFrames,
  spokenText,
}) => {
  const frame = useCurrentFrame();

  const contextLine = extractContextLine(spokenText);
  const keyWord = extractKeyWord(spokenText);

  // Poet name fade in (top area, 30% from top)
  const poetOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const poetY = interpolate(frame, [0, 20], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Context line fades in 10 frames after poet name
  const contextOpacity = interpolate(frame, [10, 30], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Teal line draws from centre outward (width 0 to 120px over 20 frames)
  const lineWidth = interpolate(frame, [15, 35], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Background key word: very faint, slowly scaling
  const keyWordScale = interpolate(frame, [0, durationInFrames], [1.0, 1.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow drift upward for poet name (Change 4: constant motion)
  const poetDrift = interpolate(frame, [0, durationInFrames], [0, -3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Background key word - centred, very faint, slowly scaling */}
      {keyWord && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${keyWordScale})`,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 60,
            color: "rgba(255, 255, 255, 0.15)",
            textTransform: "uppercase",
            letterSpacing: 8,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {keyWord}
        </div>
      )}

      {/* Main content area - positioned at 30% from top */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${poetDrift}px)`,
        }}
      >
        {/* Poet name */}
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 44,
            color: "#FFFFFF",
            textAlign: "center",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            opacity: poetOpacity,
            transform: `translateY(${poetY}px)`,
          }}
        >
          {poet}
        </div>

        {/* Teal horizontal line */}
        <div
          style={{
            width: lineWidth,
            height: 1.5,
            backgroundColor: TEAL,
            marginTop: 24,
            marginBottom: 24,
          }}
        />

        {/* Context line */}
        {contextLine && (
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 18,
              color: "#FFFFFF",
              opacity: contextOpacity,
              textAlign: "center",
              maxWidth: "60%",
              lineHeight: 1.6,
            }}
          >
            {contextLine}
          </div>
        )}
      </div>
    </div>
  );
};
