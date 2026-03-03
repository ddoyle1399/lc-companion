export interface ScriptSection {
  id: string;
  type: "intro" | "stanza_analysis" | "theme" | "exam_connection" | "outro";
  spokenText: string;
  highlightLines: number[]; // 0-indexed poem line numbers
  estimatedDuration: number; // seconds, roughly 1s per 2.5 words
}

export interface VideoScript {
  poemTitle: string;
  poet: string;
  totalEstimatedDuration: number;
  sections: ScriptSection[];
}

export interface AudioSection {
  sectionId: string;
  filePath: string;
  durationSeconds: number;
}

export interface VideoPipelineEvent {
  stage: "audio" | "render" | "complete" | "error";
  progress: number; // 0.0 to 1.0
  message: string;
  sectionIndex?: number;
  videoUrl?: string;
}

export interface PoemVideoProps {
  poemTitle: string;
  poet: string;
  poemLines: string[];
  sections: {
    type: string;
    highlightLines: number[];
    durationInFrames: number;
    audioSrc: string;
  }[];
  titleDurationInFrames: number; // 90 frames = 3s at 30fps
  closingDurationInFrames: number; // 60 frames = 2s at 30fps
}
