/**
 * Levenshtein edit distance (case-insensitive).
 */
function levenshtein(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 0;
  if (al.length === 0) return bl.length;
  if (bl.length === 0) return al.length;

  const matrix = [];
  for (let i = 0; i <= bl.length; i++) matrix[i] = [i];
  for (let j = 0; j <= al.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= bl.length; i++) {
    for (let j = 1; j <= al.length; j++) {
      if (bl[i - 1] === al[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j],
          matrix[i][j - 1],
          matrix[i - 1][j - 1]
        );
      }
    }
  }
  return matrix[bl.length][al.length];
}

/**
 * Similarity score 0.0–1.0 (1.0 = identical).
 */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Minimum similarity threshold based on string length.
 * Short strings (≤4 chars) require exact match to avoid false positives.
 */
function threshold(str) {
  const len = str.length;
  if (len <= 4)  return 1.0;
  if (len <= 7)  return 0.80;
  if (len <= 12) return 0.75;
  return 0.70;
}

/**
 * Find the best matching candidate from an array.
 * @returns {{ matched: string, similarity: number } | null}
 */
function bestMatch(input, candidates) {
  if (!candidates || candidates.length === 0) return null;
  let best = null;
  let bestScore = 0;
  const inputLower = input.toLowerCase();

  for (const candidate of candidates) {
    const score = similarity(inputLower, candidate.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best && bestScore >= threshold(input)) {
    return { matched: best, similarity: bestScore };
  }
  return null;
}

module.exports = { levenshtein, similarity, threshold, bestMatch };
