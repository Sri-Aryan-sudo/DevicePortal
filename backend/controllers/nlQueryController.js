const pool = require('../config/db');
const nlQueryEngine = require('../services/nlQueryEngine');
const dictionaryCache = require('../services/nlQueryEngine/dictionaryCache');

function buildSummary(intent, rows) {
  if (rows.length === 0) return 'No devices matched your query.';
  if (intent === 'COUNT') {
    const count = rows[0]?.count ?? 0;
    return `Count: ${Number(count).toLocaleString()}`;
  }
  if (intent === 'GROUP_BY') {
    return `${rows.length} group${rows.length !== 1 ? 's' : ''} found.`;
  }
  return `Found ${rows.length.toLocaleString()} device${rows.length !== 1 ? 's' : ''}.`;
}

const askQuery = async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return res.status(400).json({ error: 'Question must be between 1 and 500 characters' });
  }
  const parsed = nlQueryEngine.parse(trimmed);
  if (parsed.error) {
    return res.status(422).json({ error: parsed.error, hint: parsed.hint || null, question: trimmed });
  }
  const { sql, params, explanation, intent, groupByField, matchInfo } = parsed;
  try {
    const dbResult = await pool.query(sql, params);
    const rows    = dbResult.rows;
    const columns = dbResult.fields.map(f => f.name);
    return res.json({
      question, sql, explanation, summary: buildSummary(intent, rows),
      matchInfo, intent, groupByField: groupByField || null,
      columns, rows, rowCount: rows.length, truncated: rows.length >= 500,
    });
  } catch (err) {
    console.error('[NLQuery] DB error:', err.message);
    return res.status(500).json({ error: 'Query execution failed. Please try rephrasing.' });
  }
};

const refreshCache = async (req, res) => {
  try {
    await dictionaryCache.refresh();
    res.json({ success: true, message: 'Dictionary cache refreshed successfully.' });
  } catch (err) {
    console.error('[NLQuery] Cache refresh error:', err.message);
    res.status(500).json({ error: 'Failed to refresh cache.' });
  }
};

module.exports = { askQuery, refreshCache };
