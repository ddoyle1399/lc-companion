import React from "react";
import { useCurrentFrame, interpolate, Easing, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { COLORS, FONTS, LAYOUT } from "./design";
import { WordByWord } from "./WordByWord";

const LINE_STAGGER = 7;

// Left panel available width for poem lines (pixels):
//   poemPanelRight(820) - paddingH(80) - paddingRight(40) - lineNum(28) - gap(16) = 656
const POEM_LINE_WIDTH = 656;
const MAX_LINE_FONT = 36;
const MIN_LINE_FONT = 18;

interface Technique {
  name: string;
  quote: string;
  effect: string;
}

interface StanzaDisplayProps {
  poemLines: string[];
  highlightLines: number[];
  durationInFrames: number;
  keyQuote?: { text: string; lineIndex: number };
  sectionIndex: number;
  techniques?: Technique[];
  spokenText?: string;
}

function getFirstSentences(text: string | undefined, count: number): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, count).join(" ").trim();
}

/**
 * Compute a safe font size that fits even the longest visible poem line
 * within the poem panel width, capped between MIN and MAX.
 */
function calcFontSize(lines: string[]): number {
  if (lines.length === 0) return MAX_LINE_FONT;

  const longest = lines.reduce((a, b) => (a.length > b.length ? a : b), "");

  try {
    const { fontSize } = fitText({
      text: longest,
      withinWidth: POEM_LINE_WIDTH,
      fontFamily: FONTS.display,
      fontWeight: "400",
    });
    return Math.min(MAX_LINE_FONT, Math.max(MIN_LINE_FONT, Math.floor(fontSize)));
  } catch {
    // fitText can fail before the font is loaded; fall back to line-count heuristic
    const count = lines.length;
    if (count <= 4) return 36;
    if (count <= 7) return 32;
    if (count <= 10) return 28;
    return 24;
  }
}

const SectionDot: React.FC<{ filled: boolean; frame: number; delay: number }> = ({
  filled,
  frame,
  delay,
}) => {
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        background: filled ? COLORS.teal : "transparent",
        border: `1px solid ${filled ? COLORS.teal : COLORS.steelDim}`,
        opacity,
      }}
    />
  );
};

const TechniqueCard: React.FC<{
  technique: Technique;
  frame: number;
  delay: number;
}> = ({ technique, frame, delay }) => {
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const x = interpolate(frame, [delay, delay + 18], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div
      style={{
        background: COLORS.cardBg,
        boxShadow: COLORS.cardShadow,
        border: `1px solid ${COLORS.glassBorder}`,
        borderLeft: `3px solid ${COLORS.teal}`,
        borderRadius: 4,
        padding: "16px 20px",
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.ui,
          fontSize: 10,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        Literary Technique
      </div>
      {/* Technique name uses Space Mono for a technical/academic feel */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 17,
          fontWeight: 700,
          color: COLORS.navy,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        {technique.name}
      </div>
      {technique.quote && (
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 16,
            fontStyle: "italic" as const,
            color: COLORS.navy,
            opacity: 0.70,
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          &ldquo;{technique.quote}&rdquo;
        </div>
      )}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 16,
          color: COLORS.navyMid,
          lineHeight: 1.55,
        }}
      >
        {technique.effect}
      </div>
    </div>
  );
};

export const StanzaDisplay: React.FC<StanzaDisplayProps> = ({
  poemLines,
  highlightLines,
  durationInFrames,
  keyQuote,
  sectionIndex,
  techniques = [],
  spokenText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const linesToShow = highlightLines.filter(
    (idx) => poemLines[idx] !== undefined && poemLines[idx].trim() !== ""
  );

  // Compute font size that fits the longest visible line (UPGRADE 6)
  const visibleLineTexts = linesToShow.map((idx) => poemLines[idx] ?? "");
  const fontSize = calcFontSize(visibleLineTexts);
  const lineHeight = fontSize * 1.85;

  const spotlightStart = Math.floor(durationInFrames * 0.42);
  const spotlightEnd = spotlightStart + 80;
  const inSpotlight = !!keyQuote && frame >= spotlightStart && frame < spotlightEnd;

  const spotlightProgress = keyQuote
    ? interpolate(frame, [spotlightStart, spotlightStart + 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const drift = interpolate(frame, [0, durationInFrames], [0, -6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const analysisText = getFirstSentences(spokenText, 2);
  const visibleTechniques = techniques.slice(0, 2);

  const analysisOpacity = interpolate(frame, [20, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const analysisY = interpolate(frame, [20, 42], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Spotlight duration for the word-by-word keyQuote animation
  const spotlightDuration = spotlightEnd - spotlightStart;

  // Suppress unused fps warning — used in WordByWord via useVideoConfig internally
  void fps;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fadeOut }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: LAYOUT.headerH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: LAYOUT.paddingH,
          paddingRight: LAYOUT.paddingH,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.ui,
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.teal,
            textTransform: "uppercase" as const,
            letterSpacing: 5,
            opacity: interpolate(frame, [0, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {sectionIndex > 0 ? `Stanza ${sectionIndex}` : "Analysis"}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {Array.from({ length: Math.min(sectionIndex + 1, 6) }).map((_, i) => (
            <SectionDot
              key={i}
              filled={i < sectionIndex}
              frame={frame}
              delay={i * 5}
            />
          ))}
        </div>
      </div>

      {/* Left panel: poem lines */}
      <div
        style={{
          position: "absolute",
          top: LAYOUT.headerH,
          left: 0,
          width: LAYOUT.poemPanelRight,
          bottom: 70,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: LAYOUT.paddingH,
          paddingRight: 40,
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* Teal vertical rule */}
        <div
          style={{
            position: "absolute",
            left: LAYOUT.paddingH - 20,
            top: 30,
            bottom: 30,
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${COLORS.teal} 20%, ${COLORS.teal} 80%, transparent)`,
            opacity: 0.35,
          }}
        />

        {linesToShow.map((lineIdx, i) => {
          const isKeyLine = keyQuote?.lineIndex === lineIdx;
          const isInSpotlightMode = inSpotlight && !!keyQuote;

          const lineOpacity = interpolate(
            frame,
            [i * LINE_STAGGER, i * LINE_STAGGER + 16],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );
          const lineY = interpolate(
            frame,
            [i * LINE_STAGGER, i * LINE_STAGGER + 16],
            [14, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );

          const lineScale =
            isInSpotlightMode && isKeyLine
              ? interpolate(spotlightProgress, [0, 1], [1, 1.04], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 1;
          const lineDimOpacity = isInSpotlightMode && !isKeyLine ? 0.22 : 1;

          // Gold marker highlight sweep
          const highlightWidth =
            isKeyLine && inSpotlight
              ? interpolate(
                  frame,
                  [spotlightStart, spotlightStart + 12],
                  [0, 100],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )
              : 0;

          return (
            <div
              key={lineIdx}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                height: lineHeight,
                opacity: lineOpacity * lineDimOpacity,
                transform: `translateY(${lineY}px) scale(${lineScale})`,
                transformOrigin: "left center",
                position: "relative",
              }}
            >
              {/* Gold marker highlight band */}
              {isKeyLine && inSpotlight && (
                <div
                  style={{
                    position: "absolute",
                    left: 44,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: `${highlightWidth}%`,
                    height: fontSize + 10,
                    background: COLORS.goldHighlight,
                    borderRadius: 3,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Line number */}
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: COLORS.steelDim,
                  width: 28,
                  textAlign: "right" as const,
                  letterSpacing: 1,
                  flexShrink: 0,
                  lineHeight: 1,
                  paddingTop: 3,
                }}
              >
                {lineIdx + 1}
              </div>

              {/* Left accent bar on focus line */}
              {isKeyLine && inSpotlight && (
                <div
                  style={{
                    position: "absolute",
                    left: -20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: fontSize + 4,
                    background: COLORS.teal,
                    borderRadius: 2,
                    opacity: spotlightProgress,
                  }}
                />
              )}

              {/* Poem line text */}
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize,
                  fontStyle: "italic" as const,
                  color: COLORS.navy,
                  lineHeight: 1,
                  letterSpacing: 0.2,
                  opacity: isKeyLine && inSpotlight ? 1 : 0.85,
                  position: "relative",
                  zIndex: 1,
                  // Prevent overflow for very long lines (UPGRADE 6 safety)
                  maxWidth: POEM_LINE_WIDTH,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {poemLines[lineIdx]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical panel separator */}
      <div
        style={{
          position: "absolute",
          left: LAYOUT.poemPanelRight + 30,
          top: LAYOUT.headerH + 30,
          bottom: 90,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${COLORS.tealDivider} 20%, ${COLORS.tealDivider} 80%, transparent)`,
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Right panel: analysis + techniques */}
      <div
        style={{
          position: "absolute",
          top: LAYOUT.headerH,
          left: LAYOUT.analysisPanelLeft,
          right: 0,
          bottom: 70,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 48,
          paddingRight: LAYOUT.paddingH,
          gap: 32,
          transform: `translateY(${drift}px)`,
        }}
      >
        {inSpotlight && keyQuote ? (
          <div
            style={{
              opacity: spotlightProgress,
              transform: `translateY(${interpolate(spotlightProgress, [0, 1], [12, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.ui,
                fontSize: 11,
                color: COLORS.teal,
                textTransform: "uppercase" as const,
                letterSpacing: 5,
                marginBottom: 20,
              }}
            >
              Key Quotation
            </div>
            {/* UPGRADE 3: Word-by-word animation for the key quote spotlight */}
            <div
              style={{
                borderLeft: `3px solid ${COLORS.teal}`,
                paddingLeft: 28,
              }}
            >
              <WordByWord
                text={keyQuote.text}
                durationInFrames={spotlightDuration}
                fontFamily={FONTS.display}
                fontSize={34}
                fontStyle="italic"
                color={COLORS.navy}
                highlightColor={COLORS.teal}
                lineHeight={1.5}
              />
            </div>
          </div>
        ) : (
          <>
            {analysisText && (
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 24,
                  color: COLORS.navy,
                  lineHeight: 1.75,
                  opacity: analysisOpacity * 0.75,
                  transform: `translateY(${analysisY}px)`,
                }}
              >
                {analysisText}
              </div>
            )}

            {visibleTechniques.map((t, i) => (
              <TechniqueCard
                key={i}
                technique={t}
                frame={frame}
                delay={30 + i * 20}
              />
            ))}
          </>
        )}
      </div>

      {/* Brand strip */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: LAYOUT.paddingH,
          fontFamily: FONTS.ui,
          fontSize: 11,
          color: COLORS.teal,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          opacity: 0.30,
        }}
      >
        The H1 Club
      </div>
    </div>
  );
};
