// ============================================================
// SYNONYMS — centralized, easily extensible
// Add new entries here without touching any other file.
// ============================================================

/**
 * Maps a single token → device_type value.
 * These are checked before dictionary lookup.
 */
const DEVICE_TYPE_SYNONYMS = {
  'panel':        'PANEL',
  'panels':       'PANEL',
  'tv':           'PANEL',
  'tvs':          'PANEL',
  'television':   'PANEL',
  'televisions':  'PANEL',
  'screen':       'PANEL',
  'screens':      'PANEL',
  'display':      'PANEL',
  'displays':     'PANEL',
  'monitor':      'PANEL',
  'monitors':     'PANEL',
  'board':        'BOARD',
  'boards':       'BOARD',
  'stb':          'STB',
  'stbs':         'STB',
  'settopbox':    'STB',
  'set top box':  'STB',
  'set-top-box':  'STB',
};

/**
 * Maps a token/phrase → DB column name.
 * Provides field context for an adjacent value.
 * Lower-priority than NULL_CONDITIONS and DEVICE_TYPE_SYNONYMS.
 */
const FIELD_CONTEXT_SYNONYMS = {
  'owner':          'primary_owner',
  'owners':         'primary_owner',
  'owned':          'primary_owner',
  'primary owner':  'primary_owner',
  'device owner':   'primary_owner',
  'user':           'current_user',
  'users':          'current_user',
  'current user':   'current_user',
  'assigned to':    'current_user',
  'currently with': 'current_user',
  'used by':        'current_user',
  'with':           'current_user',
  'team':           'team_name',
  'primary team':   'team_name',
  'current team':   'current_team',
  'working team':   'current_team',
  'location':       'location_site',
  'city':           'location_site',
  'site':           'location_site',
  'rack':           'rack',
  'vendor':         'vendor',
  'brand':          'vendor',
  'manufacturer':   'vendor',
  'model':          'model_name',
  'placement':      'placement_type',
  'utilization':    'utilization_week_8',
  'utilisation':    'utilization_week_8',
  'util':           'utilization_week_8',
};

/**
 * Maps a phrase → { field, operator } for NULL / NOT NULL conditions.
 * These are checked at the start of entity extraction.
 */
const NULL_CONDITIONS = {
  'available':       { field: 'current_user', operator: 'IS NULL' },
  'free':            { field: 'current_user', operator: 'IS NULL' },
  'unassigned':      { field: 'current_user', operator: 'IS NULL' },
  'no user':         { field: 'current_user', operator: 'IS NULL' },
  'no current user': { field: 'current_user', operator: 'IS NULL' },
  'without user':    { field: 'current_user', operator: 'IS NULL' },
  'not assigned':    { field: 'current_user', operator: 'IS NULL' },
  'in use':          { field: 'current_user', operator: 'IS NOT NULL' },
  'occupied':        { field: 'current_user', operator: 'IS NOT NULL' },
};

module.exports = { DEVICE_TYPE_SYNONYMS, FIELD_CONTEXT_SYNONYMS, NULL_CONDITIONS };
