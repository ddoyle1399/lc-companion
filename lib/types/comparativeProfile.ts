/**
 * lib/types/comparativeProfile.ts
 *
 * Schema for Comparative Text Profiles and Quote Banks.
 *
 * A Profile is the canonical, reviewed reference for one prescribed comparative
 * text. The 12 comparative generators (lib/claude/prompts.ts) read from these
 * profiles instead of relying on web search at runtime. Build once, review,
 * approve, then reuse forever.
 *
 * A QuoteBank is the verified quote layer for one text, separated from the
 * main Profile so quotes can be audited and amended independently.
 *
 * Storage:
 *   data/profiles/comparative/<year>/<textId>/profile.json
 *   data/profiles/comparative/<year>/<textId>/quotes.json
 *
 * Schema version is incremented when the shape changes in a non-additive way.
 */

export type CopyrightStatus = "public_domain" | "rights_managed";
export type TextType = "novel" | "drama" | "film" | "memoir";

export type ComparativeMode =
  | "Cultural Context"
  | "General Vision and Viewpoint"
  | "Literary Genre"
  | "Theme or Issue";

export type ModeTag = "CC" | "GVV" | "LG" | "TI";

export type ProfileStatus = "draft" | "reviewed" | "approved";

// ---------------------------------------------------------------------------
// Quote bank
// ---------------------------------------------------------------------------

export interface QuoteRef {
  /** Stable ID, e.g. "proctor-name-001". Referenced from KeyMoment, Character, AxisNote. */
  id: string;
  /** Verbatim from source. For rights-managed texts, prefer short, defensible excerpts. */
  text: string;
  /** Speaker, for drama and film. Omit for novel narration; use "narrator" if needed. */
  speaker?: string;
  /** Where in the text. Drama: "Act 2"; novel: "Chapter 7"; film: timestamp. */
  location: string;
  /** Page or scene reference inside location, optional. */
  pageOrScene?: string;
  /** One-line situational note: who is being addressed, what is happening. */
  context: string;
  /** Free-form themes, e.g. "integrity", "vengeance", "hysteria", "name". */
  themeTags: string[];
  /** Modes this quote can serve in an exam answer. */
  modeTags: ModeTag[];
  /** Characters this quote is associated with (speaker plus subjects). */
  characterTags: string[];
}

export interface QuoteBank {
  textId: string;
  schemaVersion: 1;
  quotes: QuoteRef[];
}

// ---------------------------------------------------------------------------
// Profile components
// ---------------------------------------------------------------------------

export interface PlotBeat {
  index: number;
  title: string;
  location: string;
  /** 1-2 sentences describing what happens. */
  summary: string;
  /** 1 sentence on why this beat matters to the whole. */
  significance: string;
}

export interface KeyMoment {
  /** Stable ID, e.g. "km-proctor-confesses-adultery". */
  id: string;
  title: string;
  /** Drama: act and scene; novel: chapter; film: timestamp. */
  location: string;
  /** 2-3 sentences. Plain. */
  whatHappens: string;
  /** 2-3 sentences explaining what the moment shows about character, theme, or vision. */
  whyItMatters: string;
  /** Mode-specific deployment notes. Each is one sentence on the angle this moment serves. */
  modeDeployment: Partial<Record<ModeTag, string>>;
  /** Quote IDs from the QuoteBank that anchor this moment. */
  anchorQuoteIds: string[];
  /** Ready-to-use comparative link sentence template the student can adapt. */
  linkSentenceTemplate: string;
}

export interface Character {
  id: string;
  name: string;
  /** Protagonist, antagonist, foil, witness, victim, agent of change, etc. */
  role: string;
  socialPosition: string;
  mindset: string;
  contradictions: string;
  arc: string;
  keyRelationshipIds: string[];
  keyQuoteIds: string[];
}

export interface Relationship {
  id: string;
  characterAId: string;
  characterBId: string;
  type:
    | "family"
    | "romantic"
    | "friendship"
    | "antagonistic"
    | "professional"
    | "mentor_mentee";
  startStatus: string;
  endStatus: string;
  /** 80-120 words on how the relationship changes. */
  trajectory: string;
  keyMomentIds: string[];
  /** Modes this relationship can serve. */
  modeRelevance: ModeTag[];
}

// Mode profiles ------------------------------------------------------------

export interface AxisNote {
  applies: "yes" | "partially" | "no";
  /** 60-100 words on how this axis shows up in the text. */
  summary: string;
  anchorMomentIds: string[];
  anchorQuoteIds: string[];
  /** One sentence the student could lift directly into an essay. */
  argumentHook: string;
}

export interface CulturalContextProfile {
  socialClass: AxisNote;
  gender: AxisNote;
  religion: AxisNote;
  familyAndMarriage: AxisNote;
  authorityAndPower: AxisNote;
}

export interface GVVProfile {
  /** One-sentence vision statement for the whole text. */
  oneLineVision: string;
  openingShapesVision: string;
  climaxShapesVision: string;
  closingShapesVision: string;
  /** Where the vision is qualified, paradoxical, or ambiguous. */
  ambiguity: string;
  anchorMomentIds: string[];
}

export interface LGElement {
  name: string;
  /** 2-3 sentences on what the technique does in this text. */
  description: string;
  anchorMomentIds: string[];
  /** A specific scene or example. */
  keyExample: string;
}

export interface LGProfile {
  /** Determines which toolkit a student should reach for. */
  toolkit: TextType;
  elements: LGElement[];
}

export interface ThemeNote {
  name: string;
  /** 2-3 sentences on what the theme is and how the text approaches it. */
  summary: string;
  pivotalMomentIds: string[];
  /** Where the theme reveals contradictory or paradoxical aspects of human nature. */
  contradictoryAspect?: string;
}

export interface TIProfile {
  primaryThemes: ThemeNote[];
}

// ---------------------------------------------------------------------------
// The Profile itself
// ---------------------------------------------------------------------------

export interface ComparativeTextProfile {
  /** Stable ID, e.g. "the-crucible". */
  textId: string;
  title: string;
  author: string;
  type: TextType;
  /** Which prescribed years this text appears in. */
  yearsPrescribed: Array<2026 | 2027 | 2028>;
  copyrightStatus: CopyrightStatus;
  /** Attribution line shown in any video output that displays excerpts. */
  attributionLine: string;

  plotBeats: PlotBeat[];
  keyMoments: KeyMoment[];
  characters: Character[];
  relationships: Relationship[];

  culturalContext: CulturalContextProfile;
  generalVisionAndViewpoint: GVVProfile;
  literaryGenre: LGProfile;
  themeOrIssue: TIProfile;

  /** Specific examiner pitfalls for this text. */
  examinerPitfalls: string[];

  status: ProfileStatus;
  schemaVersion: 1;
  /** ISO date string of last review. null when never reviewed. */
  lastReviewedAt?: string | null;
}
