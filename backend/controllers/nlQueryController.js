const pool = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================================
// AI MODEL — lazy init so missing key doesn't crash the server
// ============================================================

let _aiModel = null;

function getAIModel() {
  if (_aiModel) return _aiModel;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  _aiModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 400, temperature: 0.1 }
  });
  return _aiModel;
}

// ============================================================
// SCHEMA CONTEXT
// ============================================================

const SCHEMA_CONTEXT = `
Table: devices  (the ONLY table you may query)
Primary key: mac_address

Columns:
- mac_address VARCHAR(17)  — Device MAC address. Format AA:BB:CC:DD:EE:FF
- model_name VARCHAR(255)  — Full model name e.g. "Sharp 55 inch 4K"
- model_alias VARCHAR(255) — Short alias or alternate name
- model_type VARCHAR(255)  — Internal code e.g. "SHARP_4K55" (vendor is prefix before _ or -)
- device_type VARCHAR(50)  — Exactly one of: 'PANEL', 'BOARD', 'STB'
- cats_type VARCHAR(255)   — MCATS/CATS classification
- vendor VARCHAR(255)      — Vendor name stored in UPPERCASE e.g. 'SHARP', 'PIONEER', 'LG', 'XIAOMI', 'TCL'
- rack VARCHAR(255)        — Physical rack identifier
- location_scope VARCHAR(255) — Broad scope e.g. 'India', 'UK'
- location_site VARCHAR(255)  — Specific city/site e.g. 'Bangalore', 'London', 'Hyderabad', 'Mumbai'
- placement_type VARCHAR(255) — Deployment type e.g. 'Streaming Devices', 'XUMO Devices', 'Privatepool'
- team_name VARCHAR(255)   — Owning team e.g. 'WebApps', 'OTT', 'Middleware', 'XUMO'
- usage_purpose VARCHAR(255)  — What the device is used for
- primary_owner VARCHAR(255)  — Person responsible for the device
- "current_user" VARCHAR(255) — Person currently using the device. NULL means available/unassigned. ALWAYS quote as "current_user" in SQL (it is a PostgreSQL reserved word).
- utilization_week_7 NUMERIC  — Utilization % week 7 (Feb 9–15)
- utilization_week_8 NUMERIC  — Utilization % week 8 (Feb 16–22)
- automation_filter VARCHAR(255) — Automation filter label
- infra_tickets INTEGER    — Count of INFRA tickets
- device_repurpose VARCHAR(255) — Repurpose status
- created_at TIMESTAMP     — When first added
- updated_at TIMESTAMP     — When last updated
`;

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `You are a PostgreSQL SQL generator for a device inventory system.
Convert the user's question into a single SQL SELECT query.

STRICT RULES:
1. Return ONLY the raw SQL query. No markdown. No code fences. No backticks. No explanation. No semicolons.
2. Query ONLY the "devices" table. NEVER reference "users" or "device_audit_log".
3. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, or COPY.
4. Always add LIMIT 500 unless the entire query uses only COUNT(*) or similar aggregates with no row output.
5. Use ILIKE for case-insensitive string matching on names, teams, and locations.
6. ALWAYS double-quote "current_user" in SQL — it is a PostgreSQL reserved word.
7. Vendor names are stored uppercase (e.g. vendor = 'SHARP', not 'Sharp').

COMMON MAPPINGS:
- "available" / "free" / "unassigned" / "no current user" → "current_user" IS NULL
- "assigned" / "in use" → "current_user" IS NOT NULL
- "panels" → device_type = 'PANEL'
- "boards" → device_type = 'BOARD'
- "STBs" / "set-top boxes" → device_type = 'STB'
- "currently with [name]" / "current user is [name]" → "current_user" ILIKE '%name%'
- "owned by [name]" / "device owner [name]" → primary_owner ILIKE '%name%'
- "belonging to [team]" / "in [team] team" / "[team] team" → team_name ILIKE '%team%'
- "in [city]" / "at [city]" / "located in [city]" → location_site ILIKE '%city%'
- "utilization > X" / "utilization greater than X" → utilization_week_8 > X
- "how many ... in each team" → GROUP BY team_name with COUNT(*)

${SCHEMA_CONTEXT}`;

// ============================================================
// SQL VALIDATOR
// ============================================================

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'PERFORM',
  'PG_READ_FILE', 'PG_SLEEP', 'PG_WRITE_FILE', 'SELECT INTO'
];

const FORBIDDEN_TABLES = ['users', 'device_audit_log'];

function validateSQL(sql) {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (!upper.startsWith('SELECT')) {
    return { valid: false, reason: 'Not a SELECT statement' };
  }

  if (trimmed.includes(';')) {
    return { valid: false, reason: 'Semicolons not allowed' };
  }

  if (trimmed.includes('--') || trimmed.includes('/*')) {
    return { valid: false, reason: 'SQL comments not allowed' };
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(' ', '\\s+')}\\b`);
    if (regex.test(upper)) {
      return { valid: false, reason: `Forbidden keyword: ${kw}` };
    }
  }

  for (const table of FORBIDDEN_TABLES) {
    const regex = new RegExp(`\\b${table}\\b`, 'i');
    if (regex.test(trimmed)) {
      return { valid: false, reason: `Access to table '${table}' is not allowed` };
    }
  }

  return { valid: true };
}

function ensureLimit(sql, maxRows = 500) {
  // Don't add LIMIT to pure aggregate queries (COUNT only, no individual rows)
  if (/^\s*SELECT\s+(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(sql) && !/GROUP\s+BY/i.test(sql)) {
    return sql;
  }
  if (!/\bLIMIT\b/i.test(sql)) {
    return `${sql.trim()} LIMIT ${maxRows}`;
  }
  // Cap any existing LIMIT to maxRows
  return sql.replace(/\bLIMIT\s+(\d+)/i, (_, n) => `LIMIT ${Math.min(parseInt(n, 10), maxRows)}`);
}

// ============================================================
// SUMMARY GENERATOR
// ============================================================

function buildSummary(sql, rows, columns) {
  if (rows.length === 0) return 'No devices matched your query.';
  // Single numeric result from aggregate
  if (rows.length === 1 && columns.length === 1) {
    const val = Object.values(rows[0])[0];
    if (!isNaN(val)) return `Result: ${Number(val).toLocaleString()}`;
  }
  return `Found ${rows.length.toLocaleString()} result${rows.length !== 1 ? 's' : ''}.`;
}

// ============================================================
// CONTROLLER
// ============================================================

const askQuery = async (req, res) => {
  const { question, conversationHistory = [] } = req.body;

  // Input validation
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length === 0 || trimmedQuestion.length > 500) {
    return res.status(400).json({ error: 'Question must be between 1 and 500 characters' });
  }
  if (!Array.isArray(conversationHistory) || conversationHistory.length > 20) {
    return res.status(400).json({ error: 'Invalid conversation history' });
  }

  // Get AI model (may throw if key not configured)
  let model;
  try {
    model = getAIModel();
  } catch (err) {
    return res.status(503).json({
      error: 'AI service is not configured. Please add GEMINI_API_KEY to the server .env file.'
    });
  }

  try {
    // Build Gemini contents array (user/model alternation, last 10 turns = 5 exchanges)
    const contents = [];
    const recentHistory = conversationHistory.slice(-10);
    for (const turn of recentHistory) {
      if (!turn.role || typeof turn.content !== 'string') continue;
      const role = turn.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: turn.content.slice(0, 2000) }] });
    }
    contents.push({ role: 'user', parts: [{ text: trimmedQuestion }] });

    // Call Gemini
    const aiResult = await model.generateContent({ contents });
    let sql = aiResult.response.text().trim();

    // Strip any accidental markdown fences
    sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

    if (!sql) {
      return res.status(422).json({ error: 'The AI did not return a query. Please rephrase your question.' });
    }

    // Validate SQL safety
    const validation = validateSQL(sql);
    if (!validation.valid) {
      console.warn(`[NLQuery] Rejected SQL (${validation.reason}):`, sql);
      return res.status(422).json({
        error: "I couldn't generate a safe query for that question. Please try rephrasing.",
        question: trimmedQuestion
      });
    }

    // Enforce row limit
    sql = ensureLimit(sql);

    // Execute against database
    const dbResult = await pool.query(sql);
    const rows = dbResult.rows;
    const columns = dbResult.fields.map(f => f.name);
    const summary = buildSummary(sql, rows, columns);

    return res.json({
      question: trimmedQuestion,
      sql,
      summary,
      columns,
      rows,
      rowCount: rows.length,
      truncated: rows.length >= 500
    });

  } catch (err) {
    console.error('[NLQuery] Error:', err.message);

    if (err.message?.includes('column') && err.message?.includes('does not exist')) {
      return res.status(422).json({
        error: 'The query referenced an unknown column. Please rephrase your question.',
        question: trimmedQuestion
      });
    }
    if (err.message?.includes('syntax error')) {
      return res.status(422).json({
        error: 'The generated SQL had a syntax error. Please try rephrasing.',
        question: trimmedQuestion
      });
    }
    if (err.message?.includes('API key') || err.message?.includes('GEMINI')) {
      return res.status(503).json({ error: 'AI service configuration error.' });
    }
    return res.status(500).json({ error: 'Failed to process your query. Please try again.' });
  }
};

module.exports = { askQuery };
