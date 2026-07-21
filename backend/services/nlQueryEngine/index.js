const { preprocess }      = require('./preprocessor');
const { detectIntent }    = require('./intentDetector');
const { extractEntities } = require('./entityExtractor');
const { buildSQL }        = require('./sqlBuilder');
const { validateSQL }     = require('./sqlValidator');

/**
 * Run the full offline NL → SQL pipeline.
 *
 * Pipeline:
 *   Stage 1: Preprocess   (lowercase, strip punctuation, remove stop words)
 *   Stage 2: Intent       (SELECT / COUNT / GROUP_BY)
 *   Stage 3: Entities     (dictionary lookup + fuzzy match + synonyms)
 *   Stage 4: Build SQL    (parameterized, never concatenated)
 *   Stage 5: Validate SQL (safety whitelist check)
 *
 * @param {string} question - Raw user input
 * @returns {{
 *   sql?: string,
 *   params?: any[],
 *   explanation?: string,
 *   intent?: string,
 *   groupByField?: string|null,
 *   matchInfo?: object[],
 *   conditions?: object[],
 *   error?: string,
 *   hint?: string
 * }}
 */
function parse(question) {
  // Stage 1 — Preprocess
  const { normalized, tokens } = preprocess(question);

  if (tokens.length === 0) {
    return {
      error: "I couldn't understand your query.",
      hint: "Try: 'Show all Sharp panels', 'Devices in Bangalore', 'Count STBs by team'",
    };
  }

  // Stage 2 — Intent
  const { intent, groupByField } = detectIntent(normalized);

  // Stage 3 — Entity Extraction (fuzzy + synonyms + dictionary)
  const { conditions, matchInfo } = extractEntities(normalized, tokens);

  // For pure COUNT/GROUP_BY with no other filters, allow proceeding without conditions
  if (conditions.length === 0 && intent === 'SELECT') {
    return {
      error: "I didn't recognise any vendor, team, device type, location, or user in your query.",
      hint: "Try: 'Show all Sharp panels', 'Show devices in Bangalore', 'List all boards', 'Devices with no current user'",
    };
  }

  // Stage 4 — Build SQL
  const { sql, params, explanation } = buildSQL(intent, groupByField, conditions);

  // Stage 5 — Validate SQL
  const validation = validateSQL(sql);
  if (!validation.valid) {
    console.error('[NLQueryEngine] Internal SQL validation failed:', validation.reason, sql);
    return { error: 'Failed to generate a safe query. Please try rephrasing.' };
  }

  return { sql, params, explanation, intent, groupByField, matchInfo, conditions };
}

module.exports = { parse };
