import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";

interface LottieIconProps {
  /**
   * Path relative to /public, e.g. "lottie/quill.json".
   * When null/undefined, renders nothing (placeholder mode).
   * To activate: download a Lottie JSON from lottiefiles.com and set this prop.
   */
  src: string | null | undefined;
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
}

/**
 * Lottie animation icon with a safe placeholder fallback.
 *
 * SETUP INSTRUCTIONS FOR DIARMUID:
 * ---------------------------------
 * 1. Go to lottiefiles.com and search for free animations. Recommended style:
 *    clean line-art, minimal colours (teal #2A9D8F or navy #1B2838 ideally).
 *
 * 2. Suggested animations per usage:
 *    - IntroFrame (writing theme):  search "quill pen writing" or "feather pen"
 *      → save as: public/lottie/quill.json
 *    - ThemeFrame (themes/book):    search "open book" or "scroll reading"
 *      → save as: public/lottie/book.json
 *    - ExamFrame (insight/tip):     search "lightbulb idea" or "star sparkle"
 *      → save as: public/lottie/lightbulb.json
 *    - ClosingCard (sparkle/star):  search "sparkle confetti" or "celebration star"
 *      → save as: public/lottie/sparkle.json
 *
 * 3. Recommended LottieFiles URLs to check:
 *    - https://lottiefiles.com/animations/quill-pen-writing (or similar)
 *    - Filter by: Free, Creator animations, line-art style
 *    - Choose animations with loop enabled and calm, slow movement
 *
 * 4. After saving JSON files in public/lottie/, update the <LottieIcon src="lottie/quill.json" />
 *    prop in each frame component (IntroFrame, ThemeFrame, ExamFrame, ClosingCard).
 *
 * 5. For teal-coloured animations: many Lottie files support colour customisation.
 *    A pure black/white line-art animation will blend well with the cream palette.
 */
const LottieIconInner: React.FC<LottieIconProps> = ({
  src,
  size = 70,
  opacity = 0.55,
  style,
}) => {
  const [handle] = useState(() => delayRender("Loading Lottie icon"));
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    if (!src) {
      continueRender(handle);
      return;
    }

    fetch(staticFile(src))
      .then((res) => res.json())
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => {
        // Graceful fallback: don't crash the render if the file is missing
        console.warn(`LottieIcon: could not load ${src}`, err);
        continueRender(handle);
      });
  }, [handle, src]);

  if (!src || !animationData) {
    return null;
  }

  return (
    <Lottie
      animationData={animationData}
      style={{
        width: size,
        height: size,
        opacity,
        ...style,
      }}
    />
  );
};

export const LottieIcon = LottieIconInner;
