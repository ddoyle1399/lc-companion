import React from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { CSSLightLeak } from "./components/CSSLightLeak";
import type { PoemVideoProps } from "../../lib/video/types";
import { TitleCard } from "./components/TitleCard";
import { ClosingCard } from "./components/ClosingCard";
import { ProgressBar } from "./components/ProgressBar";
import { GradientBackground, type SectionType } from "./components/GradientBackground";
import { BackgroundImage } from "./components/BackgroundImage";
import { StanzaDisplay } from "./components/StanzaDisplay";
import { TechniqueOverlay } from "./components/TechniqueOverlay";
import { IntroFrame } from "./components/IntroFrame";
import { ThemeFrame } from "./components/ThemeFrame";
import { ExamFrame } from "./components/ExamFrame";
import { OutroFrame } from "./components/OutroFrame";

/**
 * Transition durations.
 *
 * TITLE_TRANSITION and CLOSING_TRANSITION use TransitionSeries.Transition
 * (which overlaps adjacent sequences, shortening total duration by their sum).
 * Root.tsx subtracts TITLE_TRANSITION + CLOSING_TRANSITION from the default
 * totalFrames calculation to keep the preview accurate.
 *
 * The render API calculates durationInFrames from the sum of section durations
 * without accounting for these overlaps, so the rendered video will have
 * ~40 extra frames (≈1.3 s at 30 fps) of frozen ClosingCard at the end.
 * This is visually acceptable and can be resolved by updating the render route
 * to use the shared calculateTotalFrames helper.
 */
export const TITLE_TRANSITION_FRAMES = 20;
export const CLOSING_TRANSITION_FRAMES = 20;

/** Duration of each LightLeak overlay between sections. No timeline impact. */
const LIGHT_LEAK_FRAMES = 20;

function toSectionType(type: string): SectionType {
  return (
    ["intro", "stanza_analysis", "theme", "exam_connection", "outro"].includes(type)
      ? type
      : "intro"
  ) as SectionType;
}

interface SectionProps {
  section: {
    type: string;
    highlightLines: number[];
    durationInFrames: number;
    audioSrc: string;
    spokenText?: string;
    keyQuote?: { text: string; lineIndex: number };
    techniques?: { name: string; quote: string; effect: string }[];
    themes?: { name: string; supportingPoints: string[]; quote?: string }[];
    examConnection?: { questionTypes: string[]; linkedPoems: string[]; examTip: string };
    outroData?: { closingLine: string; poemTitle: string; poetName: string };
  };
  poemLines: string[];
  poemTitle: string;
  poet: string;
  stanzaIndex: number;
  imageSrc?: string;
}

const SectionScene: React.FC<SectionProps> = ({
  section,
  poemLines,
  poemTitle,
  poet,
  stanzaIndex,
  imageSrc,
}) => {
  const { fps } = useVideoConfig();
  const dur = section.durationInFrames;
  const fadeFrames = Math.round(fps * 0.3); // 9 frames at 30 fps

  return (
    <AbsoluteFill>
      {/* Background for this section */}
      <GradientBackground sectionType={toSectionType(section.type)} />
      {imageSrc && <BackgroundImage src={imageSrc} durationInFrames={dur} />}

      {/* Content */}
      {section.type === "intro" && (
        <IntroFrame
          poemLines={poemLines}
          highlightLines={section.highlightLines}
          poet={poet}
          durationInFrames={dur}
          spokenText={section.spokenText}
        />
      )}
      {section.type === "theme" && (
        <ThemeFrame
          spokenText={section.spokenText}
          keyQuote={section.keyQuote}
          techniques={section.techniques}
          themes={section.themes}
          durationInFrames={dur}
        />
      )}
      {section.type === "exam_connection" && (
        <ExamFrame
          poet={poet}
          spokenText={section.spokenText}
          examConnection={section.examConnection}
          durationInFrames={dur}
        />
      )}
      {section.type === "outro" && (
        <OutroFrame
          poet={poet}
          poemTitle={poemTitle}
          durationInFrames={dur}
          spokenText={section.spokenText}
          outroData={section.outroData}
        />
      )}
      {section.type !== "intro" &&
        section.type !== "theme" &&
        section.type !== "exam_connection" &&
        section.type !== "outro" && (
          <>
            <StanzaDisplay
              poemLines={poemLines}
              highlightLines={section.highlightLines}
              durationInFrames={dur}
              keyQuote={section.keyQuote}
              sectionIndex={stanzaIndex}
              techniques={section.techniques}
              spokenText={section.spokenText}
            />
            <TechniqueOverlay
              techniques={section.techniques || []}
              durationInFrames={dur}
            />
          </>
        )}

      {/* Audio with fade-in / fade-out (UPGRADE 7) */}
      {section.audioSrc && (
        <Audio
          src={section.audioSrc}
          volume={(f) =>
            interpolate(
              f,
              [0, fadeFrames, dur - fadeFrames, dur],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          }
        />
      )}
    </AbsoluteFill>
  );
};

export const PoemVideo: React.FC<PoemVideoProps> = ({
  poemTitle,
  poet,
  poemLines,
  sections,
  titleDurationInFrames,
  closingDurationInFrames,
  sectionImages = [],
}) => {
  const imageMap = new Map(sectionImages.map((img) => [img.sectionId, img.imagePath]));

  let stanzaCounter = 0;
  const stanzaIndices = sections.map((s) => {
    if (s.type === "stanza_analysis") {
      stanzaCounter += 1;
      return stanzaCounter;
    }
    return 0;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8EE" }}>
      {/*
       * TransitionSeries (UPGRADE 4):
       *   - Title → Intro:  slide from right, springTiming  (Transition — shortens timeline by 20fr)
       *   - Between sections: warm LightLeak overlay (Overlay — no duration change)
       *   - Outro → Closing: fade, linearTiming  (Transition — shortens timeline by 20fr)
       *
       * Adjacency constraint: overlays cannot be adjacent to transitions.
       * The slide Transition is followed by a Sequence (intro) before any Overlay,
       * and the closing Transition is preceded by a plain Sequence (outro).
       */}
      <TransitionSeries>
        {/* ── TITLE CARD ── */}
        <TransitionSeries.Sequence durationInFrames={titleDurationInFrames}>
          <TitleCard
            title={poemTitle}
            poet={poet}
            durationInFrames={titleDurationInFrames}
          />
        </TransitionSeries.Sequence>

        {/* Title → first section: slide in from right */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TITLE_TRANSITION_FRAMES,
          })}
        />

        {/* ── CONTENT SECTIONS ── */}
        {sections.map((section, i) => {
          const isLastSection = i === sections.length - 1;

          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={section.durationInFrames}>
                <SectionScene
                  section={section}
                  poemLines={poemLines}
                  poemTitle={poemTitle}
                  poet={poet}
                  stanzaIndex={stanzaIndices[i]}
                  imageSrc={imageMap.get(i)}
                />
              </TransitionSeries.Sequence>

              {/*
               * LightLeak overlay between sections (UPGRADE 2).
               * Skipped for the last section to avoid adjacency with the
               * upcoming closing Transition.
               */}
              {!isLastSection && (
                <TransitionSeries.Overlay durationInFrames={LIGHT_LEAK_FRAMES}>
                  {/* CSS light leak — no WebGL required, warm tones */}
                  <CSSLightLeak
                    seed={i % 7}
                    opacity={0.20}
                    durationInFrames={LIGHT_LEAK_FRAMES}
                  />
                </TransitionSeries.Overlay>
              )}
            </React.Fragment>
          );
        })}

        {/* Last section → closing: fade */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: CLOSING_TRANSITION_FRAMES })}
        />

        {/* ── CLOSING CARD ── */}
        <TransitionSeries.Sequence durationInFrames={closingDurationInFrames}>
          <ClosingCard durationInFrames={closingDurationInFrames} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Progress bar sits outside TransitionSeries so it reads global frame */}
      <ProgressBar />
    </AbsoluteFill>
  );
};
