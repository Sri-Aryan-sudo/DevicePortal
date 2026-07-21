// PostgreSQL reserved words that must be double-quoted as column names
const QUOTED_COLUMNS = new Set(['current_user']);

function col(field) {
  return QUOTED_COLUMNS.has(field) ? `"${field}"` : field;
}

const ROW_LIMIT = 500;

// Human-readable field labels for the explanation string
const FIELD_LABELS = {
  vendor:            'Vendor',
  device_type:       'Device Type',
  team_name:         'Primary Team',
  current_team:      'Current Team',
  location_site:     'Location',
  location_scope:    'Region',
  rack:              'Rack',
  primary_owner:     'Primary Owner',
  current_user:      'Current User',
  model_name:        'Model Name',
  model_alias:       'Model Alias',
  model_type:        'Model Type',
  placement_type:    'Placement Type',
  cats_type:         'CATS Type',
  usage_purpose:     'Usage Purpose',
  automation_filter: 'Automation Filter',
  device_repurpose:  'Device Repurpose',
  utilization_week_8:'Utilization (Week 8)',
  utilization_week_7:'Utilization (Week 7)',
  infra_tickets:     'INFRA Tickets',
};

/**
 * Build a fully parameterized SQL query from extracted entities.
 *
 * @param {'SELECT'|'COUNT'|'GROUP_BY'} intent
 * @param {string|null} groupByField
 * @param {Array<{ field, operator, value }>} conditions
 * @returns {{ sql: string, params: any[], explanation: string }}
 */
function buildSQL(intent, groupByField, conditions) {
  const whereClauses = [];
  const params = [];
  let p = 1;
  const explanationParts = [];

  for (const cond of conditions) {
    const c = col(cond.field);
    const label = FIELD_LABELS[cond.field] || cond.field;

    if (cond.operator === 'IS NULL') {
      whereClauses.push(`${c} IS NULL`);
      explanationParts.push(`${label} is not assigned`);
    } else if (cond.operator === 'IS NOT NULL') {
      whereClauses.push(`${c} IS NOT NULL`);
      explanationParts.push(`${label} is assigned`);
    } else if (cond.operator === 'ILIKE') {
      params.push(`%${cond.value}%`);
      whereClauses.push(`${c} ILIKE $${p++}`);
      explanationParts.push(`${label} = "${cond.value}"`);
    } else if (cond.operator === '=') {
      params.push(cond.value);
      whereClauses.push(`${c} = $${p++}`);
      explanationParts.push(`${label} = ${cond.value}`);
    } else if (['>', '<', '>=', '<='].includes(cond.operator)) {
      params.push(cond.value);
      whereClauses.push(`${c} ${cond.operator} $${p++}`);
      explanationParts.push(`${label} ${cond.operator} ${cond.value}`);
    }
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let sql;
  if (intent === 'COUNT' && !groupByField) {
    sql = `SELECT COUNT(*) AS count FROM devices ${whereSQL}`.trim();
  } else if (intent === 'GROUP_BY' && groupByField) {
    const gc = col(groupByField);
    const label = FIELD_LABELS[groupByField] || groupByField;
    sql = `SELECT ${gc} AS "${label}", COUNT(*) AS count FROM devices ${whereSQL} GROUP BY ${gc} ORDER BY count DESC`.trim();
  } else {
    sql = `SELECT * FROM devices ${whereSQL} LIMIT ${ROW_LIMIT}`.trim();
  }

  const explanation = explanationParts.length > 0
    ? explanationParts.join(' · ')
    : 'all devices (no filters)';

  return { sql, params, explanation };
}

module.exports = { buildSQL };
