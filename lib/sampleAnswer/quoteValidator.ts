export type QuoteValidationResult = {
  passed: boolean;
  flagged_strings: string[];
  matched_quotes: string[];
  coverage_pct: number;
};

function normalise(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ")
    // Strip punctuation that students routinely drop or add when quoting.
    // Apostrophes and slashes preserved (meaningful).
    .replace(/[,;:!?.\u2013\u2014\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Stopwords that don't carry meaning for quote-matching purposes.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "by",
  "for", "with", "as", "is", "it", "this", "that", "these", "those",
  "be", "am", "are", "was", "were", "been", "being",
  "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "our", "their", "not", "no", "do", "does", "did",
  "have", "has", "had", "will", "would", "could", "should", "may", "might",
  "but", "so", "if", "then", "than", "too", "very", "can", "just",
  "from", "up", "out", "into", "over", "through", "about",
]);

/**
 * Aggressive stemming that handles morphological variation the model commonly
 * introduces: plurals, tenses, gerunds, possessives, comparative/superlative.
 * Not Porter-level sophisticated — just the patterns we've seen miss.
 */
function stem(word: string): string {
  let w = word.toLowerCase();
  // y->ie transformations (signifies/signified -> signify)
  if (w.length >= 5 && (w.endsWith("ies") || w.endsWith("ied"))) {
    return w.slice(0, -3) + "y";
  }
  // Strip common suffixes, shortest first so we don't over-strip
  w = w.replace(/('s|s|ed|ing|ly|er|est)$/i, "");
  return w;
}

/**
 * Check whether every meaningful (non-stopword, length >= 3) word in the
 * candidate, after aggressive stemming, appears somewhere in the bank. This
 * catches morphological variation ("signifies" / "signifying"), punctuation
 * variation, and short critical-discourse citations in one rule.
 */
function matchesBankByWordSet(candidate: string, concatBank: string): boolean {
  const words = candidate
    .toLowerCase()
    .split(/[^a-z']+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map(stem);

  if (words.length === 0) return false;

  return words.every((w) => {
    if (w.length < 3) return true;
    return concatBank.includes(w);
  });
}

/**
 * True if the candidate is a reference to a known poem/text title rather
 * than a quote. Writing `in "The Forge"` is a title mention; exclude from
 * validation entirely (we don't want to count it as a matched quote either).
 */
function looksLikeTitle(candidate: string, titles: string[]): boolean {
  if (titles.length === 0) return false;
  const n = normalise(candidate);
  return titles.some((t) => {
    const nt = normalise(t);
    if (!nt) return false;
    if (nt === n) return true;
    if (n.length >= 3 && nt.includes(n)) return true;
    return false;
  });
}

/**
 * Try to match a compound quotation (e.g. "line one / line two") where the
 * model has joined two adjacent bank entries with a slash.
 */
function matchesBySplit(candidate: string, normalisedBank: string[]): boolean {
  const fragments = candidate
    .split(/\s*\/\s*/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 3);
  if (fragments.length < 2) return false;
  return fragments.every((f) => {
    const n = normalise(f);
    if (n.length < 3) return true;
    const substr = normalisedBank.some((b) => b.includes(n) || n.includes(b));
    if (substr) return true;
    return normalisedBank.some((b) => {
      if (Math.abs(b.length - n.length) > 4) return false;
      return levenshtein(b, n) <= 2;
    });
  });
}

export function validateQuotes(
  answerText: string,
  quoteBank: string[],
  knownPoemTitles: string[] = [],
  questionText: string = "",
): QuoteValidationResult {
  const normalisedBank = quoteBank.map(normalise);
  const normalisedQuestion = normalise(questionText);
  const concatBank = normalisedBank.join(" ");

  function echoesQuestion(candidate: string): boolean {
    if (!normalisedQuestion) return false;
    const n = normalise(candidate);
    if (n.length < 3) return false;
    return normalisedQuestion.includes(n);
  }

  // Extract substrings inside double (incl. curly) or single quotes
  const quoteRegex =
    /["\u201C]([^"\u201D\u201C]+?)["\u201D]|(?<!\w)'([^']+?)'/g;
  const extracted = [...answerText.matchAll(quoteRegex)]
    .map((m) => (m[1] ?? m[2] ?? "").trim().replace(/[,\.;:!?]+$/, ""))
    .filter((s) => s.length >= 3)
    // Title mentions and question echoes are not quotations.
    .filter((s) => !looksLikeTitle(s, knownPoemTitles))
    .filter((s) => !echoesQuestion(s));

  const flagged: string[] = [];
  const matched: string[] = [];

  for (const raw of extracted) {
    const n = normalise(raw);

    // Strategy 1: substring match (fastest, catches verbatim quotes).
    const substringHit = normalisedBank.some(
      (b) => b.includes(n) || n.includes(b),
    );
    if (substringHit) {
      matched.push(raw);
      continue;
    }

    // Strategy 2: fuzzy match (catches ~1-2 char differences like single
    // letter substitutions).
    const fuzzyHit = normalisedBank.some((b) => {
      if (Math.abs(b.length - n.length) > 4) return false;
      return levenshtein(b, n) <= 2;
    });
    if (fuzzyHit) {
      matched.push(raw);
      continue;
    }

    // Strategy 3: slash-joined adjacent bank entries.
    if (matchesBySplit(raw, normalisedBank)) {
      matched.push(raw);
      continue;
    }

    // Strategy 4 (FALLBACK): all meaningful words appear in the bank after
    // aggressive stemming. This catches morphological variation, word-order
    // shuffling, and short critical-discourse citations. Most of the
    // false-positive patterns we've hit are handled here.
    if (matchesBankByWordSet(raw, concatBank)) {
      matched.push(raw);
      continue;
    }

    flagged.push(raw);
  }

  // Detect attributed quote-like patterns not in quote marks.
  const attributionRegex =
    /(?:as\s+\w+\s+(?:writes|says|states|observes|puts it|notes)[,:]?\s+)([^\.\n]{8,})/gi;
  const attributed = [...answerText.matchAll(attributionRegex)]
    .map((m) => m[1].trim())
    .filter((s) => s.length >= 8);

  for (const raw of attributed) {
    const n = normalise(raw);
    if (looksLikeTitle(raw, knownPoemTitles)) continue;
    if (echoesQuestion(raw)) continue;
    if (normalisedBank.some((b) => b.includes(n) || n.includes(b))) continue;
    if (matchesBankByWordSet(raw, concatBank)) continue;
    flagged.push(raw);
  }

  const uniqueMatched = new Set(matched.map(normalise)).size;
  const coverage_pct =
    quoteBank.length === 0
      ? 0
      : Math.round((uniqueMatched / quoteBank.length) * 100);

  return {
    passed: flagged.length === 0,
    flagged_strings: flagged,
    matched_quotes: matched,
    coverage_pct,
  };
}
