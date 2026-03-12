import React from "react";

interface TechniqueOverlayProps {
  techniques: { name: string; quote: string; effect: string }[];
  durationInFrames: number;
}

// Techniques are now handled inside StanzaDisplay's right panel.
// This component is kept to avoid breaking existing imports in PoemVideo.tsx.
export const TechniqueOverlay: React.FC<TechniqueOverlayProps> = () => null;
