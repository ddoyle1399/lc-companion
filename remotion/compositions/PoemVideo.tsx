import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useCurrentFrame,
  interpolate,
} from "remotion";
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

const TRANSITION_FRAMES = 20;

interface SectionTiming {
  type: string;
  highlightLines: number[];
  durationInFrames: number;
  audioSrc: string;
  from: number;
  imageSrc?: string;
  spokenText?: string;
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
  themes?: { name: string; supportingPoints: string[]; quote?: string }[];
  examConnection?: {
    questionTypes: string[];
    linkedPoems: string[];
    examTip: string;
  };
  outroData?: {
    closingLine: string;
    poemTitle: string;
    poetName: string;
  };
}

/**
 * Animated background layer: crossfades gradient colours between sections.
 * When a section has an image, it shows the BackgroundImage instead of gradient.
 */
const AnimatedBackground: React.FC<{
  sectionTimings: SectionTiming[];
}> = ({ sectionTimings }) => {
  const frame = useCurrentFrame();

  let currentIdx = -1;
  for (let i = sectionTimings.length - 1; i >= 0; i--) {
    if (frame >= sectionTimings[i].from) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx < 0) return null;

  const current = sectionTimings[currentIdx];
  const next =
    currentIdx < sectionTimings.length - 1
      ? sectionTimings[currentIdx + 1]
      : null;

  const sectionEnd = current.from + current.durationInFrames;
  const transitionStart = sectionEnd - TRANSITION_FRAMES;
  const inTransition = next && frame >= transitionStart;

  const toSectionType = (type: string): SectionType =>
    (["intro", "stanza_analysis", "theme", "exam_connection", "outro"].includes(type)
      ? type
      : "intro") as SectionType;

  const currentSectionType = toSectionType(current.type);
  const nextSectionType = next ? toSectionType(next.type) : currentSectionType;

  const crossFade =
    inTransition && next
      ? interpolate(frame, [transitionStart, sectionEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <>
      <AbsoluteFill style={{ opacity: 1 - crossFade }}>
        {current.imageSrc ? (
          <BackgroundImage
            src={current.imageSrc}
            durationInFrames={current.durationInFrames}
          />
        ) : (
          <GradientBackground sectionType={currentSectionType} />
        )}
      </AbsoluteFill>
      {inTransition && next && (
        <AbsoluteFill style={{ opacity: crossFade }}>
          {next.imageSrc ? (
            <BackgroundImage
              src={next.imageSrc}
              durationInFrames={next.durationInFrames}
            />
          ) : (
            <GradientBackground sectionType={nextSectionType} />
          )}
        </AbsoluteFill>
      )}
    </>
  );
};

const SectionContent: React.FC<{
  section: SectionTiming;
  poemLines: string[];
  poemTitle: string;
  poet: string;
  stanzaIndex: number;
}> = ({ section, poemLines, poemTitle, poet, stanzaIndex }) => {
  if (section.type === "intro") {
    return (
      <IntroFrame
        poemLines={poemLines}
        highlightLines={section.highlightLines}
        poet={poet}
        durationInFrames={section.durationInFrames}
        spokenText={section.spokenText}
      />
    );
  }

  if (section.type === "theme") {
    return (
      <ThemeFrame
        spokenText={section.spokenText}
        keyQuote={section.keyQuote}
        techniques={section.techniques}
        themes={section.themes}
        durationInFrames={section.durationInFrames}
      />
    );
  }

  if (section.type === "exam_connection") {
    return (
      <ExamFrame
        poet={poet}
        spokenText={section.spokenText}
        examConnection={section.examConnection}
        durationInFrames={section.durationInFrames}
      />
    );
  }

  if (section.type === "outro") {
    return (
      <OutroFrame
        poet={poet}
        poemTitle={poemTitle}
        durationInFrames={section.durationInFrames}
        spokenText={section.spokenText}
        outroData={section.outroData}
      />
    );
  }

  // Default: stanza_analysis
  return (
    <>
      <StanzaDisplay
        poemLines={poemLines}
        highlightLines={section.highlightLines}
        durationInFrames={section.durationInFrames}
        keyQuote={section.keyQuote}
        sectionIndex={stanzaIndex}
        techniques={section.techniques}
        spokenText={section.spokenText}
      />
      <TechniqueOverlay
        techniques={section.techniques || []}
        durationInFrames={section.durationInFrames}
      />
    </>
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
  // Build a lookup from sectionId (index) -> imageSrc
  const imageMap = new Map(sectionImages.map((img) => [img.sectionId, img.imagePath]));

  let currentFrame = 0;
  const titleFrom = currentFrame;
  currentFrame += titleDurationInFrames;

  const sectionTimings: SectionTiming[] = sections.map((section, i) => {
    const from = currentFrame;
    currentFrame += section.durationInFrames;
    return {
      ...section,
      from,
      imageSrc: imageMap.get(i),
    };
  });

  const closingFrom = currentFrame;
  const contentStart = titleDurationInFrames;
  const contentEnd = closingFrom;

  let stanzaCounter = 0;
  const stanzaIndices = sectionTimings.map((s) => {
    if (s.type === "stanza_analysis") {
      stanzaCounter += 1;
      return stanzaCounter;
    }
    return 0;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8EE" }}>
      {/* Animated background for analysis sections */}
      <Sequence from={contentStart} durationInFrames={contentEnd - contentStart}>
        <AnimatedBackground
          sectionTimings={sectionTimings.map((s) => ({
            ...s,
            from: s.from - contentStart,
          }))}
        />
      </Sequence>

      {/* Title card */}
      <Sequence from={titleFrom} durationInFrames={titleDurationInFrames}>
        <TitleCard
          title={poemTitle}
          poet={poet}
          durationInFrames={titleDurationInFrames}
        />
      </Sequence>

      {/* Analysis sections */}
      {sectionTimings.map((section, i) => (
        <Sequence
          key={i}
          from={section.from}
          durationInFrames={section.durationInFrames}
        >
          <AbsoluteFill>
            <SectionContent
              section={section}
              poemLines={poemLines}
              poemTitle={poemTitle}
              poet={poet}
              stanzaIndex={stanzaIndices[i]}
            />
          </AbsoluteFill>
          {section.audioSrc && <Audio src={section.audioSrc} />}
        </Sequence>
      ))}

      {/* Closing card */}
      <Sequence from={closingFrom} durationInFrames={closingDurationInFrames}>
        <ClosingCard durationInFrames={closingDurationInFrames} />
      </Sequence>

      {/* Progress bar overlay */}
      <ProgressBar />
    </AbsoluteFill>
  );
};
