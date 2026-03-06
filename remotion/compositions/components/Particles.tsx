import React from "react";
import { useCurrentFrame } from "remotion";

interface Particle {
  x: number; // 0-100 percentage
  startY: number; // 0-100 percentage
  size: number; // px
  speed: number; // pixels per frame
  drift: number; // amplitude of horizontal sine wave
  driftSpeed: number; // frequency of sine wave
  opacity: number;
}

// Deterministic seed-based random for consistent particles across frames
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PARTICLE_COUNT = 18;

const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  x: seededRandom(i * 7 + 1) * 100,
  startY: seededRandom(i * 13 + 3) * 100,
  size: 2 + seededRandom(i * 19 + 5) * 2,
  speed: 0.15 + seededRandom(i * 23 + 7) * 0.25,
  drift: 5 + seededRandom(i * 29 + 11) * 15,
  driftSpeed: 0.01 + seededRandom(i * 31 + 13) * 0.02,
  opacity: 0.05 + seededRandom(i * 37 + 17) * 0.1,
}));

export const Particles: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p, i) => {
        // Move upward, wrapping around when off screen
        const rawY = p.startY - p.speed * frame;
        const y = ((rawY % 120) + 120) % 120 - 10; // wrap with buffer
        const xOffset = Math.sin(frame * p.driftSpeed + i) * p.drift;
        const currentX = p.x + xOffset;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${currentX}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: `rgba(255, 255, 255, ${p.opacity})`,
            }}
          />
        );
      })}
    </div>
  );
};
