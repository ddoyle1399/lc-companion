import React from "react";

export const Vignette: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
        pointerEvents: "none",
      }}
    />
  );
};
