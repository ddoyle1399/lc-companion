import singleTexts2026 from "./2026-single-texts.json";
import comparative2026 from "./2026-comparative.json";
import poetryHL2026 from "./2026-poetry-hl.json";
import poetryOL2026 from "./2026-poetry-ol.json";

import singleTexts2027 from "./2027-single-texts.json";
import comparative2027 from "./2027-comparative.json";
import poetryHL2027 from "./2027-poetry-hl.json";
import poetryOL2027 from "./2027-poetry-ol.json";

export type Level = "HL" | "OL" | "H/O";

export interface SingleText {
  author: string;
  title: string;
  level: string;
}

export interface ComparativeText {
  author?: string;
  director?: string;
  title: string;
}

export interface OLPoem {
  poet: string;
  title: string;
}

export interface CircularData {
  year: number;
  circular: string;
  singleTexts: SingleText[];
  comparative: {
    modesHL: string[];
    modesOL: string[];
    novelsMemoris: ComparativeText[];
    drama: ComparativeText[];
    film: ComparativeText[];
  };
  poetryHL: {
    note: string;
    poets: Record<string, string[]>;
  };
  poetryOL: {
    note: string;
    poems: OLPoem[];
  };
}

const circulars: Record<number, CircularData> = {
  2026: {
    year: 2026,
    circular: "0016/2024",
    singleTexts: singleTexts2026.single_texts,
    comparative: {
      modesHL: comparative2026.comparative_modes_HL,
      modesOL: comparative2026.comparative_modes_OL,
      novelsMemoris: comparative2026.novels_memoirs,
      drama: comparative2026.drama,
      film: comparative2026.film,
    },
    poetryHL: {
      note: poetryHL2026.note,
      poets: poetryHL2026.poets,
    },
    poetryOL: {
      note: poetryOL2026.note,
      poems: poetryOL2026.poems,
    },
  },
  2027: {
    year: 2027,
    circular: "0021/2025",
    singleTexts: singleTexts2027.single_texts,
    comparative: {
      modesHL: comparative2027.comparative_modes_HL,
      modesOL: comparative2027.comparative_modes_OL,
      novelsMemoris: comparative2027.novels_memoirs,
      drama: comparative2027.drama,
      film: comparative2027.film,
    },
    poetryHL: {
      note: poetryHL2027.note,
      poets: poetryHL2027.poets,
    },
    poetryOL: {
      note: poetryOL2027.note,
      poems: poetryOL2027.poems,
    },
  },
};

export function getCircularYears(): number[] {
  return Object.keys(circulars).map(Number).sort();
}

export function getCircular(year: number): CircularData | undefined {
  return circulars[year];
}

export function getCircularNumber(year: number): string {
  return circulars[year]?.circular || "";
}

export function getPoetsHL(year: number): string[] {
  const circular = circulars[year];
  if (!circular) return [];
  return Object.keys(circular.poetryHL.poets).sort();
}

export function getPoemsForPoet(year: number, poet: string): string[] {
  const circular = circulars[year];
  if (!circular) return [];
  return circular.poetryHL.poets[poet] || [];
}

export function getOLPoems(year: number): OLPoem[] {
  const circular = circulars[year];
  if (!circular) return [];
  return circular.poetryOL.poems;
}

export function getOLPoets(year: number): string[] {
  const poems = getOLPoems(year);
  return [...new Set(poems.map((p) => p.poet))].sort();
}

export function getOLPoemsForPoet(year: number, poet: string): string[] {
  const poems = getOLPoems(year);
  return poems.filter((p) => p.poet === poet).map((p) => p.title);
}

export function getSingleTexts(year: number, level?: Level): SingleText[] {
  const circular = circulars[year];
  if (!circular) return [];
  if (!level) return circular.singleTexts;
  return circular.singleTexts.filter(
    (t) => t.level === level || t.level === "H/O"
  );
}

export function getComparativeTexts(year: number) {
  const circular = circulars[year];
  if (!circular) return null;
  return circular.comparative;
}

export function getComparativeModes(year: number, level: "HL" | "OL"): string[] {
  const circular = circulars[year];
  if (!circular) return [];
  return level === "HL"
    ? circular.comparative.modesHL
    : circular.comparative.modesOL;
}
