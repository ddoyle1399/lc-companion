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
import { PoemDisplay } from "./components/PoemDisplay";
import { SectionLabel } from "./components/SectionLabel";
import { QuoteCallout } from "./components/QuoteCallout";
import { TechniqueCard } from "./components/TechniqueCard";
import { ClosingCard } from "./components/ClosingCard";
import { ProgressBar } from "./components/ProgressBar";
import { GradientBackground, type SectionType } from "./components/GradientBackground";
import { Particles } from "./components/Particles";

const TRANSITION_FRAMES = 15;

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

const AnalysisSections: React.FC<{
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
      <Particles />
    </>
  );
};

const RightPanel: React.FC<{
  section: SectionTiming;
}> = ({ section }) => {
  const hasQuote = !!section.keyQuote;
  const hasTechniques = section.techniques && section.techniques.length > 0;

  return (
    <div
      style={{
        width: "45%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        paddingTop: "15%",
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      {/* Section label at top */}
      <SectionLabel type={section.type} spokenText={section.spokenText} />

      {/* Quote callout */}
      {hasQuote && (
        <div style={{ marginTop: 40 }}>
          <QuoteCallout
            text={section.keyQuote!.text}
            durationFrames={section.durationInFrames}
          />
        </div>
      )}

      {/* Technique cards */}
      {hasTechniques && (
        <div style={{ marginTop: hasQuote ? 32 : 40 }}>
          <TechniqueCard
            techniques={section.techniques!}
            durationFrames={section.durationInFrames}
          />
        </div>
      )}
    </div>
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

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1628" }}>
      {/* Background gradients for analysis sections */}
      <Sequence from={contentStart} durationInFrames={contentEnd - contentStart}>
        <AnalysisSections
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

      {/* Analysis sections: poem display + right panel + audio */}
      {sectionTimings.map((section, i) => (
        <Sequence
          key={i}
          from={section.from}
          durationInFrames={section.durationInFrames}
        >
          <AbsoluteFill style={{ flexDirection: "row" }}>
            <PoemDisplay
              lines={poemLines}
              highlightLines={section.highlightLines}
            />
            <RightPanel section={section} />
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
