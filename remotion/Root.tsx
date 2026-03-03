import React from "react";
import { Composition } from "remotion";
import { PoemVideo } from "./compositions/PoemVideo";
import type { PoemVideoProps } from "../lib/video/types";

const DEFAULT_PROPS: PoemVideoProps = {
  poemTitle: "The Forge",
  poet: "Seamus Heaney",
  poemLines: [
    "All I know is a door into the dark.",
    "Outside, old axles and iron hoops rusting;",
    "Inside, the hammered anvil's short-pitched ring,",
    "The unpredictable fantail of sparks",
    "Or hiss when a new shoe toughens in water.",
    "The anvil must be somewhere in the centre,",
    "Horned as a unicorn, at one end square,",
    "Set there immoveable: an altar",
    "Where he expends himself in shape and music.",
    "Sometimes, outside, the flashing comes",
    "From a buckled road: then he recalls a clatter",
    "Of hoofs where traffic is flashing in rows;",
    "Then grunts and goes in, with a slam and flick",
    "To beat real iron out, to work the bellows.",
  ],
  sections: [
    {
      type: "intro",
      highlightLines: [],
      durationInFrames: 150,
      audioSrc: "",
    },
    {
      type: "stanza_analysis",
      highlightLines: [0, 1, 2, 3, 4],
      durationInFrames: 240,
      audioSrc: "",
    },
    {
      type: "stanza_analysis",
      highlightLines: [5, 6, 7, 8],
      durationInFrames: 210,
      audioSrc: "",
    },
    {
      type: "stanza_analysis",
      highlightLines: [9, 10, 11, 12, 13],
      durationInFrames: 210,
      audioSrc: "",
    },
    {
      type: "theme",
      highlightLines: [],
      durationInFrames: 180,
      audioSrc: "",
    },
    {
      type: "exam_connection",
      highlightLines: [],
      durationInFrames: 150,
      audioSrc: "",
    },
    {
      type: "outro",
      highlightLines: [],
      durationInFrames: 90,
      audioSrc: "",
    },
  ],
  titleDurationInFrames: 90,
  closingDurationInFrames: 60,
};

const totalFrames =
  DEFAULT_PROPS.titleDurationInFrames +
  DEFAULT_PROPS.sections.reduce((sum, s) => sum + s.durationInFrames, 0) +
  DEFAULT_PROPS.closingDurationInFrames;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PoemVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={PoemVideo as any}
      durationInFrames={totalFrames}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={DEFAULT_PROPS}
    />
  );
};
