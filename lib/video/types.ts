export interface ScriptSection {
  id: string;
  type: "intro" | "stanza_analysis" | "theme" | "exam_connection" | "outro";
  spokenText: string;
  highlightLines: number[]; // 0-indexed poem line numbers
  estimatedDuration: number; // seconds, roughly 1s per 2.5 words
  keyQuote?: {
    text: string; // The exact quote from the poem
    lineIndex: number; // Which poem line it comes from (0-indexed)
  };
  techniques?: {
    name: string; // e.g. "Assonance", "Biblical Allusion"
    quote: string; // The quote that demonstrates this technique
    effect: string; // One-line exam-ready explanation
  }[];
}

export interface ScriptWarning {
  type: "technique_not_in_note" | "quote_not_in_poem";
  message: string;
  sectionId: string;
  value: string;
}

export interface VideoScript {
  poemTitle: string;
  poet: string;
  totalEstimatedDuration: number;
  sections: ScriptSection[];
  warnings?: ScriptWarning[];
}

export interface AudioSection {
  sectionId: string;
  filePath: string;
  durationSeconds: number;
}

export interface VideoPipelineEvent {
  stage: "note" | "script" | "audio" | "render" | "complete" | "error";
  progress: number; // 0.0 to 1.0
  message: string;
  sectionIndex?: number;
  videoUrl?: string;
  script?: VideoScript;
  noteText?: string;
  warnings?: ScriptWarning[];
}

export type CopyrightMode = 'public_domain' | 'rights_managed';

export interface PoemVideoProps {
  poemTitle: string;
  poet: string;
  poemLines: string[];
  copyrightMode: CopyrightMode;
  sections: {
    type: string;
    highlightLines: number[];
    durationInFrames: number;
    audioSrc: string;
    spokenText?: string;
    keyQuote?: {
      text: string;
      lineIndex: number;
    };
    techniques?: {
      name: string;
      quote: string;
      effect: string;
    }[];
  }[];
  titleDurationInFrames: number; // 90 frames = 3s at 30fps
  closingDurationInFrames: number; // 60 frames = 2s at 30fps
}
