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

/**
 * True if the candidate string is best interpreted as a poem title reference
 * rather than a quotation. Used to skip double-quoted title names (e.g.
 * writing `in "The Forge"`) from quote validation.
 */
function looksLikeTitle(candidate: string, titles: string[]): boolean {
  if (titles.length === 0) return false;
  const n = normalise(candidate);
  return titles.some((t) => {
    const nt = normalise(t);
    if (!nt) return false;
    if (nt === n) return true;
    // Handle short forms: user writes "Mossbawn: Sunlight" for the full title.
    // If the short form's words all appear (in order) in the full title,
    // treat as a title reference.
    if (n.length >= 3 && nt.includes(n)) return true;
    return false;
  });
}

/**
 * Try to match a compound quotation (e.g. "line one / line two") where the
 * model has joined two adjacent bank entries with a slash. Returns true if
 * every non-trivial fragment hits the bank via substring or fuzzy match.
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

  // A candidate is an echo of the exam question prompt (standard H1 move:
  // "Heaney's poems, 'deceptively simple', do X") and should not be validated
  // as a quotation from the poet's work.
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
    // Drop bare poem-title references. Writing `in "The Forge"` is a title
    // mention, not a quotation, and must not be validated as a quote.
    .filter((s) => !looksLikeTitle(s, knownPoemTitles))
    // Drop echoes of the exam question prompt.
    .filter((s) => !echoesQuestion(s));

  const flagged: string[] = [];
  const matched: string[] = [];

  for (const raw of extracted) {
    const n = normalise(raw);

    const substringHit = normalisedBank.some(
      (b) => b.includes(n) || n.includes(b),
    );
    if (substringHit) {
      matched.push(raw);
      continue;
    }

    const fuzzyHit = normalisedBank.some((b) => {
      if (Math.abs(b.length - n.length) > 4) return false;
      return levenshtein(b, n) <= 2;
    });
    if (fuzzyHit) {
      matched.push(raw);
      continue;
    }

    // Handle compound quotations joined with " / " that map to two or more
    // adjacent bank entries (common when model quotes consecutive lines).
    if (matchesBySplit(raw, normalisedBank)) {
      matched.push(raw);
      continue;
    }

    flagged.push(raw);
  }

  // Detect attributed quote-like patterns not in quote marks
  const attributionRegex =
    /(?:as\s+\w+\s+(?:writes|says|states|observes|puts it|notes)[,:]?\s+)([^\.\n]{8,})/gi;
  const attributed = [...answerText.matchAll(attributionRegex)]
    .map((m) => m[1].trim())
    .filter((s) => s.length >= 8);

  for (const raw of attributed) {
    const n = normalise(raw);
    if (looksLikeTitle(raw, knownPoemTitles)) continue;
    if (echoesQuestion(raw)) continue;
    if (!normalisedBank.some((b) => b.includes(n) || n.includes(b))) {
      flagged.push(raw);
    }
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
