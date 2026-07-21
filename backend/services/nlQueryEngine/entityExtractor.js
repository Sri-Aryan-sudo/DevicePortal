const { DEVICE_TYPE_SYNONYMS, NULL_CONDITIONS } = require('./synonyms');
const { bestMatch } = require('./fuzzyMatcher');
const dictionaryCache = require('./dictionaryCache');

// ============================================================
// NUMERIC COMPARISON EXTRACTION
// ============================================================

const NUMERIC_PATTERNS = [
  { regex: /utilisa?tion\s*(?:greater\s+than|above|over|more\s+than|>)\s*(\d+(?:\.\d+)?)/i, field: 'utilization_week_8', operator: '>' },
  { regex: /utilisa?tion\s*(?:less\s+than|below|under|<)\s*(\d+(?:\.\d+)?)/i,                field: 'utilization_week_8', operator: '<' },
  { regex: /utilisa?tion\s*(?:equal\s+to|equals?|=)\s*(\d+(?:\.\d+)?)/i,                    field: 'utilization_week_8', operator: '=' },
  { regex: /infra\s*tickets?\s*(?:greater\s+than|above|>)\s*(\d+)/i,                         field: 'infra_tickets',      operator: '>' },
  { regex: /infra\s*tickets?\s*(?:less\s+than|below|<)\s*(\d+)/i,                            field: 'infra_tickets',      operator: '<' },
  { regex: /infra\s*tickets?\s*(?:equal\s+to|=)\s*(\d+)/i,                                   field: 'infra_tickets',      operator: '=' },
];

function extractNumericConditions(normalizedText) {
  const conditions = [];
  for (const p of NUMERIC_PATTERNS) {
    const m = normalizedText.match(p.regex);
    if (m) {
      conditions.push({ field: p.field, operator: p.operator, value: parseFloat(m[1]) });
    }
  }
  return conditions;
}

// ============================================================
// DICTIONARY MAP
// Priority order determines which field wins when the same
// phrase could match multiple dictionaries.
// ============================================================

const DICTIONARY_MAP = [
  // Exact-value fields (stored UPPERCASE in DB — use '=' not ILIKE)
  { key: 'vendors',          field: 'vendor',          operator: '=',     uppercase: true  },
  // Free-text fields (use ILIKE for partial matching)
  { key: 'teamNames',        field: 'team_name',       operator: 'ILIKE', uppercase: false },
  { key: 'currentTeams',     field: 'current_team',    operator: 'ILIKE', uppercase: false },
  { key: 'locationSites',    field: 'location_site',   operator: 'ILIKE', uppercase: false },
  { key: 'locationScopes',   field: 'location_scope',  operator: 'ILIKE', uppercase: false },
  { key: 'racks',            field: 'rack',            operator: 'ILIKE', uppercase: false },
  { key: 'placementTypes',   field: 'placement_type',  operator: 'ILIKE', uppercase: false },
  { key: 'currentUsers',     field: 'current_user',    operator: 'ILIKE', uppercase: false },
  { key: 'primaryOwners',    field: 'primary_owner',   operator: 'ILIKE', uppercase: false },
  { key: 'modelAliases',     field: 'model_alias',     operator: 'ILIKE', uppercase: false },
  { key: 'modelTypes',       field: 'model_type',      operator: 'ILIKE', uppercase: false },
  { key: 'modelNames',       field: 'model_name',      operator: 'ILIKE', uppercase: false },
  { key: 'catsTypes',        field: 'cats_type',       operator: 'ILIKE', uppercase: false },
  { key: 'usagePurposes',    field: 'usage_purpose',   operator: 'ILIKE', uppercase: false },
  { key: 'automationFilters',field: 'automation_filter',operator: 'ILIKE',uppercase: false },
];

// ============================================================
// MAIN ENTITY EXTRACTOR
// ============================================================

/**
 * Extract all recognizable entities from normalized text + tokens.
 *
 * @param {string} normalizedText - Lowercased, punctuation-cleaned text
 * @param {string[]} tokens - Stop-word-filtered token list
 * @returns {{ conditions: object[], matchInfo: object[] }}
 */
function extractEntities(normalizedText, tokens) {
  const dict = dictionaryCache.get();
  const conditions = [];
  const matchInfo = [];
  const usedTokenIndices = new Set();

  // --- 1. NULL / availability conditions (highest priority, checked on full text) ---
  for (const [phrase, cond] of Object.entries(NULL_CONDITIONS)) {
    if (normalizedText.includes(phrase)) {
      conditions.push({ field: cond.field, operator: cond.operator, value: null });
    }
  }

  // --- 2. Numeric comparisons (run on full normalized text) ---
  const numericConditions = extractNumericConditions(normalizedText);
  conditions.push(...numericConditions);

  // --- 3. Device type synonyms (single token) ---
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (DEVICE_TYPE_SYNONYMS[token] && !conditions.find(c => c.field === 'device_type')) {
      conditions.push({ field: 'device_type', operator: '=', value: DEVICE_TYPE_SYNONYMS[token] });
      matchInfo.push({ input: token, matched: DEVICE_TYPE_SYNONYMS[token], field: 'device_type', exact: true, similarity: 1.0 });
      usedTokenIndices.add(i);
    }
  }

  // --- 4. N-gram dictionary matching (longest match wins) ---
  // Try 4-gram down to 1-gram; skip if all tokens in window are already used
  const MAX_NGRAM = 4;
  for (let n = MAX_NGRAM; n >= 1; n--) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const windowIndices = Array.from({ length: n }, (_, k) => i + k);
      if (windowIndices.every(idx => usedTokenIndices.has(idx))) continue;

      const phrase = tokens.slice(i, i + n).join(' ');

      for (const { key, field, operator, uppercase } of DICTIONARY_MAP) {
        // Skip if a condition for this field is already set
        if (conditions.find(c => c.field === field)) continue;

        const candidates = dict[key];
        if (!candidates || candidates.length === 0) continue;

        // Exact match (case-insensitive)
        const exactMatch = candidates.find(c => c.toLowerCase() === phrase.toLowerCase());
        if (exactMatch) {
          const storedValue = uppercase ? exactMatch.toUpperCase() : exactMatch;
          conditions.push({ field, operator, value: storedValue });
          matchInfo.push({ input: phrase, matched: exactMatch, field, exact: true, similarity: 1.0 });
          windowIndices.forEach(idx => usedTokenIndices.add(idx));
          break;
        }

        // Fuzzy match
        const fuzzy = bestMatch(phrase, candidates);
        if (fuzzy) {
          const storedValue = uppercase ? fuzzy.matched.toUpperCase() : fuzzy.matched;
          conditions.push({ field, operator, value: storedValue });
          matchInfo.push({ input: phrase, matched: fuzzy.matched, field, exact: false, similarity: fuzzy.similarity });
          windowIndices.forEach(idx => usedTokenIndices.add(idx));
          break;
        }
      }
    }
  }

  return { conditions, matchInfo };
}

module.exports = { extractEntities };
