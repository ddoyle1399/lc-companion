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

export function validateQuotes(
  answerText: string,
  quoteBank: string[],
): QuoteValidationResult {
  const normalisedBank = quoteBank.map(normalise);

  // Extract substrings inside double (incl. curly) or single quotes
  const quoteRegex =
    /["\u201C]([^"\u201D\u201C]+?)["\u201D]|(?<!\w)'([^']+?)'/g;
  const extracted = [...answerText.matchAll(quoteRegex)]
    .map((m) => (m[1] ?? m[2] ?? "").trim().replace(/[,\.;:!?]+$/, ""))
    .filter((s) => s.length >= 3);

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
