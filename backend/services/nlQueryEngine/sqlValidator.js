const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'PERFORM',
  'PG_READ_FILE', 'PG_SLEEP', 'PG_WRITE_FILE',
];

const FORBIDDEN_TABLES = ['users', 'device_audit_log'];

/**
 * Safety-validate a generated SQL string before execution.
 * Because SQL is generated internally (not from user input), this is
 * a defence-in-depth check, not the primary security layer.
 *
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateSQL(sql) {
  const trimmed = sql.trim();
  const upper   = trimmed.toUpperCase();

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
    if (new RegExp(`\\b${kw}\\b`).test(upper)) {
      return { valid: false, reason: `Forbidden keyword: ${kw}` };
    }
  }

  for (const table of FORBIDDEN_TABLES) {
    if (new RegExp(`\\b${table}\\b`, 'i').test(trimmed)) {
      return { valid: false, reason: `Access to '${table}' is not allowed` };
    }
  }

  return { valid: true };
}

module.exports = { validateSQL };
