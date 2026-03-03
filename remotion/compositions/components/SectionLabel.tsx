import React from "react";

interface SectionLabelProps {
  type: string;
}

const NAVY = "#1B2A4A";
const TEAL = "#2A9D8F";

const LABELS: Record<string, string> = {
  intro: "Introduction",
  stanza_analysis: "Stanza Analysis",
  theme: "Key Themes",
  exam_connection: "Exam Connection",
  outro: "Summary",
};

export const SectionLabel: React.FC<SectionLabelProps> = ({ type }) => {
  const label = LABELS[type] || type;

  return (
    <div
      style={{
        width: "40%",
        height: "100%",
        backgroundColor: "#F5F3F0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 30px",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontFamily: "Calibri, sans-serif",
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: 12,
        }}
      >
        Now discussing
      </div>
      <div
        style={{
          fontSize: 28,
          fontFamily: "Calibri, sans-serif",
          fontWeight: 700,
          color: NAVY,
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
  );
};
