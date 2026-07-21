// Words that carry no filtering meaning and should be removed before entity extraction.
const STOP_WORDS = new Set([
  'show', 'list', 'give', 'display', 'get', 'find', 'all', 'me', 'please',
  'could', 'you', 'i', 'want', 'see', 'the', 'a', 'an', 'of', 'on', 'at',
  'to', 'for', 'from', 'are', 'is', 'was', 'were', 'has', 'have',
  'that', 'those', 'these', 'which', 'what', 'where',
  'device', 'devices', 'whose', 'having',
  'currently', 'current', 'primary',
]);

/**
 * Preprocess a natural-language query into normalized text and tokens.
 *
 * @param {string} input - Raw user input
 * @returns {{ raw: string, normalized: string, tokens: string[], allTokens: string[] }}
 */
function preprocess(input) {
  // 1. Lowercase
  let text = input.toLowerCase();

  // 2. Remove apostrophes / possessives  ("rahul's" → "rahuls")
  text = text.replace(/['''`]/g, '');

  // 3. Replace hyphens between words with space
  text = text.replace(/-/g, ' ');

  // 4. Keep alphanumeric, spaces, %, and . (for decimals)
  text = text.replace(/[^a-z0-9 %.]/g, ' ');

  // 5. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  const normalized = text;

  // 6. Tokenize
  const allTokens = text.split(' ').filter(Boolean);

  // 7. Remove stop words, but always keep numbers and % tokens
  const tokens = allTokens.filter(t => {
    if (/^\d/.test(t)) return true;   // keep numbers
    if (t.includes('%'))  return true;  // keep percentages
    return !STOP_WORDS.has(t);
  });

  return { raw: input, normalized, tokens, allTokens };
}

module.exports = { preprocess, STOP_WORDS };
