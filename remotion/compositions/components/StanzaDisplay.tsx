import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS, LAYOUT } from "./design";

const LINE_STAGGER = 7; // frames between each poem line appearing

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

function calcFontSize(lineCount: number): number {
  if (lineCount <= 4) return 36;
  if (lineCount <= 7) return 32;
  if (lineCount <= 10) return 28;
  return 24;
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
        background: filled ? COLORS.gold : "transparent",
        border: `1px solid ${filled ? COLORS.gold : COLORS.steelDim}`,
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
        background: COLORS.glass,
        border: `1px solid ${COLORS.glassBorder}`,
        borderLeft: `3px solid ${COLORS.gold}`,
        borderRadius: 4,
        padding: "16px 20px",
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.label,
          fontSize: 11,
          color: COLORS.gold,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          marginBottom: 6,
        }}
      >
        Literary Technique
      </div>
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 20,
          fontWeight: 700,
          color: COLORS.white,
          marginBottom: 8,
        }}
      >
        {technique.name}
      </div>
      {technique.quote && (
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 17,
            fontStyle: "italic" as const,
            color: COLORS.cream,
            opacity: 0.65,
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
          fontSize: 17,
          color: COLORS.steel,
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

  const linesToShow = highlightLines.filter(
    (idx) => poemLines[idx] !== undefined && poemLines[idx].trim() !== ""
  );

  // Spotlight timing: 42% through section
  const spotlightStart = Math.floor(durationInFrames * 0.42);
  const spotlightEnd = spotlightStart + 80;
  const inSpotlight =
    !!keyQuote && frame >= spotlightStart && frame < spotlightEnd;

  const spotlightProgress = keyQuote
    ? interpolate(frame, [spotlightStart, spotlightStart + 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;

  // Section fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 14, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slow upward drift
  const drift = interpolate(frame, [0, durationInFrames], [0, -6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontSize = calcFontSize(linesToShow.length);
  const lineHeight = fontSize * 1.85;

  // Analysis text: first 2 sentences of spoken text
  const analysisText = getFirstSentences(spokenText, 2);

  // Technique cards: max 2
  const visibleTechniques = techniques.slice(0, 2);

  // Right panel content fade in
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

  // During spotlight: right panel shows isolated quote
  const rightPanelShift = inSpotlight
    ? interpolate(frame, [spotlightStart, spotlightStart + 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeOut,
      }}
    >
      {/* ── Header: section label + dots ── */}
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
            fontFamily: FONTS.label,
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.gold,
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

        {/* Section progress dots */}
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

      {/* ── Left panel: poem lines ── */}
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
        {/* Gold vertical rule */}
        <div
          style={{
            position: "absolute",
            left: LAYOUT.paddingH - 20,
            top: 30,
            bottom: 30,
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${COLORS.gold} 20%, ${COLORS.gold} 80%, transparent)`,
            opacity: 0.6,
          }}
        />

        {linesToShow.map((lineIdx, i) => {
          const isKeyLine = keyQuote?.lineIndex === lineIdx;

          // Each line enters with stagger
          const lineOpacity = interpolate(
            frame,
            [i * LINE_STAGGER, i * LINE_STAGGER + 16],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
          );
          const lineY = interpolate(
            frame,
            [i * LINE_STAGGER, i * LINE_STAGGER + 16],
            [14, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
          );

          // Spotlight: key line scales up, others dim
          const isInSpotlightMode = inSpotlight && !!keyQuote;
          const lineScale =
            isInSpotlightMode && isKeyLine
              ? interpolate(spotlightProgress, [0, 1], [1, 1.06], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 1;
          const lineDimOpacity =
            isInSpotlightMode && !isKeyLine ? 0.28 : 1;

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
              {/* Line number */}
              <div
                style={{
                  fontFamily: FONTS.label,
                  fontSize: 13,
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

              {/* Key line marker */}
              {isKeyLine && inSpotlight && (
                <div
                  style={{
                    position: "absolute",
                    left: -20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 4,
                    height: fontSize + 4,
                    background: COLORS.gold,
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
                  color: isKeyLine && inSpotlight ? COLORS.goldLight : COLORS.cream,
                  lineHeight: 1,
                  letterSpacing: 0.2,
                  transition: "color 0.3s",
                  textShadow:
                    isKeyLine && inSpotlight
                      ? `0 0 40px rgba(196, 150, 90, 0.35)`
                      : "none",
                }}
              >
                {poemLines[lineIdx]}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Vertical panel separator ── */}
      <div
        style={{
          position: "absolute",
          left: LAYOUT.poemPanelRight + 30,
          top: LAYOUT.headerH + 30,
          bottom: 90,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${COLORS.goldDivider} 20%, ${COLORS.goldDivider} 80%, transparent)`,
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* ── Right panel: analysis + techniques ── */}
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
        {/* Spotlight mode: show isolated quote */}
        {inSpotlight && keyQuote ? (
          <div
            style={{
              opacity: spotlightProgress,
              transform: `translateY(${interpolate(spotlightProgress, [0, 1], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.label,
                fontSize: 12,
                color: COLORS.gold,
                textTransform: "uppercase" as const,
                letterSpacing: 5,
                marginBottom: 20,
              }}
            >
              Key Quotation
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 38,
                fontStyle: "italic" as const,
                color: COLORS.cream,
                lineHeight: 1.45,
                borderLeft: `3px solid ${COLORS.gold}`,
                paddingLeft: 28,
              }}
            >
              &ldquo;{keyQuote.text}&rdquo;
            </div>
          </div>
        ) : (
          <>
            {/* Normal mode: analysis text */}
            {analysisText && (
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 24,
                  color: COLORS.white,
                  lineHeight: 1.75,
                  opacity: analysisOpacity * 0.80,
                  transform: `translateY(${analysisY}px)`,
                }}
              >
                {analysisText}
              </div>
            )}

            {/* Technique cards */}
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

      {/* ── Bottom brand strip ── */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: LAYOUT.paddingH,
          fontFamily: FONTS.label,
          fontSize: 11,
          color: COLORS.gold,
          textTransform: "uppercase" as const,
          letterSpacing: 4,
          opacity: 0.35,
        }}
      >
        The H1 Club
      </div>
    </div>
  );
};
