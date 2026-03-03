import React from "react";
import { AbsoluteFill, Sequence, Audio } from "remotion";
import type { PoemVideoProps } from "../../lib/video/types";
import { TitleCard } from "./components/TitleCard";
import { PoemDisplay } from "./components/PoemDisplay";
import { SectionLabel } from "./components/SectionLabel";
import { ClosingCard } from "./components/ClosingCard";
import { ProgressBar } from "./components/ProgressBar";

const CREAM = "#FAF8F5";

export const PoemVideo: React.FC<PoemVideoProps> = ({
  poemTitle,
  poet,
  poemLines,
  sections,
  titleDurationInFrames,
  closingDurationInFrames,
}) => {
  // Calculate section start frames
  let currentFrame = 0;
  const titleFrom = currentFrame;
  currentFrame += titleDurationInFrames;

  const sectionTimings = sections.map((section) => {
    const from = currentFrame;
    currentFrame += section.durationInFrames;
    return { ...section, from };
  });

  const closingFrom = currentFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
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
          <AbsoluteFill style={{ flexDirection: "row" }}>
            <PoemDisplay
              lines={poemLines}
              highlightLines={section.highlightLines}
            />
            <SectionLabel type={section.type} />
          </AbsoluteFill>
          {section.audioSrc && (
            <Audio src={section.audioSrc} />
          )}
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
