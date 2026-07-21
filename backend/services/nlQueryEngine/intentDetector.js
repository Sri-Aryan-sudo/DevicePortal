// GROUP BY trigger phrases and their corresponding DB column
const GROUP_BY_TRIGGERS = [
  { phrase: 'by vendor',        field: 'vendor' },
  { phrase: 'per vendor',       field: 'vendor' },
  { phrase: 'each vendor',      field: 'vendor' },
  { phrase: 'by team',          field: 'team_name' },
  { phrase: 'per team',         field: 'team_name' },
  { phrase: 'each team',        field: 'team_name' },
  { phrase: 'by current team',  field: 'current_team' },
  { phrase: 'per current team', field: 'current_team' },
  { phrase: 'by type',          field: 'device_type' },
  { phrase: 'per type',         field: 'device_type' },
  { phrase: 'each type',        field: 'device_type' },
  { phrase: 'by device type',   field: 'device_type' },
  { phrase: 'by location',      field: 'location_site' },
  { phrase: 'per location',     field: 'location_site' },
  { phrase: 'each location',    field: 'location_site' },
  { phrase: 'by city',          field: 'location_site' },
  { phrase: 'by rack',          field: 'rack' },
  { phrase: 'per rack',         field: 'rack' },
  { phrase: 'each rack',        field: 'rack' },
  { phrase: 'by model',         field: 'model_name' },
  { phrase: 'by placement',     field: 'placement_type' },
  { phrase: 'group by',         field: null },
];

/**
 * Detect query intent from normalized (lowercased) text.
 *
 * @param {string} normalizedText
 * @returns {{ intent: 'SELECT'|'COUNT'|'GROUP_BY', groupByField: string|null }}
 */
function detectIntent(normalizedText) {
  const text = normalizedText.toLowerCase();

  // COUNT — may also include a GROUP BY modifier
  const isCount = /\bhow\s+many\b/.test(text) || /\bcount\b/.test(text);

  // GROUP BY check
  for (const trigger of GROUP_BY_TRIGGERS) {
    if (text.includes(trigger.phrase)) {
      return { intent: 'GROUP_BY', groupByField: trigger.field };
    }
  }

  if (isCount) {
    return { intent: 'COUNT', groupByField: null };
  }

  return { intent: 'SELECT', groupByField: null };
}

module.exports = { detectIntent };
