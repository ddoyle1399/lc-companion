/**
 * data/profiles/comparative/index.ts
 *
 * Static manifest of every Comparative Text Profile. Profiles are imported as
 * JSON at build time so they ship with the Vercel bundle (no runtime file IO).
 *
 * To register a new profile:
 *  1. Put profile.json and quotes.json under
 *     /data/profiles/comparative/<year>/<textId>/
 *  2. Add the import + manifest entry below.
 *  3. Make sure title spelling in the relevant circular .json matches what
 *     slugifyTitle() produces, OR add an explicit alias in TITLE_ALIASES.
 */

import type {
  ComparativeTextProfile,
  QuoteBank,
} from "@/lib/types/comparativeProfile";

// ---- Profile imports -------------------------------------------------------

import theCrucibleProfile from "./2026/the-crucible/profile.json";
import theCrucibleQuotes from "./2026/the-crucible/quotes.json";
import siveProfile from "./2026/sive/profile.json";
import siveQuotes from "./2026/sive/quotes.json";
import smallThingsProfile from "./2026/small-things-like-these/profile.json";
import smallThingsQuotes from "./2026/small-things-like-these/quotes.json";
import purpleHibiscusProfile from "./2026/purple-hibiscus/profile.json";
import purpleHibiscusQuotes from "./2026/purple-hibiscus/quotes.json";
import hamnetProfile from "./2026/hamnet/profile.json";
import hamnetQuotes from "./2026/hamnet/quotes.json";
import lessonsInChemistryProfile from "./2026/lessons-in-chemistry/profile.json";
import lessonsInChemistryQuotes from "./2026/lessons-in-chemistry/quotes.json";
import gatsbyProfile from "./2027/the-great-gatsby/profile.json";
import gatsbyQuotes from "./2027/the-great-gatsby/quotes.json";

// ---- Manifest --------------------------------------------------------------

export interface ProfileEntry {
  profile: ComparativeTextProfile;
  quotes: QuoteBank;
}

export const PROFILES: Record<number, Record<string, ProfileEntry>> = {
  2026: {
    "the-crucible": {
      profile: theCrucibleProfile as ComparativeTextProfile,
      quotes: theCrucibleQuotes as QuoteBank,
    },
    "sive": {
      profile: siveProfile as ComparativeTextProfile,
      quotes: siveQuotes as QuoteBank,
    },
    "small-things-like-these": {
      profile: smallThingsProfile as ComparativeTextProfile,
      quotes: smallThingsQuotes as QuoteBank,
    },
    "purple-hibiscus": {
      profile: purpleHibiscusProfile as ComparativeTextProfile,
      quotes: purpleHibiscusQuotes as QuoteBank,
    },
    "hamnet": {
      profile: hamnetProfile as ComparativeTextProfile,
      quotes: hamnetQuotes as QuoteBank,
    },
    "lessons-in-chemistry": {
      profile: lessonsInChemistryProfile as ComparativeTextProfile,
      quotes: lessonsInChemistryQuotes as QuoteBank,
    },
  },
  2027: {
    "the-great-gatsby": {
      profile: gatsbyProfile as ComparativeTextProfile,
      quotes: gatsbyQuotes as QuoteBank,
    },
  },
  2028: {},
};

/**
 * Manual title aliases for cases where slugifyTitle() does not match the
 * filesystem id (e.g. titles with apostrophes, accents, or stylised
 * punctuation). Add entries here as new profiles are registered.
 */
const TITLE_ALIASES: Record<string, string> = {
  // examples for future profiles:
  // "small things like these": "small-things-like-these",
};

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/['`’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProfile(year: number, textId: string): ProfileEntry | null {
  return PROFILES[year]?.[textId] ?? null;
}

export function findProfileByTitle(
  year: number,
  title: string
): ProfileEntry | null {
  const slug = slugifyTitle(title);
  const aliased = TITLE_ALIASES[slug] ?? slug;
  return getProfile(year, aliased);
}

/**
 * Returns true if at least one profile exists for the given year. Useful for
 * disabling web search calls when a full set of profiles is available.
 */
export function hasAnyProfileForYear(year: number): boolean {
  const yearMap = PROFILES[year];
  return !!yearMap && Object.keys(yearMap).length > 0;
}
