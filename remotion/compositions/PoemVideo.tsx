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
import { StanzaDisplay } from "./components/StanzaDisplay";
import { TechniqueOverlay } from "./components/TechniqueOverlay";
import { IntroFrame } from "./components/IntroFrame";
import { ThemeFrame } from "./components/ThemeFrame";
import { ExamFrame } from "./components/ExamFrame";

const TRANSITION_FRAMES = 20;

interface SectionTiming {
  type: string;
  highlightLines: number[];
  durationInFrames: number;
  audioSrc: string;
  from: number;
  spokenText?: string;
  keyQuote?: { text: string; lineIndex: number };
  techniques?: { name: string; quote: string; effect: string }[];
}

/**
 * Renders the animated background layer: gradient crossfades + particles + vignette.
 * Sits behind all content and transitions smoothly between section colours.
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
        <GradientBackground sectionType={currentSectionType} />
      </AbsoluteFill>
      {inTransition && (
        <AbsoluteFill style={{ opacity: crossFade }}>
          <GradientBackground sectionType={nextSectionType} />
        </AbsoluteFill>
      )}
    </>
  );
};

/**
 * Renders the content for a single analysis section based on its type.
 * Full-screen layout: no two-column split, no full poem display.
 */
const SectionContent: React.FC<{
  section: SectionTiming;
  poemLines: string[];
  poet: string;
  stanzaIndex: number;
}> = ({ section, poemLines, poet, stanzaIndex }) => {
  if (section.type === "intro") {
    return (
      <IntroFrame
        poemLines={poemLines}
        highlightLines={section.highlightLines}
        poet={poet}
        durationInFrames={section.durationInFrames}
      />
    );
  }

  if (section.type === "theme") {
    return (
      <ThemeFrame
        spokenText={section.spokenText}
        keyQuote={section.keyQuote}
        techniques={section.techniques}
        durationInFrames={section.durationInFrames}
      />
    );
  }

  if (section.type === "exam_connection") {
    return (
      <ExamFrame
        poet={poet}
        spokenText={section.spokenText}
        techniques={section.techniques}
        durationInFrames={section.durationInFrames}
      />
    );
  }

  if (section.type === "outro") {
    return (
      <IntroFrame
        poemLines={poemLines}
        highlightLines={section.highlightLines}
        poet={poet}
        durationInFrames={section.durationInFrames}
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
}) => {
  let currentFrame = 0;
  const titleFrom = currentFrame;
  currentFrame += titleDurationInFrames;

  const sectionTimings: SectionTiming[] = sections.map((section) => {
    const from = currentFrame;
    currentFrame += section.durationInFrames;
    return { ...section, from };
  });

  const closingFrom = currentFrame;
  const contentStart = titleDurationInFrames;
  const contentEnd = closingFrom;

  // Track stanza index for section indicators
  let stanzaCounter = 0;
  const stanzaIndices = sectionTimings.map((s) => {
    if (s.type === "stanza_analysis") {
      stanzaCounter += 1;
      return stanzaCounter;
    }
    return 0;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1628" }}>
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

      {/* Analysis sections: full-screen content + audio */}
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
